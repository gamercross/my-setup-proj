# FR-TASK — 할일 관리 상세 명세

> [REQUIREMENTS_FUNCTIONAL.md](REQUIREMENTS_FUNCTIONAL.md) 의 TASK 도메인 상세화.
> 용어 [GLOSSARY.md](../reference/GLOSSARY.md) · 데이터 [DATA_DICTIONARY.md](../reference/DATA_DICTIONARY.md) · API [API_REFERENCE.md](../reference/API_REFERENCE.md)(예정) · 화면 [UI_SPEC.md](../reference/UI_SPEC.md)(예정).

## 공통 규칙 (모든 FR-TASK 적용)

- 저장소: `tasks` 테이블 (Week 5 이전엔 `backend/src/db.js` 인메모리, 인터페이스 동일).
- 시각: 서버가 `created_at`/`updated_at` 을 ISO8601 로 채운다. 클라이언트가 보내도 무시.
- 검증 실패 → HTTP 400 `{ "error": "<메시지>" }` (NFR-SEC-07).
- 존재하지 않는 `id` → HTTP 404 `{ "error": "할일을 찾을 수 없습니다." }`.
- 모든 목록 응답은 `{ "tasks": [...] }`, 단건은 `{ "task": {...} }` 형태.

---

## FR-TASK-01 — 할일 생성

**사용자 스토리:** 사용자로서 나는 제목·설명·마감일·우선순위로 할일을 만들고 싶다, 해야 할 일을 앱에 남겨두기 위해.

**우선순위** P0 · **목표 주차** W3 · **상태** 🚧 (API 존재, 프론트 미연결)

### 수용 기준
- **AC-1** Given 유효한 `{title:"회의 준비"}`, When `POST /api/tasks`, Then 201 과 `{task}` 를 반환하고 `id`·`created_at`·`updated_at` 이 채워지며 `priority="medium"`, `status="todo"`, `description=""`, `due_date=null` 이 기본으로 설정된다.
- **AC-2** Given `{title:"발표", description:"5장", due_date:"2026-09-10", priority:"high"}`, When 생성, Then 모든 값이 그대로 저장되고 목록 조회에 포함된다.
- **AC-3** Given `title` 누락 또는 빈 문자열, When 생성, Then 400 `{error:"title 은 필수입니다."}` 이고 아무것도 저장되지 않는다.
- **AC-4** Given `priority:"urgent"`(허용값 아님), When 생성, Then 400 이고 저장되지 않는다.
- **AC-5** Given `due_date:"2026-13-40"`(형식 오류), When 생성, Then 400. *(현재 미구현 — 확인 필요: db.js 는 due_date 형식 검증 없음)*

### 입력·검증 규칙
| 필드 | 필수 | 타입 | 규칙 |
|---|:---:|---|---|
| `title` | ✅ | string | 트림 후 길이 ≥ 1 |
| `description` | — | string | 기본 `""` |
| `due_date` | — | string | `YYYY-MM-DD`, 유효한 날짜 |
| `priority` | — | string | `high`\|`medium`\|`low`, 기본 `medium` |
| `status` | — | string | 생성 시 무시하고 `todo` 고정 (또는 허용값만) |

### 오류 시나리오
| 상황 | 기대 동작 |
|---|---|
| 본문이 JSON 이 아님 | 400, 서버 정상 유지 |
| DB 쓰기 실패 | 500 `{error:"할일을 생성하지 못했습니다."}`, 에러 로그 (NFR-OBS-01) |

### 관련
API `POST /api/tasks` · UI `TaskForm` · 데이터 `tasks` · NFR-SEC-07, NFR-REL-01

---

## FR-TASK-02 — 할일 목록 조회

**사용자 스토리:** 사용자로서 나는 내 할일 전체를 우선순위 배지와 함께 한눈에 보고 싶다.

**우선순위** P0 · **목표 주차** W3 · **상태** 🚧

### 수용 기준
- **AC-1** Given 할일 3건 존재, When `GET /api/tasks`, Then 200 과 `{tasks:[3건]}`, 각 항목에 `id,title,description,due_date,priority,status,created_at,updated_at` 포함.
- **AC-2** Given 할일 0건, When 조회, Then 200 `{tasks:[]}` (에러 아님). UI 는 "할 일이 없습니다" 표시.
- **AC-3** Given 목록, Then 기본 정렬은 생성 순(오래된 것 먼저). *(정렬 옵션은 FR-TASK-06)*
- **AC-4** UI 는 각 할일에 `priority` 배지를 색으로 구분해 표시한다 (high=빨강 `#ef4444`, medium=주황 `#f59e0b`, low=회색 `#64748b` — 현재 `TaskList.jsx` 기준).

### 오류 시나리오
| 상황 | 기대 동작 |
|---|---|
| 백엔드 미응답/네트워크 오류 | UI 는 `ErrorBanner` 로 "할일을 불러오지 못했습니다" + 재시도 버튼 (FR-UI-04, NFR-REL-02) |

### 관련
API `GET /api/tasks` · UI `Dashboard`→`TaskList` · NFR-PERF-03(500건 렌더)

---

## FR-TASK-03 — 완료 상태 토글

**사용자 스토리:** 사용자로서 나는 체크박스로 할일 완료를 표시하고 싶다.

**우선순위** P0 · **목표 주차** W3 · **상태** 🚧

### 수용 기준
- **AC-1** Given `status="todo"` 인 할일, When 체크박스 클릭 → `PUT /api/tasks/:id {status:"done"}`, Then 200 `{task}` 에 `status="done"`, `updated_at` 이 갱신된다.
- **AC-2** Given `status="done"`, When 다시 클릭 → `{status:"todo"}`, Then `todo` 로 되돌아간다.
- **AC-3** Given `status:"finished"`(허용값 아님), When PUT, Then 400.
- **AC-4** UI 는 응답 성공 후 목록의 해당 항목만 갱신한다(전체 새로고침 아님, 낙관적 업데이트 허용).
- **AC-5** Given 존재하지 않는 `id`, Then 404.

### 관련
API `PUT /api/tasks/:id` · UI `TaskList` `onToggle` · 데이터 `tasks.status`

---

## FR-TASK-04 — 할일 수정·삭제

**사용자 스토리:** 사용자로서 나는 할일 내용을 고치거나 필요 없어진 할일을 지우고 싶다.

**우선순위** P0 · **목표 주차** W3 · **상태** 🚧 (API 존재, 프론트 미연결)

### 수용 기준
- **AC-1** Given 할일, When `PUT /api/tasks/:id {title:"새 제목", priority:"low"}`, Then 200, 보낸 필드만 병합되고 나머지는 유지, `updated_at` 갱신.
- **AC-2** Given 빈 본문 `{}`, When PUT, Then 200 이고 `updated_at` 만 갱신(또는 변경 없음 — 현 `db.js` 는 `updated_at` 갱신).
- **AC-3** Given `title:""`, When PUT, Then 400 (빈 제목으로 덮어쓰기 금지). *(확인 필요: 현재 `db.js updateTask` 는 빈 title 을 막지 않음)*
- **AC-4** Given 할일, When `DELETE /api/tasks/:id`, Then 200 `{ok:true}`, 이후 조회 시 목록에 없음.
- **AC-5** Given 이미 삭제된 `id`, When DELETE, Then 404.
- **AC-6** UI 삭제는 확인 없이 즉시 실행하되, 실패 시 항목을 복원하고 `ErrorBanner` 표시.

### 관련
API `PUT`/`DELETE /api/tasks/:id` · UI `TaskList` `onDelete` · NFR-REL-02

---

## FR-TASK-05 — 영속 저장

**사용자 스토리:** 사용자로서 나는 앱을 껐다 켜도 내 할일이 그대로 있길 바란다.

**우선순위** P0 · **목표 주차** W5 · **상태** ✅ Phase B2 (2026-09-02, better-sqlite3)

### 수용 기준
- **AC-1** ✅ Given 할일 2건 생성 후 백엔드 프로세스 재시작, When `GET /api/tasks`, Then 2건이 그대로 반환된다. (TC-DB-01)
- **AC-2** ✅ SQLite 파일은 `backend/db/schema.sql` 로 초기화되며, 이미 있으면 데이터를 보존한다(`CREATE TABLE IF NOT EXISTS`). `db/index.js` 가 런타임 멱등 적용. (TC-DB-03)
- **AC-3** ✅ `backend/src/db.js` 의 함수 시그니처(`getTasks/getTask/addTask/updateTask/deleteTask`)는 인메모리 때와 동일하게 유지된다 (NFR-MAINT-03) — 라우트·테스트 무수정. (TC-DB-02)
- **AC-4** ✅ 기존 인메모리 기준 API 통합 테스트가 SQLite 로 교체 후에도 전부 통과한다(회귀). `npm test` 18/18.
- **AC-5** ✅ DB 파일 경로는 `DATABASE_PATH` 환경변수로 주입한다 (기본 `backend/data/app.db`, 패키지는 `userData` — [ADR-0009](../architecture/adr/ADR-0009-sqlite-file-location.md)). 부팅 시 WAL 모드 ([ADR-0011](../architecture/adr/ADR-0011-agent-backend-db-access.md)).

### 관련
ADR-02/03 · `backend/db/` · 데이터 `tasks` · NFR-MAINT-03, NFR-PERF-02

---

## FR-TASK-06 — 정렬·필터 (P1)

**사용자 스토리:** 사용자로서 나는 마감 임박·우선순위 높은 할일을 먼저 보고 싶다.

**우선순위** P1 · **목표 주차** W4 · **상태** ⏳ (상세화 일부)

### 수용 기준 (초안)
- **AC-1** `GET /api/tasks?status=todo` → `todo` 인 것만.
- **AC-2** `GET /api/tasks?priority=high` → `high` 인 것만.
- **AC-3** `GET /api/tasks?sort=due_date` → 마감일 오름차순, NULL 은 뒤로.
- **AC-4** 복수 파라미터는 AND 결합.
- **AC-5** 잘못된 파라미터 값은 400 또는 무시(정책 결정 필요).

---

## FR-TASK-07 — 오늘/내일 할 일 (P1)

**사용자 스토리:** 사용자로서 나는 "오늘 해야 할 일"만 따로 보고 싶다.

**우선순위** P1 · **목표 주차** W5 · **상태** ⏳ (상세화 예정)

### 수용 기준 (초안)
- **AC-1** `GET /api/tasks?due=today` → `due_date` 가 오늘(서버 로컬 날짜)인 것.
- **AC-2** `due=tomorrow`, `due=overdue`(지났고 미완료) 지원.
- **AC-3** 대시보드에 "오늘의 할 일" 섹션으로 노출 (FR-AGENT 브리핑과 연계).

---

## FR-TASK-09 — 할 일 위젯 리스트/보드(칸반) 뷰 전환 (개인 OS P5)

**사용자 스토리:** 사용자로서 나는 할 일을 목록으로도, 우선순위별 칸반 보드로도 보고 싶다 —
어느 뷰에서 완료를 눌러도 같은 상태여야 한다.

**우선순위** P5 · **상태** ✅ (2026-09-08) · **근거** [ADR-0028](../architecture/adr/ADR-0028-single-client-cache.md) (PO-7)

> 태그/분류는 이 요구사항 범위 밖 — P6([ADR-0029](../architecture/adr/ADR-0029-task-auto-category.md)) 이월. P5 는 백엔드/스키마 무변경.

### 수용 기준
- **AC-1** 보드 선택 시 우선순위 3열(높음/보통/낮음) 렌더 + `config.display.view='board'` 가 영속(새로고침 유지).
- **AC-2** 보드에서 완료 체크 → `toggleTask` 1회 호출, 리스트로 전환해도 같은 완료 상태.
- **AC-3** 리스트의 `hideCompleted`/`sortBy`/`maxItems` 가 보드에도 같은 파생 결과로 적용(두 뷰가 같은 `visible` 공유).
- **AC-4** `priority` 누락/미지값 → 보통(medium) 열로 (누락 0건).
- **AC-5** `overview` 주제와 `tasks` 주제의 tasks 위젯은 각각 독립 view (ADR-0032 주제 스코프).
- **AC-6** `config.display.view` 손상값('kanban'/null/숫자) → `resolveDisplay` 가 'list' 폴백, 크래시 없음.
- **AC-7** `useTaskStore(s=>s.tasks)` 는 항상 배열 반환, 데이터 무변경 시 참조 안정.

---

## FR-TASK-08 — 자유 태그(다중) + 에이전트 자동 분류 (개인 OS P6)

**사용자 스토리:** 사용자로서 나는 할 일에 태그를 자유롭게(여러 개) 달고 싶고,
태그를 깜빡한 할 일은 에이전트가 알아서 분류해 주면 좋겠다.

**우선순위** P1 · **상태** ✅ (2026-09-08) · **근거** [ADR-0029](../architecture/adr/ADR-0029-task-auto-category.md)(자유 태그·다중, 에이전트 배치), [ADR-0018](../architecture/adr/ADR-0018-schema-migration-strategy.md)(마이그레이션 최소안)

> 초안의 "고정 6종 taxonomy + 단일 카테고리 + `tasks.category` 컬럼" 은 폐기. 별도 테이블 `task_tags`(`source∈{user,agent}`).

### 수용 기준
- **AC-1** 사용자는 할 일 위젯에서 태그를 추가/삭제할 수 있다(다중). 태그는 트림 후 1~20자, 개행·콤마 불가.
- **AC-2** 태그는 `POST /api/tasks/:id/tags` · `DELETE /api/tasks/:id/tags/:tag` 로 저장되고, 목록·단건 응답의 `tags`(문자열 배열, 오름차순)에 실린다. `source` 는 노출 안 함.
- **AC-3** 태그가 0개인 미완료 할 일은 다음 `daily_brief` 실행에서 에이전트가 태그를 붙인다(할 일당 1~3개, 짧은 한국어).
- **AC-4** 에이전트는 이미 태그가 있는 할 일(수동 포함)을 건드리지 않는다. `tasks` 행 자체는 UPDATE 하지 않는다.
- **AC-5** 자동 분류 실패 시 태그 없음 유지 + `sync_logs('classify','failed')` 기록. 브리핑은 계속 진행한다.
- **AC-6** 자동 분류 성공 시 `sync_logs('classify','success')` 1행. 대상 0건이면 Claude 호출 0회.
- **AC-7** 위젯에 태그 필터 바(칩). 칩을 눌러 그 태그의 할 일만 보고, 같은 칩 재클릭으로 해제. 필터 상태는 위젯 로컬(비영속).
- **AC-8** 필터 결과 0건이면 "이 태그의 할 일이 없습니다" + [필터 해제].
- **AC-9** 태그 검증 위반은 400 "태그는 1~20자여야 합니다.".
- **AC-10** 없는 할 일에 태그 조작은 404. 중복 추가·없는 태그 삭제는 멱등(201/200).
- **AC-11** 할 일 삭제 시 `task_tags` 도 함께 삭제(`ON DELETE CASCADE`).

### 관련
- API: [API_REFERENCE.md](../reference/API_REFERENCE.md) `POST/DELETE /api/tasks/:id/tags`
- 데이터: [DATA_DICTIONARY.md](../reference/DATA_DICTIONARY.md) §1-a `task_tags`
- 에이전트: [AGENT.md](AGENT.md) daily_brief 배치 분류
- UI: [UI_SPEC.md](../reference/UI_SPEC.md) §3.2 태그 칩·필터

---

**작성:** 2026-09-02
