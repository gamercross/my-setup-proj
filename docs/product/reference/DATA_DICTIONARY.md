# 🗃️ 데이터 사전 (Data Dictionary)

> `backend/db/schema.sql` 의 모든 테이블·컬럼을 필드 단위로 설명한다.
> **DDL 의 단일 원천은 [`backend/db/schema.sql`](../../../backend/db/schema.sql)** — 이 문서는 의미·규칙만 다루고 DDL 을 복붙하지 않는다.
> 용어는 [GLOSSARY.md](GLOSSARY.md), 관계·설계 의도는 [DESIGN.md](../architecture/DESIGN.md) §4.

---

## 공통 규칙

| 항목 | 규칙 |
|---|---|
| id | 모든 테이블 `INTEGER PRIMARY KEY AUTOINCREMENT`. 애플리케이션이 지정하지 않는다. |
| 날짜/시간 | `TEXT` + ISO8601. 시각은 UTC `...Z` 권장 (`2026-09-02T08:00:00Z`), 날짜만이면 `2026-09-02`. |
| `created_at` | 행 생성 시 애플리케이션이 현재 시각으로 채운다. 이후 불변. |
| `updated_at` | 행 수정 시마다 애플리케이션이 갱신. |
| `synced_at` | 외부 API 에서 가져와 저장/갱신한 시각. |
| 외부 id (`event_id`, `email_id`, `notion_id`) | 외부 시스템의 식별자. upsert(있으면 갱신, 없으면 삽입) 키로 사용. |
| enum 컬럼 | `CHECK` 제약으로 허용값 고정. 코드 문자열과 반드시 일치 ([GLOSSARY.md](GLOSSARY.md) §2). |

---

## 1. `tasks` — 할일

| 컬럼 | 타입 | 제약 | 의미 | 예시 |
|---|---|---|---|---|
| `id` | INTEGER | PK, auto | 할일 식별자 | `1` |
| `title` | TEXT | NOT NULL | 할일 제목. 빈 문자열 불가(API 에서 검증) | `"회의 자료 준비"` |
| `description` | TEXT | NOT NULL, 기본 `''` | 상세 설명 | `"3장 슬라이드 초안"` |
| `due_date` | TEXT | NULL 허용 | 마감일 (`YYYY-MM-DD`). 없으면 NULL | `"2026-09-05"` |
| `priority` | TEXT | NOT NULL, 기본 `medium`, CHECK | 우선순위 `high`/`medium`/`low` | `"high"` |
| `status` | TEXT | NOT NULL, 기본 `todo`, CHECK | 진행 상태 `todo`/`in_progress`/`done` | `"todo"` |
| `project_id` | INTEGER | NULL 허용, FK → `projects(id)` `ON DELETE SET NULL` | 소속 프로젝트. NULL = 단독 할일 (ADR-0012) | `3` / `null` |
| `created_at` | TEXT | NOT NULL | 생성 시각 (불변) | `"2026-09-02T09:00:00Z"` |
| `updated_at` | TEXT | NOT NULL | 마지막 수정 시각 | `"2026-09-02T10:15:00Z"` |

- 인덱스: `idx_tasks_due(due_date)`, `idx_tasks_status(status)`, `idx_tasks_project(project_id)` — 필터/정렬용 (FR-TASK-06, FR-PROJ).
- `project_id`: ✅ Phase C2 (2026-09-03) — `POST/PUT /api/tasks` 검증 배선, API 응답에 노출(NULL = 단독 할일). 없는 id/타입 오류는 400(`backend/src/errors.js`). `GET /api/tasks?project_id=` 쿼리 필터는 이월(FR-TASK-06 과 함께).
- 완료 토글(FR-TASK-03): `status` 를 `todo` ↔ `done` 전환, `updated_at` 갱신.
- API 응답에는 `tasks.*` 컬럼 + 파생 필드 `tags: []`(문자열 배열, 오름차순) 이 실린다. `TASK_COLS` 는 불변이고 `task_tags` 를 별도 조회해 JS 로 부착한다.

## 1-a. `task_tags` — 할일 태그 (FR-TASK-08, ADR-0029)

자유 문자열 태그, 한 할일에 다중. 수동(`user`)과 에이전트 자동 분류(`agent`)를 `source` 로 구분한다.

| 컬럼 | 타입 | 제약 | 의미 | 예시 |
|---|---|---|---|---|
| `task_id` | INTEGER | NOT NULL, FK → `tasks(id)` `ON DELETE CASCADE` | 대상 할일 | `3` |
| `tag` | TEXT | NOT NULL | 태그 문자열. 트림 후 1~20자, 개행·콤마 불가 (API 검증) | `"공부"` |
| `source` | TEXT | NOT NULL, CHECK `IN ('user','agent')` | 태그를 단 주체 | `"agent"` |
| `created_at` | TEXT | NOT NULL | 생성 시각 | `"2026-09-08T08:00:00Z"` |

- PK: `(task_id, tag)` — 같은 태그 중복 불가(추가는 `INSERT OR IGNORE` 로 멱등).
- 인덱스: `idx_task_tags_tag(tag)` — 태그별 조회/필터용.
- 쓰기 주체: 수동은 백엔드(`POST/DELETE /api/tasks/:id/tags`, `source='user'`). 자동은 **에이전트**(`agent/classify.py` → `agent/db.py:add_agent_tags`, `source='agent'`) — `daily_brief` 배치에서 태그 0개인 미완료 할일에만. ADR-0011 "에이전트 tasks 읽기 전용" 의 명시적 예외(`task_tags` 쓰기만).
- API 응답에 `source` 는 노출하지 않는다(`tags` 는 문자열 배열).

## 2. `projects` — 프로젝트

| 컬럼 | 타입 | 제약 | 의미 | 예시 |
|---|---|---|---|---|
| `id` | INTEGER | PK, auto | 프로젝트 식별자 | `1` |
| `name` | TEXT | NOT NULL | 프로젝트 이름 | `"AI OS 실습"` |
| `notion_id` | TEXT | NULL 허용 | 매핑된 Notion page/database id. 로컬 전용이면 NULL (FR-PROJ-04) | `"a1b2c3d4..."` |
| `progress` | INTEGER | NOT NULL, 기본 `0`, CHECK 0–100 | 진행도 퍼센트 | `40` |
| `status` | TEXT | NOT NULL, 기본 `active`, CHECK | `active`/`done`/`on_hold` | `"active"` |
| `created_at` | TEXT | NOT NULL | 생성 시각 | — |
| `updated_at` | TEXT | NOT NULL | 수정 시각 | — |

- 인덱스: `idx_projects_notion(notion_id)` — Notion 동기화 시 조회용.
- `progress` 범위 위반은 API 에서 400 (NFR-SEC-07). 현재 `backend/src/db.js` `assertProgress` 가 동일 규칙.

## 3. `calendar_events` — 캘린더 일정 (Google Calendar 캐시)

| 컬럼 | 타입 | 제약 | 의미 | 예시 |
|---|---|---|---|---|
| `id` | INTEGER | PK, auto | 로컬 식별자 | `1` |
| `event_id` | TEXT | UNIQUE | Google Calendar event id. **upsert 키** | `"abc123@google.com"` |
| `title` | TEXT | — | 일정 제목 | `"팀 미팅"` |
| `start_time` | TEXT | — | 시작 (ISO8601) | `"2026-09-03T02:00:00Z"` |
| `end_time` | TEXT | — | 종료 (ISO8601) | `"2026-09-03T03:00:00Z"` |
| `location` | TEXT | — | 장소 | `"회의실 A"` |
| `synced_at` | TEXT | NOT NULL | 마지막 동기화 시각 | — |

- 인덱스: `idx_events_start(start_time)` — "오늘/이번주" 조회 (FR-CAL-01/02).
- 소스는 읽기 전용. 앱에서 일정을 생성·수정하지 않는다(현 범위).
- 쓰기 주체: **에이전트**(`agent/db.py:replace_calendar_events`). 백엔드는 `db.js:getCalendarEvents` → `services/calendar.js` 로 SELECT·필터만 (ADR-0011, D-마무리).

## 4. `emails` — 이메일 (Gmail 미읽은 메일 캐시)

| 컬럼 | 타입 | 제약 | 의미 | 예시 |
|---|---|---|---|---|
| `id` | INTEGER | PK, auto | 로컬 식별자 | `1` |
| `email_id` | TEXT | UNIQUE | Gmail message id. **upsert 키** | `"18f9a..."` |
| `from_address` | TEXT | — | 보낸 사람 | `"prof@univ.ac.kr"` |
| `subject` | TEXT | — | 제목 | `"과제 안내"` |
| `snippet` | TEXT | — | 미리보기 텍스트 | `"이번 주 과제는..."` |
| `received_at` | TEXT | — | 수신 시각 (ISO8601) | — |
| `is_read` | INTEGER | NOT NULL, 기본 `0`, CHECK 0/1 | 읽음 여부 (0=안읽음, 1=읽음) | `0` |
| `synced_at` | TEXT | NOT NULL | 마지막 동기화 시각 | — |

- 인덱스: `idx_emails_received(received_at)` — 최신순 조회.
- 현 범위는 미읽은 메일 조회(FR-MAIL-01)까지. 답장·삭제(FR-MAIL-03)는 Week 9.
- 쓰기 주체: **에이전트**(`agent/db.py:upsert_emails`). 백엔드는 `db.js:getUnreadEmails` → `services/mail.js` → `GET /api/mail/unread` 로 SELECT 만 (ADR-0011, D-마무리).

## 5. `briefs` — 일일 브리핑

| 컬럼 | 타입 | 제약 | 의미 | 예시 |
|---|---|---|---|---|
| `id` | INTEGER | PK, auto | 식별자 | `1` |
| `date` | TEXT | NOT NULL, UNIQUE 인덱스 | 브리핑 대상 날짜 (`YYYY-MM-DD`). **하루 1건** | `"2026-09-02"` |
| `content` | TEXT | NOT NULL | Claude 가 생성한 브리핑 본문. **plain text** (UI 는 pre-wrap 렌더, 마크다운 파싱 안 함) | `"오늘의 우선순위 TOP 3\n1. ..."` |
| `notion_url` | TEXT | NULL 허용 | Notion 페이지 URL. 미설정 스킵/실패/저장 전 NULL (FR-AGENT-03). 성공 시 `upsert_brief(date, content, url)` 로 병합(COALESCE) | `"https://notion.so/..."` |
| `created_at` | TEXT | NOT NULL | 최초 생성 시각. upsert 시 유지(갱신 안 함) | — |

- `idx_briefs_date` UNIQUE — 같은 날 재실행 시 기존 행을 갱신(upsert). Notion 페이지는 중복 생성 가능(v1 한계).
- 쓰기 주체: **에이전트**(`agent/db.py:upsert_brief`). 백엔드는 `db.js:getBriefByDate` 로 SELECT 만 (ADR-0011).
- UI `BriefWidgetView`/`BriefCard` 가 `GET /api/brief/today` 로 조회 (FR-AGENT-04). 오늘 행 없으면 API 는 200 + `{brief:null}` (ADR-0025).

## 6. `sync_logs` — 동기화 로그

| 컬럼 | 타입 | 제약 | 의미 | 예시 |
|---|---|---|---|---|
| `id` | INTEGER | PK, auto | 식별자 | `1` |
| `service` | TEXT | NOT NULL, CHECK | 동기화 대상 `gmail`/`calendar`/`notion`/`supabase`/`classify` | `"gmail"` |
| `status` | TEXT | NOT NULL, CHECK | `success`/`failed` | `"failed"` |
| `last_sync` | TEXT | NOT NULL | 이 시도의 시각 (ISO8601) | — |
| `error_message` | TEXT | NULL 허용 | `status='failed'` 일 때만 채움 | `"401 Unauthorized"` |

- 인덱스: `idx_sync_service(service, last_sync)` — 서비스별 최근 동기화 조회 (FR-SYNC-03, NFR-OBS-03).
- 매 동기화 시도마다 1행 append (갱신 아님).
- `classify` = 에이전트 할일 자동 분류 배치 결과 (ADR-0029). 기존 파일 DB 는 `backend/db/index.js` 의 마이그레이션(`PRAGMA user_version` v1)이 CHECK 를 확장한다 — ADR-0018.

## 7. `objectives` — OKR 목표 (FR-OKR-01, ADR-0030)

분기/연간 목표. 사용자가 앱에서 CRUD 한다. 에이전트는 손대지 않는다.

| 컬럼 | 타입 | 제약 | 의미 | 예시 |
|---|---|---|---|---|
| `id` | INTEGER | PK, auto | 목표 식별자 | `1` |
| `title` | TEXT | NOT NULL | 목표 제목. 1~120자 (API 검증) | `"온보딩 완성도 높이기"` |
| `period` | TEXT | NOT NULL | 대상 기간. `YYYY` 또는 `YYYY-Q1`~`YYYY-Q4` (API 검증) | `"2026-Q1"` |
| `status` | TEXT | NOT NULL, 기본 `active`, CHECK | `active`/`done`/`archived` | `"active"` |
| `created_at` `updated_at` | TEXT | NOT NULL | ISO8601 | — |

- 인덱스: `idx_objectives_status(status)`.
- 대시보드(`GET /api/okr`)는 기본으로 `archived` 를 제외한다 (`?includeArchived=1` 로 포함).

## 8. `key_results` — OKR 핵심 결과 (FR-OKR-02, ADR-0030)

| 컬럼 | 타입 | 제약 | 의미 | 예시 |
|---|---|---|---|---|
| `id` | INTEGER | PK, auto | KR 식별자 | `3` |
| `objective_id` | INTEGER | NOT NULL, FK → `objectives(id)` `ON DELETE CASCADE` | 소속 목표. 생성 시 없는 목표면 **400** | `1` |
| `title` | TEXT | NOT NULL | KR 제목. 1~120자 | `"신규 사용자 첫날 완료율 80%"` |
| `target` | REAL | NOT NULL | 목표치. 0 이상 | `80` |
| `current` | REAL | NOT NULL, 기본 `0` | 현재치. SQL 예약어라 DDL 에서 항상 인용(`"current"`) | `50` |
| `unit` | TEXT | NULL 허용 | 단위. 트림 후 `''`→NULL, 12자 이하 | `"%"` / `null` |
| `project_id` | INTEGER | NULL 허용, FK → `projects(id)` `ON DELETE SET NULL` | 연결 프로젝트 (느슨 FK, ADR-0012) | `2` / `null` |
| `created_at` `updated_at` | TEXT | NOT NULL | ISO8601 | — |

- 인덱스: `idx_key_results_objective(objective_id)`, `idx_key_results_project(project_id)`.
- 달성률 `pct` 는 저장하지 않는다 — 조회 시 `target > 0 ? clamp(current/target,0,1) : 0` 으로 계산.

## 9. `kr_snapshots` — 월별 달성률 스냅샷 (FR-OKR-04)

백엔드가 월 1회 각 KR 의 그 시점 pct 를 UPSERT 한다 (기동 시 + `GET /api/okr/trend` 진입 시, 프로세스당 하루 1회 가드). 에이전트/launchd 미관여.

| 컬럼 | 타입 | 제약 | 의미 | 예시 |
|---|---|---|---|---|
| `id` | INTEGER | PK, auto | 식별자 | `1` |
| `key_result_id` | INTEGER | NOT NULL, FK → `key_results(id)` `ON DELETE CASCADE` | 대상 KR | `3` |
| `month` | TEXT | NOT NULL | 스냅샷 월 `YYYY-MM` | `"2026-07"` |
| `pct` | REAL | NOT NULL | 그 시점 달성률 0~1 | `0.62` |

- `UNIQUE (key_result_id, month)` — 같은 달 재적재는 갱신(UPSERT).
- 세 테이블 모두 `SCHEMA_VERSION` 을 올리지 않고 `CREATE TABLE IF NOT EXISTS` 로 매 오픈 시 반영한다 (P6 `task_tags` 선례).

---

## 10. `widget_instances` — 위젯 레이아웃 (🔶 제안, C5 단계 2)

> UI 상태다(도메인 데이터 아님). **1차는 SQLite 가 아니라 브라우저 `localStorage`** 에 `dashboard.layout.v1` 키로 저장한다.
> SQLite 이관은 재설치·다기기 요구가 생길 때 ([ADR-0021](../architecture/adr/ADR-0021-widget-layout-persistence.md)). 아직 `schema.sql` 에 없다.

| 컬럼 | 타입 | 제약 | 의미 | 예시 |
|---|---|---|---|---|
| `id` | INTEGER | PK, auto | 식별자 | `1` |
| `widget_type` | TEXT | NOT NULL | 레지스트리 타입 `tasks`/`projects`/`calendar`/`emails`/`brief`/`diagrams` | `"tasks"` |
| `x` `y` `w` `h` | INTEGER | NOT NULL | 그리드 좌표·크기 (단위: 열/행) | `0,0,4,6` |
| `z` | INTEGER | NOT NULL, DEFAULT 0 | 스택 순서 (클릭 시 최상단) | `3` |
| `minimized` | INTEGER | NOT NULL, DEFAULT 0, CHECK(0,1) | 최소화 여부 | `0` |
| `config` | TEXT | NOT NULL, DEFAULT '{}' | JSON — `{ theme:{bg,accent,radius,density,titlebar}, display:{...} }`. 화이트리스트 키만 ([ADR-0022](../architecture/adr/ADR-0022-per-widget-theming.md)) | `{"theme":{"accent":"#22c55e"}}` |
| `created_at` `updated_at` | TEXT | NOT NULL | ISO8601 | — |
| `user_id` | TEXT | (Week 10+) | 사용자별 레이아웃 | — |

- localStorage 형태: `{ version: 1, instances: [{ id, type, x,y,w,h, z, minimized, config }] }`.
- 손상·`version` 불일치 시 `widgets/defaultLayout.js` 로 폴백 (FR-WIDGET-04 AC-4).

---

## 관계 요약

```
projects (1) ──< (N) tasks        tasks.project_id FK, ON DELETE SET NULL (ADR-0012)
tasks (1) ──< (N) task_tags       PK(task_id, tag), ON DELETE CASCADE (ADR-0029)
objectives (1) ──< (N) key_results     ON DELETE CASCADE (ADR-0030)
key_results (1) ──< (N) kr_snapshots   UNIQUE(key_result_id, month), ON DELETE CASCADE
projects (0..1) ──< (N) key_results    key_results.project_id FK, ON DELETE SET NULL (느슨, ADR-0012)
briefs          독립 (날짜별 1건)
calendar_events 독립 (외부 캐시)
emails          독립 (외부 캐시)
sync_logs       독립 (append-only 로그)
widget_instances 독립 (UI 상태, 🔶 제안 — 1차 localStorage)
```

---

**작성:** 2026-09-02

