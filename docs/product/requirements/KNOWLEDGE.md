# FR-KNOW — 지식 축적 추세·역량 지도 상세 명세

> [REQUIREMENTS_FUNCTIONAL.md](REQUIREMENTS_FUNCTIONAL.md) 의 지식 지도 도메인 상세화.
> 결정 [../architecture/adr/ADR-0036-knowledge-trend-view.md](../architecture/adr/ADR-0036-knowledge-trend-view.md) (채택 2026-09-15).
> 데이터 [../reference/DATA_DICTIONARY.md](../reference/DATA_DICTIONARY.md) · API [../reference/API_REFERENCE.md](../reference/API_REFERENCE.md) · 화면 [../reference/UI_SPEC.md](../reference/UI_SPEC.md).

이 문서는 개인 생산성 OS **P11** 의 요구사항이다. `docs/REVERSE_PLAN.md` §5-3 정합성 감사에서
§1-0 목적("완료율이 아니라 지식 — 지식이 쌓여 역량이 느는 방향을 한눈에")에 답하는 화면이 없다는
공백을 지적했다. 데이터(`expectation_checkins`·`kr_snapshots`·`task_tags`)는 이미 있고, 이를
시계열로 종합해 보여주는 **읽기 전용 파생 뷰**만 없었다 — 새 테이블·컬럼은 만들지 않는다.

---

## 공통 규칙 (모든 FR-KNOW 적용)

- 저장소: 새 테이블·컬럼 없음. `expectation_checkins`·`kr_snapshots`·`task_tags` 를 순수 SQL 로
  집계만 한다 (ADR-0036).
- Claude·외부 API 호출 없음 (ADR-0030 주간 요약 선례와 동일하게 순수 집계).
- 이 라우트는 `kr_snapshots` 를 **적재하지 않는다** — 적재 주체는 `GET /api/okr/trend` 뿐이다
  (FR-OKR-04 AC-3 불변식).
- 체크인은 **주 단위**, OKR 은 **월 단위**로 집계한다 — `kr_snapshots.month` 를 그대로 재사용하고
  새 주간 스냅샷 로직을 만들지 않는다(ADR-0036 §비대칭 결정).
- 검증 실패 → HTTP 400, RFC 9457 봉투 `{ "type": "validation_error", "detail": "<메시지>", ... }` (NFR-SEC-07, [ADR-0017](../architecture/adr/ADR-0017-rest-error-contract.md)). 아래 AC 의 `{error:"..."}` 표기는 이 봉투의 `detail` 값을 가리킨다.
- 웹 데모(ADR-0026): `GET /knowledge-trend` 를 `frontend/src/api/demoClient.js` 목 어댑터에도
  추가한다 — 안 하면 데모에서 지식 지도 위젯이 깨진다. 새 목 데이터 배열은 만들지 않고 기존
  시드(`expectation_checkins`·`kr_snapshots`·`tasks[].tags`)에서 파생한다.

---

## FR-KNOW-01 — 지식 축적 추세 집계 API

**사용자 스토리:** 사용자로서 나는 지금까지 남긴 체크인·OKR 달성률·태그가 시간이 지나며 어떻게
쌓였는지 한 번의 조회로 보고 싶다.

**우선순위** P1 · **목표 주차** 개인 OS P11 · **상태** ✅

### 수용 기준
- **AC-1** When `GET /api/knowledge-trend`, Then 200 과 `window`·`checkins`·`okr`·`tags`·`summary`
  키를 항상 포함한다. 데이터가 0건이어도 배열은 빈 배열이며 에러가 아니다.
- **AC-2** Given `?weeks=<int>`, Then 그 길이만큼 창을 조절한다(기본 8, 허용 1~26). 범위 밖·비정수
  → 400 `{error:"weeks 는 1~26 사이 정수여야 합니다."}`.
- **AC-3** `checkins.points` 는 `weeks` 개가 항상 채워진다(데이터 없는 주는 `count:0`). 오름차순,
  마지막 원소가 이번 주(오늘 포함 ISO 주). `week` 는 그 주 월요일의 로컬 `YYYY-MM-DD`, `label` 은
  `MM-DD`.
- **AC-4** `okr.points` 는 창과 겹치는 달의 `kr_snapshots` 평균이며 `month` 오름차순, `round3`
  반올림(`/api/okr/trend` 와 동일 공식). 이 라우트는 새 스냅샷을 적재하지 않는다.
- **AC-5** `tags.items` 는 창 안에서 부착된 `task_tags` 를 `source` 무관하게 세고
  `count DESC, tag ASC` 정렬, 최대 12개. 잘린 나머지는 `tags.otherCount` 에 합산한다.
- **AC-6** Claude 호출이 없다 — 순수 SQL 집계.

### 입력·검증 규칙
| 필드 | 필수 | 타입 | 규칙 |
|---|:---:|---|---|
| `weeks` | — | int | 미지정 시 8, 1~26 범위, 정수 형식 아니면 400 |

### 관련
API `GET /api/knowledge-trend` · 서비스 `backend/src/services/knowledgeTrend.js` ·
데이터 `expectation_checkins`·`kr_snapshots`·`task_tags` (읽기 전용)

---

## FR-KNOW-02 — 지식 지도 위젯 (화면)

**사용자 스토리:** 사용자로서 나는 사이드바 PLAN 그룹의 "지식 지도" 항목에서 체크인 빈도·OKR
달성률·태그 분포를 한눈에 보고 싶다.

**우선순위** P1 · **목표 주차** 개인 OS P11 · **상태** ✅ · **근거**
[ADR-0032](../architecture/adr/ADR-0032-sidebar-shell-per-topic-layouts.md)(주제별 레이아웃)

### 수용 기준
- **AC-1** `knowledge` 위젯이 `widgets/registry.js`·`widgetMeta.js` 에 등록되어 셸 수정 없이
  배치·리사이즈된다 (FR-WIDGET-08).
- **AC-2** 상단은 체크인 빈도 라인차트, 중단은 OKR 평균 달성률 라인차트(다른 stroke 색), 하단은
  태그 분포(칩 + 점그리드 진행바). 차트는 `LineChart`/`linePath.js` 를 재사용한다.
- **AC-3** 4상태(로딩/비어있음/정상/에러)를 갖는다. 에러는 `ErrorBanner(onRetry)`, 위젯 밖으로
  전파되지 않는다 (FR-WIDGET-07).
- **AC-4** 하드코딩 hex 없음, 인라인 스타일 + CSS 변수만(ADR-0027). 새 공용 컴포넌트를 추가하지
  않는다 — `LineChart`·`DotProgress`·`Chip`·`StatTile`·`ErrorBanner` 를 재사용한다.
- **AC-5** config: `weeks`(number 4~26 step2 기본 8), `showTags`(bool 기본 true).

### 관련
UI `KnowledgeWidgetView` · 스토어 `useKnowledgeStore` · 컴포넌트 `LineChart`·`DotProgress`·`Chip`·`StatTile`·`ErrorBanner`(재사용) · [UI_SPEC.md](../reference/UI_SPEC.md)

---

## FR-KNOW-03 — 데모 모드 패리티

**사용자 스토리:** 사용자로서 나는(또는 웹 데모 방문자로서) 백엔드 없이도 지식 지도 위젯이
동일하게 동작하는 것을 보고 싶다.

**우선순위** P1 · **목표 주차** 개인 OS P11 · **상태** ✅

### 수용 기준
- **AC-1** `demoClient.js` 의 `DEMO_ROUTES` 에 `GET /knowledge-trend` 가 있고
  `node scripts/check-demo-parity.mjs` 가 통과한다.
- **AC-2** 목 응답은 기존 데모 시드(`expectation_checkins.created_at`·`kr_snapshots`·
  `tasks[].tags`)에서 파생한다. 새 목 데이터 배열을 만들지 않는다.

### 관련
`frontend/src/api/demoClient.js`(`knowledgeTrend()`) · `scripts/check-demo-parity.mjs`

---

## FR-KNOW-04 — §1-0 목적 정합성 (문서 수준)

**사용자 스토리:** 프로젝트를 감사하는 사람으로서 나는 REVERSE_PLAN 의 정합성 감사 표에서 이
기능이 더 이상 "공백"으로 남지 않는 것을 확인하고 싶다.

**우선순위** P2 · **목표 주차** 개인 OS P11 · **상태** ✅

### 수용 기준
- **AC-1** `docs/REVERSE_PLAN.md` §5 서비스 표에 행이 추가되고, §5-3 감사 표의 해당 "공백" 행이
  이 기능으로 갱신되며, §6-2 후보 목록에서 제거된다.

### 관련
`docs/REVERSE_PLAN.md` §5, §5-3, §6-1, §6-2

---

## 데이터 계약 (ADR-0036 발췌 — 새 테이블·컬럼 없음)

이 기능은 기존 3개 테이블을 읽기 전용으로 조회한다. 스키마는 `backend/db/schema.sql` 의
`expectation_checkins`(ADR-0035) · `kr_snapshots`(ADR-0030) · `task_tags`(ADR-0029) 를 그대로
참조한다.

```jsonc
// GET /api/knowledge-trend?weeks=8 응답 스키마
{
  "window": { "weeks": 8, "from": "2026-07-27", "to": "2026-09-20" },
  "checkins": { "total": 7, "points": [ { "week": "2026-07-27", "label": "07-27", "count": 0 } ] },
  "okr": { "points": [ { "month": "2026-07", "krAvgPct": 0.41 } ], "latestPct": 0.84 },
  "tags": { "total": 14, "distinct": 5, "otherCount": 0, "items": [ { "tag": "학습", "count": 6 } ] },
  "summary": { "checkinWeeks": 4, "activeWeeks": 8, "topTag": "학습" }
}
```

---

**작성:** 2026-09-15 (개인 OS P11 착수 겸 완료 문서)
