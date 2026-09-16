# FR-CHECKIN — 기대정렬 체크인 상세 명세

> [REQUIREMENTS_FUNCTIONAL.md](REQUIREMENTS_FUNCTIONAL.md) 의 기대정렬 체크인 도메인 상세화.
> 결정 [../architecture/adr/ADR-0035-expectation-checkin.md](../architecture/adr/ADR-0035-expectation-checkin.md) (채택 2026-09-14).
> 데이터 [../reference/DATA_DICTIONARY.md](../reference/DATA_DICTIONARY.md) · API [../reference/API_REFERENCE.md](../reference/API_REFERENCE.md) · 화면 [../reference/UI_SPEC.md](../reference/UI_SPEC.md).

이 문서는 개인 생산성 OS **P10** 의 요구사항이다. 이 기능의 "왜"는 사용자가 직접 진술한 내용
(`my-setup-proj-story` 저장소 `RAW_STORIES.md` #8·#9·#10·#11·#12)에서 나왔다 — 자세한 맥락은
ADR-0035 §맥락 참조.

---

## 공통 규칙 (모든 FR-CHECKIN 적용)

- 저장소: 전용 테이블 `expectation_checkins` 1개 (ADR-0035). 마이그레이션 상향 없음(`schema.sql`
  `CREATE TABLE IF NOT EXISTS` 만).
- 7개 질문 컬럼(`what`/`why`/`until`/`goal`/`strategy`/`action`/`status`)은 전부 자유 서술
  TEXT·nullable. **최소 1개는 채워야 한다** (전부 비면 400).
- `period` 는 자유 라벨(예: "1주차")이며 날짜 형식을 강제하지 않는다.
- 시각: 서버가 `created_at`/`updated_at` 을 ISO8601 로 채운다. 클라이언트가 보내도 무시.
- 검증 실패 → HTTP 400, RFC 9457 봉투 `{ "type": "validation_error", "detail": "<메시지>", ... }` (NFR-SEC-07, [ADR-0017](../architecture/adr/ADR-0017-rest-error-contract.md)). 아래 AC 의 `{error:"..."}` 표기는 이 봉투의 `detail` 값을 가리킨다.
- 존재하지 않는 `id` → HTTP 404 `{ "type": "not_found", "detail": "체크인을 찾을 수 없습니다." }`.
- 이 기능은 채점 도구가 아니다 — 완성도 점수·등급 같은 파생값을 서버가 계산·저장하지 않는다.
- 웹 데모(ADR-0026): 아래 API 는 `frontend/src/api/demoClient.js` / `demoData.js` 인메모리
  목 어댑터에도 추가한다 — 안 하면 데모에서 체크인 위젯이 깨진다.

---

## FR-CHECKIN-01 — 체크인 생성

**사용자 스토리:** 사용자로서 나는 7개 질문(뭘 하고 있지/왜 하지/언제까지/목표/전략/구체적
행동/상태)에 자유롭게 답하고 시점을 남기고 싶다, 전부 답할 필요 없이 지금 답할 수 있는 것만.

**우선순위** P1 · **목표 주차** 개인 OS P10 · **상태** ⏳

### 수용 기준
- **AC-1** Given `{period:"1주차", what:"위젯 셸을 만들었다.", status:"동작은 한다."}`,
  When `POST /api/checkins`, Then 201 과 `{checkin}` 을 반환하고 `id`·`created_at`·`updated_at`
  이 채워지며 미지정 답변은 `null` 이다.
- **AC-2** Given 7개 답변(what~status) 전부 미지정 또는 공백, When 생성, Then 400
  `{error:"최소 한 개 질문에는 답해야 합니다."}` 이고 아무것도 저장되지 않는다.
- **AC-3** Given `period` 미지정 또는 공백, Then `period` 는 `null` 로 저장된다(에러 아님).
- **AC-4** Given `project_id`·`objective_id` 가 존재하지 않는 리소스를 가리킴, When 생성, Then
  각각 400 `{error:"연결할 프로젝트를 찾을 수 없습니다."}` / `{error:"연결할 목표를 찾을 수
  없습니다."}`.
- **AC-5** Given 답변 텍스트가 2000자 초과, When 생성, Then 400.

### 입력·검증 규칙
| 필드 | 필수 | 타입 | 규칙 |
|---|:---:|---|---|
| `period` | — | string\|null | 트림 후 40자 이하, 빈 값은 `null` |
| `what`/`why`/`until`/`goal`/`strategy`/`action`/`status` | 최소 1개 | string\|null | 트림 후 2000자 이하, 빈 값은 `null`. 7개 중 전부 `null` 이면 400 |
| `project_id` | — | int\|null | 존재하는 프로젝트 또는 `null` (느슨 FK) |
| `objective_id` | — | int\|null | 존재하는 objective 또는 `null` (느슨 FK) |

### 관련
API `POST /api/checkins` · 데이터 `expectation_checkins` · [ADR-0012](../architecture/adr/ADR-0012-task-project-link.md)(프로젝트 FK 관례)

---

## FR-CHECKIN-02 — 체크인 목록 조회

**사용자 스토리:** 사용자로서 나는 지금까지 남긴 체크인을 최신순으로 훑어보고, 필요하면
특정 프로젝트·목표에 연결된 것만 걸러보고 싶다.

**우선순위** P1 · **목표 주차** 개인 OS P10 · **상태** ⏳

### 수용 기준
- **AC-1** When `GET /api/checkins`, Then 200 과 `{ checkins: [...] }` — `created_at DESC, id DESC`
  순서(최신 먼저).
- **AC-2** Given `?project_id=<int>`, Then 그 프로젝트에 연결된 체크인만. `?project_id=none` 이면
  연결 안 된(`project_id IS NULL`) 체크인만. 존재하지 않는 값(비정수·0 이하)이면 400.
  `?objective_id` 도 동일 규칙.
- **AC-3** Given `?limit=<int>`, Then 그 개수만큼만 반환(기본 50).
- **AC-4** 체크인이 0건이면 200 `{ checkins: [] }` (에러 아님).

### 관련
API `GET /api/checkins` · UI 기대정렬 위젯(`CheckinWidgetView`)

---

## FR-CHECKIN-03 — 체크인 수정·삭제

**사용자 스토리:** 사용자로서 나는 이미 남긴 체크인의 답변을 고치거나, 더는 필요 없는 체크인을
지우고 싶다.

**우선순위** P1 · **목표 주차** 개인 OS P10 · **상태** ⏳

### 수용 기준
- **AC-1** Given 체크인, When `PUT /api/checkins/:id {what:"수정된 답변"}`, Then 보낸 필드만
  병합되고 `updated_at` 이 갱신된다. 나머지 필드는 기존 값 유지.
- **AC-2** Given 병합 결과 7개 답변이 전부 `null`(비어 있음), When PUT, Then 400
  `{error:"최소 한 개 질문에는 답해야 합니다."}` 이고 기존 행은 변경되지 않는다.
- **AC-3** Given 체크인, When `DELETE /api/checkins/:id`, Then 200 `{ok:true}`.
- **AC-4** 존재하지 않는 `id` → PUT/DELETE 둘 다 404.
- **AC-5** `project_id`/`objective_id` 를 PUT 으로 바꿀 때도 FR-CHECKIN-01 AC-4 와 동일하게
  존재 여부를 검증한다.

### 관련
API `PUT/DELETE /api/checkins/:id`

---

## FR-CHECKIN-04 — 기대정렬 체크인 위젯 (화면)

**사용자 스토리:** 사용자로서 나는 사이드바 PLAN 그룹의 "기대정렬" 항목에서 새 체크인을
남기고, 지금까지의 체크인을 카드로 훑어보고 싶다.

**우선순위** P1 · **목표 주차** 개인 OS P10 · **상태** ⏳ · **근거** [ADR-0032](../architecture/adr/ADR-0032-sidebar-shell-per-topic-layouts.md)(주제별 레이아웃)

### 수용 기준
- **AC-1** `checkin` 위젯 뷰(`CheckinWidgetView`): 체크인 목록을 카드로 렌더링 — 시기 라벨
  (`period` 또는 날짜) · 연결된 프로젝트/목표 칩(`Chip`) · 답변 개수 진행 표시(`DotProgress`,
  프런트 전용 계산 — API 응답에는 없음) · 답변한 질문만 라벨과 함께 표시.
- **AC-2** 위젯 안에서 새 체크인 폼을 제공한다(기본 접힘, "+ 새 체크인" 버튼으로 펼침). 7개
  질문을 고정 순서·라벨로 보여주고, 전부 비운 채 제출하면 프런트에서도 안내 문구를 보여준다
  (서버 400 과 별개로 즉시 피드백).
- **AC-3** 체크인 삭제 버튼을 카드에 제공한다. 전용 스토어 `useCheckinStore` — 낙관적 갱신 +
  실패 롤백(기존 스토어 패턴, FR-OKR-06 AC-3 과 동일 관례).
- **AC-4** 4상태(로딩/비어있음/정상/에러)를 갖고, 위젯 에러가 셸·다른 위젯에 전파되지 않는다
  (FR-WIDGET-07, `ErrorBoundary`).
- **AC-5** 위젯은 라이트 테마 토큰(`var(--*)`)만 쓰고 하드코딩 hex 를 두지 않는다 (ADR-0027).
- **AC-6** 레지스트리(`widgets/registry.js`)에 `checkin` 항목을 추가하면 셸 수정 없이 붙는다
  (FR-WIDGET-08). PLAN 주제 기본 레이아웃에 포함한다.

### 관련
UI `CheckinWidgetView` · 스토어 `useCheckinStore` · 컴포넌트 `Chip`·`DotProgress`·`ErrorBanner`(재사용, 신규 공용 컴포넌트 없음) · [UI_SPEC.md](../reference/UI_SPEC.md)

---

## FR-CHECKIN-05 — 프로젝트/목표 연결 (선택)

**사용자 스토리:** 사용자로서 나는 체크인을 특정 프로젝트나 OKR 목표에 연결해서, 나중에
"이 프로젝트에서 내가 뭘 왜 했는지" 를 시점별로 추적하고 싶다. 연결하지 않아도 순수 자기
점검 기록으로 쓸 수 있어야 한다.

**우선순위** P2 · **목표 주차** 개인 OS P10 · **상태** ⏳

### 수용 기준
- **AC-1** Given 체크인 생성/수정 시 `project_id`\|`objective_id` 미지정, Then `null` 로 저장되고
  위젯은 연결 칩 없이 표시한다.
- **AC-2** Given 연결된 프로젝트 또는 목표가 삭제됨, Then 체크인의 해당 FK 는 `NULL` 로 바뀌고
  (`ON DELETE SET NULL`) 체크인 자체는 삭제되지 않는다.
- **AC-3** 목록 조회 시 `?project_id`/`?objective_id` 필터(FR-CHECKIN-02 AC-2)로 특정 리소스에
  연결된 체크인만 볼 수 있다.

### 관련
데이터 `expectation_checkins.project_id`·`objective_id` · API `GET /api/checkins` 필터

---

## 데이터 계약 (ADR-0035 발췌 — 착수 시 DATA_DICTIONARY 로 이관)

```sql
CREATE TABLE expectation_checkins (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  period       TEXT,
  what         TEXT,
  why          TEXT,
  until        TEXT,
  goal         TEXT,
  strategy     TEXT,
  "action"     TEXT,  -- SQLite 예약어 — 항상 인용
  status       TEXT,
  project_id   INTEGER REFERENCES projects(id)   ON DELETE SET NULL,
  objective_id INTEGER REFERENCES objectives(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL, updated_at TEXT NOT NULL
);
```

---

**작성:** 2026-09-14 (개인 OS P10 착수 전 선행 문서)
