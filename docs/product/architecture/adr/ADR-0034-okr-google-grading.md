# ADR-0034: OKR 구글식 등급 — committed/aspirational + 색상 밴드

- 상태: **채택** (2026-09-14). 백엔드/프런트 계산 로직·API 계약은 planner 가 확정한 계약을 그대로 구현.
- 관련: [ADR-0030](ADR-0030-okr-data-model.md)(OKR 데이터 모델), `requirements/OKR.md` FR-OKR-02·03·07(신규), [ADR-0018](ADR-0018-schema-migration-strategy.md)(마이그레이션 최소안)

## 맥락

ADR-0030 이후(P8 완료) OKR 대시보드는 달성률을 `clamp(current/target, 0, 1)` 선형 비율
하나로만 본다. 구글 OKR 실무 핵심은 두 가지다:

1. **KR 유형 구분** — committed(약속형, 100% 달성이 기대치)와 aspirational(문샷형, 70%
   달성도 성공으로 본다)은 같은 pct 라도 의미가 다르다.
2. **색상 등급 밴드** — 숫자 pct 대신 빨강/노랑/초록 한눈에 보는 신호가 필요하다.

지금 스키마·API 에는 이 구분이 없어 committed KR 90% 와 aspirational KR 90% 를 화면에서
구별할 수 없고, "70% 면 문샷 성공"이라는 신호도 못 준다.

## 결정

### 1) `key_results.kind` 컬럼 추가
```sql
kind TEXT NOT NULL DEFAULT 'committed' CHECK (kind IN ('committed','aspirational'))
```
`SCHEMA_VERSION` 1 → 2 (`backend/db/index.js`), forward-only (ADR-0018). `kind` 는 저장만
하고 `grade` 는 저장하지 않는다 — 조회 시 pct 로부터 계산한다 (kr_snapshots 와 동일하게
"파생값은 저장하지 않는다" 관례를 따른다).

### 2) 등급 밴드 — 순수 함수 `krGrade(pct, kind)`
`round3(pct)` 값 기준, 경계 포함:

| kind | red | yellow | green |
|---|---|---|---|
| `committed` | `pct < 0.4` | `0.4 ≤ pct < 0.9` | `pct ≥ 0.9` |
| `aspirational` | `pct < 0.4` | `0.4 ≤ pct < 0.7` | `pct ≥ 0.7` |

응답 값은 `"red"`\|`"yellow"`\|`"green"` 색 이름만 — 한국어 라벨("미달"·"진행중"·"달성")은
프런트 전용(`store/okrMath.js:gradeLabel`)이다.

Objective 등급은 하위 KR 이 **전부** aspirational 이면 aspirational 밴드, 그 외(혼합·전부
committed·KR 0개)는 committed 밴드로 계산한다(`objectiveGrade`). KR 0개면 `pct=0, grade="red"`.

기존 `summary.bucket`(0.9/0.4 경계, 스탯 타일 "90% 이상·40~89.9%·40% 미만" 카운트용)은
그대로 둔다 — 이 결정 범위 밖. `bucket` 은 kind 무관 단일 경계, `grade` 는 kind 별 밴드로
서로 다른 용도다.

### 3) API 계약 델타
`GET /api/okr` 의 각 objective·key result 에 `grade` 를, key result 에 `kind` 를 추가한다.
```json
{
  "objectives": [{
    "id": 1, "title": "...", "period": "2026-Q3", "status": "active",
    "pct": 0.62, "grade": "yellow",
    "keyResults": [{
      "id": 3, "title": "...", "target": 100, "current": 62, "unit": "건",
      "pct": 0.62, "kind": "committed", "grade": "yellow", "project_id": null
    }]
  }]
}
```
`POST`/`PUT /api/okr/key-results` 입력에 `kind` 선택 필드를 추가한다. 생성 시 미지정 →
`'committed'`. 허용값 밖 → 400 `{"error":"kind 는 committed·aspirational 중 하나여야
합니다."}`. CRUD 응답의 `keyResult` 는 행 그대로 반환(`kind` 자동 포함, `grade` 는 넣지 않는다
— `pct` 도 CRUD 응답엔 없는 기존 관례와 통일). 새 엔드포인트는 만들지 않는다.

## 대안 검토

- **committed 경계를 1.0 로 (완전 달성만 green)** — 기각. 구글 OKR 실무에서 committed KR 도
  90% 이상이면 "성공적 진행"으로 본다(100% 만 요구하면 현실적으로 항상 노랑/빨강만 보여
  경고 신호로서 의미가 없어진다). 참조 화면의 기존 `bucket` 경계(0.9)와도 일관된다.
- **`grade` 를 `kr_snapshots` 처럼 저장** — 기각. `pct` 로부터 결정론적으로 계산 가능한
  파생값이라 저장하면 KR 수정 시 갱신 누락 위험만 생긴다. `pct` 도 저장하지 않는 기존
  관례(ADR-0030)를 그대로 따른다.
- **`kind` 를 objective 에 두고 KR 은 상속** — 기각. 구글 OKR 은 KR 단위로 committed/
  aspirational 을 섞는 것이 일반적이다(한 목표 안에 확실한 KR 과 도전적인 KR 을 함께 둠).
  objective 등급은 "전부 aspirational 일 때만 완화"로 이 혼합을 정직하게 반영한다.
- **색상을 서버가 직접 hex 로 내려줌** — 기각. ADR-0027(하드코딩 hex 금지)과 충돌. 서버는
  색 이름(`red`/`yellow`/`green`)만 내리고 프런트가 `Chip` variant → CSS 변수로 매핑한다.

## 결과 / 트레이드오프

- 마이그레이션 1건 추가(`ALTER TABLE key_results ADD COLUMN kind ...`), 컬럼 존재 가드
  필수(`:memory:`·신규 DB 는 `schema.sql` 이 이미 반영하므로 중복 컬럼 에러 방지).
- 프런트 `okrMath.js`·백엔드 `services/okr.js` 양쪽에 동일한 밴드 상수·함수를 유지해야
  한다(기존 pct 공식과 같은 패턴 — 테스트로 양쪽 경계 일치를 고정한다).
- 위젯 밀도 증가(KR 행에 kind 라벨 + 등급 칩 추가) — `flexWrap` 등으로 좁은 위젯에서도
  안 넘치게 조정.
- `summary.bucket` 과 `grade` 두 가지 등급 체계가 공존한다 — 스탯 타일은 `bucket`(kind
  무관, 전체 조망용), KR/objective 카드는 `grade`(kind 별 밴드, 개별 신호용)로 용도를 분리.

## 채택 시 영향

`backend/db/schema.sql`(`kind` 컬럼), `backend/db/index.js`(`SCHEMA_VERSION` 2, v2
마이그레이션), `backend/src/db.js`(`KR_COLS`·`KR_FIELDS`·`insertKeyResult`·`updateKeyResult`·
`addKeyResult`), `backend/src/services/okr.js`(`krGrade`·`objectiveGrade`·`assertKind`),
`frontend/src/store/okrMath.js`(동일 밴드 미러 + `gradeLabel`·`gradeChipVariant`),
`frontend/src/store/useOkrStore.js`(`recompute` 에 grade 재계산), `frontend/src/widgets/views/OkrWidgetView.jsx`
(kind 선택 폼·등급 칩·KR 개수 권장 안내), `frontend/src/api/demoClient.js`·`demoData.js`(데모 패리티),
`requirements/OKR.md`(FR-OKR-07 신규), `TRACEABILITY.md`, `API_REFERENCE.md`, `DATA_DICTIONARY.md`,
`UI_SPEC.md`, `TEST_PLAN.md`.
