# FR-PROJ — 프로젝트 추적 상세 명세

> [REQUIREMENTS_FUNCTIONAL.md](../REQUIREMENTS_FUNCTIONAL.md) 의 PROJ 도메인 상세화.
> 용어 [GLOSSARY.md](../GLOSSARY.md) · 데이터 [DATA_DICTIONARY.md](../DATA_DICTIONARY.md) · API [API_REFERENCE.md](../API_REFERENCE.md) · 화면 [UI_SPEC.md](../UI_SPEC.md).
> 관련 결정: [ADR-0012](../adr/ADR-0012-task-project-link.md) (`tasks.project_id` FK `ON DELETE SET NULL`).

## 공통 규칙 (모든 FR-PROJ 적용)

- 저장소: `projects` 테이블 (better-sqlite3, [ADR-0002](../adr/ADR-0002-*)). 스키마 단일 원천 `backend/db/schema.sql`.
- 시각: 서버가 `created_at`/`updated_at` 을 ISO8601 로 채운다.
- 검증 실패 → HTTP 400 `{ "error": "<한국어 메시지>" }` (NFR-SEC-07). SQLite CHECK/NOTNULL/FK 위반도 `backend/src/errors.js` 가 400 + 한국어로 치환 (영문 원문 비노출).
- 존재하지 않는 `id` → HTTP 404 `{ "error": "프로젝트를 찾을 수 없습니다." }`.
- 목록 응답 `{ "projects": [...] }`, 단건 `{ "project": {...} }`.
- 상태값 스키마: `active` | `done` | `on_hold` (GLOSSARY §2). UI 라벨 `진행 중` / `완료` / `보류`.

---

## FR-PROJ-01 — 프로젝트 생성·수정·삭제

**사용자 스토리:** 사용자로서 나는 프로젝트를 이름·진행도·상태로 만들고 고치고 지우고 싶다.

**우선순위** P1 · **목표 주차** W4 · **상태** ✅ Phase C2 (2026-09-03) — 이름 인라인 편집 UI 는 이월(별도 작업)

### 수용 기준
- **AC-1** Given `{name:"신제품"}`, When `POST /api/projects`, Then 201 `{project}` 에 `progress=0`, `status="active"`, `notion_id=null` 기본.
- **AC-2** Given `name` 누락 또는 빈 문자열, When 생성, Then 400 이고 저장 안 됨.
- **AC-3** Given `progress` 가 숫자 아님 또는 0–100 밖, When 생성/수정, Then 400.
- **AC-4** Given `status` 가 허용값(`active`/`done`/`on_hold`) 밖, When 수정, Then 400 (DB CHECK → 400, `errors.js`).
- **AC-5** Given 프로젝트, When `DELETE /api/projects/:id`, Then 200 `{ok:true}`, 이후 단건 조회 404.
- **AC-6** Given 하위 할일이 있는 프로젝트 삭제, Then 해당 할일의 `project_id` 가 `null` 로 바뀐다 (ADR-0012 `ON DELETE SET NULL`). 할일 자체는 삭제되지 않음.
- **AC-7** UI 에서 이름만 입력해 추가 → 목록에 즉시 나타나고 폼이 초기화된다. (`ProjectForm`, 비낙관적 — 서버 201 후 append)
- **AC-8** 카드의 상태 드롭다운(진행 중/완료/보류) 변경 → `PUT /api/projects/:id {status}` 200. **이름 인라인 편집 UI 는 이번 범위 밖(이월).**

### 입력·검증 규칙
| 필드 | 필수 | 타입 | 규칙 |
|---|:---:|---|---|
| `name` | ✅ | string | 트림 후 길이 ≥ 1 |
| `progress` | — | number | 0–100 정수, 기본 0 |
| `status` | — | string | `active`\|`done`\|`on_hold`, 기본 `active` |
| `notion_id` | — | string\|null | 기본 null (FR-PROJ-04) |

### 관련
API `POST`/`PUT`/`DELETE /api/projects` · UI `ProjectForm`·`ProjectCard` · 데이터 `projects` · `backend/src/errors.js` · NFR-SEC-07
TC: TC-PROJ-07~11, TC-DB-04a/b/c/d

---

## FR-PROJ-02 — 프로젝트 카드 (진행도 바 + 상태)

**사용자 스토리:** 사용자로서 나는 프로젝트별 진행 상황을 카드와 진행도 바로 한눈에 보고 싶다.

**우선순위** P1 · **목표 주차** W4 · **상태** ✅ Phase C2 (2026-09-03)

### 수용 기준
- **AC-1** Given 프로젝트 존재, When `GET /api/projects`, Then 200 `{projects:[]}`. 0건이면 UI 는 "프로젝트가 없습니다".
- **AC-2** 카드에 이름·상태 배지/드롭다운·진행도 바(`width: {progress}%`)·`{progress}%` 텍스트.
- **AC-3** 상태 라벨: `active`="진행 중" / `done`="완료" / `on_hold`="보류" (GLOSSARY §2 일치).
- **AC-4** `progress` 가 0/100/비정상값이어도 UI 는 0–100 으로 클램프해 표시.
- **AC-5** 진행도 슬라이더 변경 → `PUT {progress}` 200. 해당 카드만 낙관적 갱신, 실패 시 롤백 + `ErrorBanner`.
- **AC-6** 프로젝트 API 실패가 할일 패널 렌더를 막지 않는다 (FR-UI-01 AC-2). 프로젝트 패널만 `ErrorBanner` + 재시도.

### 관련
API `GET /api/projects` · UI `Dashboard`→`ProjectCard` · 스토어 `useProjectStore` · NFR-REL-02
TC: TC-PROJ-08/09/09b/09c/09d, TC-UI-14~16 (수동)

---

## tasks.project_id — 할일-프로젝트 연결 (ADR-0012)

**상태** ✅ Phase C2 (2026-09-03) — API(POST/PUT) 배선만. TaskForm 드롭다운·TaskList 배지·`?project_id=` 필터는 이월.

### 수용 기준
- **AC-1** `POST /api/tasks {title, project_id:<존재 id>}` → 201, 응답에 `project_id` 포함.
- **AC-2** 존재하지 않는 `project_id` → 400 `{error:"연결할 프로젝트를 찾을 수 없습니다."}`, 목록 불변.
- **AC-3** `project_id` 미지정 → `null`. `PUT /api/tasks/:id {project_id:null}` 로 연결 해제(200).
- **AC-4** `GET /api/tasks?project_id=` 필터는 이번 범위 밖 — FR-TASK-06 과 함께 이월.
- **AC-보강** `project_id` 가 정수/`null` 이 아니면(예: 문자열 `"1"`) 400 `{error:"project_id 는 프로젝트 id(정수) 또는 null 이어야 합니다."}`.

### 관련
API `POST`/`PUT /api/tasks` · 데이터 `tasks.project_id` · ADR-0012
TC: TC-PROJ-08/09/09b/09c/09d, TC-DB-04a

---

## FR-PROJ-03 / FR-PROJ-04 — Notion 연동 (P1/P2)

**상태** ⏳ 미착수. `notion_id` 컬럼만 존재(기본 null). Week 4 후반 / 별도 Phase.

---

## 이월 / 알려진 트레이드오프

- **이름 인라인 편집 UI** — `PUT {name}` API 는 동작하나 카드 UI 미제공. 별도 작업.
- **`GET /api/tasks?project_id=` 필터** — FR-TASK-06 정렬·필터와 함께.
- **TaskForm 프로젝트 선택 드롭다운 / TaskList 프로젝트 배지** — 미포함.
- **NOTNULL → 400 매핑** — `errors.js` 가 `SQLITE_CONSTRAINT_NOTNULL` 도 400 으로 처리. 라우트 레벨 사전 검증(`name` 필수)이 먼저 걸리므로 현재 사용자 입력 경로에서는 도달하지 않으나, 방어적으로 남김(알려진 트레이드오프 — 내부 버그를 400 으로 감출 여지).

**작성:** 2026-09-03 (Phase C2)
