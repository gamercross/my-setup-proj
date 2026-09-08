# FR-OKR — OKR + 주간 플래너 상세 명세

> [REQUIREMENTS_FUNCTIONAL.md](REQUIREMENTS_FUNCTIONAL.md) §10 의 OKR 도메인 상세화.
> 방향 [../vision/PERSONAL_OS.md](../vision/PERSONAL_OS.md) T3 · 결정 [../architecture/adr/ADR-0030-okr-data-model.md](../architecture/adr/ADR-0030-okr-data-model.md) (채택 2026-09-08, PO-5/6).
> 용어 [../reference/GLOSSARY.md](../reference/GLOSSARY.md) · 데이터 [../reference/DATA_DICTIONARY.md](../reference/DATA_DICTIONARY.md) · API [../reference/API_REFERENCE.md](../reference/API_REFERENCE.md) · 화면 [../reference/UI_SPEC.md](../reference/UI_SPEC.md).

이 문서는 개인 생산성 OS **P8** 의 요구사항이다. 스키마·API 설계 근거는 ADR-0030,
마이그레이션 방식은 [ADR-0018](../architecture/adr/ADR-0018-schema-migration-strategy.md) 최소안(`PRAGMA user_version`)을 그대로 쓴다.

---

## 공통 규칙 (모든 FR-OKR 적용)

- 저장소: `objectives` · `key_results` · `kr_snapshots` 3테이블 (ADR-0030 §PO-5). P6 에서 도입한
  마이그레이션 러너(`backend/db/index.js`)로 forward-only 추가한다.
- 시각: 서버가 `created_at`/`updated_at` 을 ISO8601 로 채운다. 클라이언트가 보내도 무시.
- 검증 실패 → HTTP 400 `{ "error": "<메시지>" }` (NFR-SEC-07).
- 존재하지 않는 `id` → HTTP 404 `{ "error": "<대상>을 찾을 수 없습니다." }`.
- **OKR 데이터는 사용자가 앱에서 CRUD 한다.** 에이전트는 objective·key_result 를 만들거나
  고치지 않는다 (자동 분류 FR-TASK-08 과 다른 점). 에이전트가 쓰는 것은 `kr_snapshots`
  월별 적재뿐이다 (FR-OKR-04, 선택).
- **달성률(pct) 정의:** key result 는 `clamp(current / target, 0, 1)`. `target = 0` 이면 pct = 0.
  objective 달성률 = 하위 key result pct 의 산술 평균 (하위 0개면 0).
- **주간 버킷 정의:** "주"는 ISO 주(월요일 시작, 일요일 끝), 서버 로컬 시간대 기준.
  "이번 주" = 오늘이 속한 월~일. 지난주 / 다음주는 각각 ±7일.
- 웹 데모(ADR-0026): 아래 API 는 전부 `frontend/src/api/demoClient.js` / `demoData.js`
  인메모리 목 어댑터에도 추가한다 — 안 하면 데모에서 OKR·플래너 위젯이 깨진다.

---

## FR-OKR-01 — Objective 생성·수정·삭제

**사용자 스토리:** 사용자로서 나는 분기/연간 목표(Objective)를 만들고 상태를 관리하고 싶다,
내가 무엇을 향해 가는지 앱에서 보기 위해.

**우선순위** P1 · **목표 주차** 개인 OS P8 · **상태** ⏳

### 수용 기준
- **AC-1** Given `{title:"3분기 건강 회복", period:"2026-Q3"}`, When `POST /api/okr/objectives`,
  Then 201 과 `{objective}` 를 반환하고 `id`·`created_at`·`updated_at` 이 채워지며
  `status="active"` 가 기본으로 설정된다.
- **AC-2** Given `title` 누락·빈 문자열(트림 후 길이 0), When 생성, Then 400
  `{error:"title 은 필수입니다."}` 이고 아무것도 저장되지 않는다.
- **AC-3** Given `period` 가 `YYYY` 또는 `YYYY-Q[1-4]` 형식이 아님, When 생성, Then 400.
- **AC-4** Given `status:"paused"`(허용값 아님 — `active`\|`done`\|`archived` 만), When 생성/수정, Then 400.
- **AC-5** Given objective, When `PUT /api/okr/objectives/:id {title,period,status}`, Then 보낸 필드만
  병합되고 `updated_at` 이 갱신된다.
- **AC-6** Given objective, When `DELETE /api/okr/objectives/:id`, Then 200 `{ok:true}` 이고 하위
  `key_results`·`kr_snapshots` 가 함께 삭제된다 (`ON DELETE CASCADE`).
- **AC-7** Given 존재하지 않는 `id`, When PUT/DELETE, Then 404.

### 입력·검증 규칙
| 필드 | 필수 | 타입 | 규칙 |
|---|:---:|---|---|
| `title` | ✅ | string | 트림 후 길이 1~120 |
| `period` | ✅ | string | `YYYY`(연간) 또는 `YYYY-Q1`~`YYYY-Q4`(분기) |
| `status` | — | string | `active`\|`done`\|`archived`, 기본 `active` |

### 관련
API `POST/PUT/DELETE /api/okr/objectives` · 데이터 `objectives` · UI OKR 위젯 · NFR-SEC-07

---

## FR-OKR-02 — Key Result 생성·수정·삭제

**사용자 스토리:** 사용자로서 나는 Objective 아래에 측정 가능한 핵심 결과(Key Result)를
목표치·현재치·단위로 달고, 진행하면서 현재치를 갱신하고 싶다.

**우선순위** P1 · **목표 주차** 개인 OS P8 · **상태** ⏳

### 수용 기준
- **AC-1** Given 존재하는 objective, When `POST /api/okr/key-results
  {objective_id, title:"주 3회 운동", target:36, current:0, unit:"회"}`, Then 201 과 `{keyResult}`,
  `current` 기본 0.
- **AC-2** Given `objective_id` 가 없는 objective 를 가리킴, When 생성, Then 400
  `{error:"목표(objective)를 찾을 수 없습니다."}`.
- **AC-3** Given `target` 이 숫자가 아니거나 음수, When 생성/수정, Then 400.
- **AC-4** Given `current` 가 숫자가 아님, When 생성/수정, Then 400. (`current` 는 `target` 을
  초과해도 저장은 허용하되, 달성률 계산에서 1.0 으로 클램프한다.)
- **AC-5** Given `unit` 미지정, Then `null` 로 저장되고 UI 는 단위 없이 숫자만 표시한다.
- **AC-6** Given `project_id` 지정, When 그 프로젝트가 삭제됨, Then `key_results.project_id` 는
  `NULL` 로 바뀐다 (`ON DELETE SET NULL`) — key result 자체는 남는다.
- **AC-7** Given key result, When `PUT /api/okr/key-results/:id {current:12}`, Then `current` 만
  갱신되고 `updated_at` 이 바뀐다. 대시보드 달성률이 즉시 재계산된다.
- **AC-8** Given key result, When `DELETE /api/okr/key-results/:id`, Then 200 이고 하위
  `kr_snapshots` 가 함께 삭제된다.
- **AC-9** 존재하지 않는 `id` → 404.

### 입력·검증 규칙
| 필드 | 필수 | 타입 | 규칙 |
|---|:---:|---|---|
| `objective_id` | ✅ | int | 존재하는 objective |
| `title` | ✅ | string | 트림 후 길이 1~120 |
| `target` | ✅ | number | ≥ 0 |
| `current` | — | number | 기본 0 |
| `unit` | — | string\|null | 트림 후 길이 0~12, 빈 값은 `null` |
| `project_id` | — | int\|null | 존재하는 프로젝트 또는 `null` (느슨 FK) |

### 관련
API `POST/PUT/DELETE /api/okr/key-results` · 데이터 `key_results` · [ADR-0012](../architecture/adr/ADR-0012-task-project-link.md)(프로젝트 FK 관례)

---

## FR-OKR-03 — OKR 대시보드 조회

**사용자 스토리:** 사용자로서 나는 모든 Objective 와 그 아래 Key Result 의 달성률을,
그리고 전체를 요약한 스탯 타일 그리드를 한눈에 보고 싶다.

**우선순위** P1 · **목표 주차** 개인 OS P8 · **상태** ⏳ · **참조 화면** PERSONAL_OS §4 (스탯 타일 6개 + 월별 라인차트)

### 수용 기준
- **AC-1** Given objective 2개(각 KR 2·1개), When `GET /api/okr`, Then 200 과
  `{ objectives: [ { id, title, period, status, pct, keyResults: [ { id, title, target, current, unit, pct, project_id } ] } ], summary: {...} }`.
- **AC-2** `summary` 는 다음을 포함한다 (전부 서버 계산):
  - `krAvgPct` — 모든 key result pct 의 평균 (0~1). KR 0개면 0.
  - `objectiveCount` · `keyResultCount`
  - `bucket` — `{ high: N, mid: M, low: K }` = pct ≥ 0.9 / 0.4 ≤ pct < 0.9 / pct < 0.4 개수
    (참조 화면의 "90% 이상 · 40~89.9% · 40% 미만" 구간 카운트)
- **AC-3** `status="archived"` 인 objective 는 기본 응답에서 제외한다. `GET /api/okr?includeArchived=1`
  이면 포함한다.
- **AC-4** objective·KR 가 0개면 200 과 `{ objectives: [], summary: { krAvgPct: 0, objectiveCount: 0, keyResultCount: 0, bucket: {high:0,mid:0,low:0} } }`
  (에러 아님). UI 는 "아직 목표가 없습니다 · [목표 추가]" 를 표시한다.
- **AC-5** 모든 `pct` 는 0~1 실수이며 소수 셋째 자리에서 반올림한다. UI 표기는 `%` 정수 또는
  소수 한 자리 (참조 화면 84.4%).
- **AC-6** 백엔드 미응답 시 UI 는 `ErrorBanner` + 재시도 (FR-UI-04, NFR-REL-02).

### 관련
API `GET /api/okr` · UI OKR 위젯 (`OkrWidgetView`) · 컴포넌트 `StatTile`(P4) · NFR-PERF-03

---

## FR-OKR-04 — 월별 달성률 추이 (스냅샷 + 라인차트)

**사용자 스토리:** 사용자로서 나는 KR 평균 달성률이 달마다 어떻게 움직였는지 라인차트로 보고 싶다.

**우선순위** P2 · **목표 주차** 개인 OS P8 · **상태** ⏳

### 수용 기준
- **AC-1** Given `kr_snapshots` 에 여러 달치 행, When `GET /api/okr/trend`, Then 200 과
  `{ points: [ { month: "2026-07", krAvgPct: 0.62 }, { month: "2026-08", krAvgPct: 0.78 } ] }`
  (월 오름차순, 최근 12개월 상한).
- **AC-2** 스냅샷이 0건이면 200 `{ points: [] }`. UI 는 차트 자리에 "데이터가 쌓이면 추이가 보입니다".
- **AC-3** 월별 스냅샷 적재: 백엔드 또는 에이전트가 **월 1회** 각 key result 의 그 시점 pct 를
  `kr_snapshots(key_result_id, month, pct)` 에 UPSERT 한다 (`UNIQUE(key_result_id, month)`).
  같은 달 재실행은 멱등(덮어쓰기).
- **AC-4** 적재 주체·스케줄은 P8 에서 확정한다 (후보: `daily_brief` 실행 시 "이번 달" 스냅샷을
  갱신 — 별도 Claude 호출 없음, 순수 집계). 미구현이어도 FR-OKR-03 은 독립적으로 동작한다.
- **AC-5** 차트는 인라인 SVG 로 그린다 (PO-8 — Recharts 미도입, `dataviz` 스킬 원칙).

### 관련
API `GET /api/okr/trend` · 데이터 `kr_snapshots` · UI OKR 위젯 라인차트 · `agent/`(선택)

---

## FR-OKR-05 — 주간 플래너 (지난주 / 이번주 / 다음주)

**사용자 스토리:** 사용자로서 나는 "지난주에 뭘 끝냈고, 이번 주에 뭐가 남았고, 다음 주에 뭐가
오는지"를 요약으로 보고 싶다 — 이 프로젝트의 PROGRESS.md 가 프로젝트에 해주는 걸 나에게.

**우선순위** P1 · **목표 주차** 개인 OS P8 · **상태** ⏳ · **근거** ADR-0030 §PO-6 (순수 SQL 집계, Weekly Brief 는 후속)

### 수용 기준
- **AC-1** When `GET /api/planner/weekly`, Then 200 과
  `{ lastWeek: { done, total }, thisWeek: { done, total, items: [task…] }, nextWeek: { total, items: [task…] } }`.
- **AC-2** 버킷 기준은 `tasks.due_date` (ISO 주, 월~일, 서버 로컬). `due_date` 가 `null` 인 할 일은
  어느 버킷에도 넣지 않는다.
- **AC-3** `lastWeek.done` = 지난주에 `due_date` 가 있고 `status="done"` 인 개수. `lastWeek.total`
  = 지난주 마감 전체. 미완료 개수는 `total - done`.
- **AC-4** `thisWeek.items` · `nextWeek.items` 는 각 할 일의 `id,title,due_date,priority,status,tags`
  를 담고 `due_date` 오름차순 정렬한다. 개수 상한 50 (초과 시 `total` 로만 반영).
- **AC-5** 전부 SQL 집계 — Claude 호출 없음. 데이터 0건이면 모든 카운트 0, `items: []`, 200.
- **AC-6** 이 응답은 **읽기 전용**이다. 완료 토글은 기존 `PUT /api/tasks/:id` 로 하고
  (단일 캐시 FR-TASK-09), 플래너 위젯은 `useTaskStore` 파생으로 같은 상태를 본다.
- **AC-7** **Weekly Brief(Claude 텍스트 요약)는 이 FR 범위 밖.** 후속으로 남긴다 —
  `briefs.type` 컬럼 또는 별도 테이블, Daily Brief 인프라 재사용. P8 에서는 만들지 않는다.

### 관련
API `GET /api/planner/weekly` · 데이터 `tasks.due_date`·`task_tags` · UI 주간 플래너 위젯 · FR-TASK-09(단일 캐시)

---

## FR-OKR-06 — OKR·주간 플래너 위젯 (화면)

**사용자 스토리:** 사용자로서 나는 사이드바 PLAN 그룹의 "OKR" · "주간" 항목에서 위 데이터를
참조 화면처럼 다듬어진 형태로 보고 싶다.

**우선순위** P1 · **목표 주차** 개인 OS P8 · **상태** ⏳ · **근거** [ADR-0032](../architecture/adr/ADR-0032-sidebar-shell-per-topic-layouts.md)(PLAN 그룹: OKR·주간), PERSONAL_OS §4

### 수용 기준
- **AC-1** `okr` 위젯 뷰(`OkrWidgetView`): 상단에 스탯 타일 6개 그리드 —
  KR 평균 달성률 · Objective 수 · Key Result 수 · 90% 이상 · 40~89.9% · 40% 미만.
  `StatTile`(P4, tone: `accent`/`ok`/`warn`/`bad`)을 재사용하고, 구간 타일은 색 코딩한다.
- **AC-2** 스탯 타일 아래에 objective 목록 — 각 objective 제목 + `DotProgress`(P4) 달성률 +
  펼치면 하위 KR(제목 · `current/target unit` · pct). KR 진행은 `DotProgress` 또는 옅은 막대.
- **AC-3** objective/KR 추가·수정·삭제·현재치 갱신 UI 를 위젯 안에서 제공한다 (FR-OKR-01/02).
  낙관적 갱신 + 실패 롤백 (기존 스토어 패턴 재사용). 전용 스토어 `useOkrStore`.
- **AC-4** 라인차트(FR-OKR-04)는 위젯 하단 인라인 SVG. 데이터 없으면 안내 문구.
- **AC-5** `weekly` 위젯 뷰(`PlannerWidgetView`): 3열(지난주 완료 N/M · 이번주 완료 K/M · 다음주 P) +
  이번주·다음주 항목 리스트(제목 · 날짜 배지 · 태그 칩 · 완료 체크박스). 완료 체크는
  `useTaskStore.toggleTask` 1회 호출 (FR-TASK-09 단일 캐시 — 리스트·칸반·플래너가 같은 상태).
- **AC-6** 두 위젯 모두 4상태(로딩/비어있음/정상/에러)를 갖고, 위젯 에러가 셸·다른 위젯에
  전파되지 않는다 (FR-WIDGET-07, `ErrorBoundary`).
- **AC-7** 위젯은 라이트 테마 토큰(`var(--*)`)만 쓰고 하드코딩 hex 를 두지 않는다 (ADR-0027).
- **AC-8** 레지스트리(`widgets/registry.js`)에 `okr` · `weekly` 항목을 추가하면 셸 수정 없이
  붙는다 (FR-WIDGET-08). PLAN 주제 기본 레이아웃에 포함한다.

### 관련
UI `OkrWidgetView` · `PlannerWidgetView` · 스토어 `useOkrStore` · 컴포넌트 `StatTile`·`DotProgress`·`Chip`(P4) · [UI_SPEC.md](../reference/UI_SPEC.md)

---

## 데이터 계약 (ADR-0030 발췌 — 착수 시 DATA_DICTIONARY 로 이관)

```sql
CREATE TABLE objectives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  period TEXT NOT NULL,              -- 'YYYY' | 'YYYY-Q[1-4]'
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','done','archived')),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE key_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  objective_id INTEGER NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target REAL NOT NULL,
  current REAL NOT NULL DEFAULT 0,
  unit TEXT,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE kr_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_result_id INTEGER NOT NULL REFERENCES key_results(id) ON DELETE CASCADE,
  month TEXT NOT NULL,               -- 'YYYY-MM'
  pct REAL NOT NULL,                 -- 0~1
  UNIQUE(key_result_id, month)
);
```

## 착수 전 남은 결정 (P8 planner 입력)

| 항목 | 메모 |
|---|---|
| `kr_snapshots` 적재 주체·스케줄 (FR-OKR-04 AC-4) | 백엔드 기동 시 vs `daily_brief` 배치 vs 별도 launchd. P8 planner 가 결정 |
| Weekly Brief(Claude) 착수 시점 | 이번 범위 밖. OKR 심화 단계에서 별 FR 로 |
| objective↔project 시각적 연결 노출 여부 | KR 의 `project_id` 는 저장만. 위젯에서 프로젝트명 표시할지는 UI_SPEC 에서 |

---

**작성:** 2026-09-08 (개인 OS P8 착수 전 선행 문서)
