# 🗃️ 데이터 사전 (Data Dictionary)

> `backend/db/schema.sql` 의 모든 테이블·컬럼을 필드 단위로 설명한다.
> **DDL 의 단일 원천은 [`backend/db/schema.sql`](../../backend/db/schema.sql)** — 이 문서는 의미·규칙만 다루고 DDL 을 복붙하지 않는다.
> 용어는 [GLOSSARY.md](GLOSSARY.md), 관계·설계 의도는 [DESIGN.md](DESIGN.md) §4.

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

## 5. `briefs` — 일일 브리핑

| 컬럼 | 타입 | 제약 | 의미 | 예시 |
|---|---|---|---|---|
| `id` | INTEGER | PK, auto | 식별자 | `1` |
| `date` | TEXT | NOT NULL, UNIQUE 인덱스 | 브리핑 대상 날짜 (`YYYY-MM-DD`). **하루 1건** | `"2026-09-02"` |
| `content` | TEXT | NOT NULL | Claude 가 생성한 브리핑 본문(마크다운) | `"## 오늘의 우선순위\n1. ..."` |
| `notion_url` | TEXT | NULL 허용 | Notion 에 저장된 페이지 URL. 저장 전/실패 시 NULL (FR-AGENT-03) | `"https://notion.so/..."` |
| `created_at` | TEXT | NOT NULL | 생성 시각 | — |

- `idx_briefs_date` UNIQUE — 같은 날 재실행 시 기존 행을 갱신(upsert).
- UI `BriefCard` 가 `GET /api/brief/today` 로 조회 (FR-AGENT-04).

## 6. `sync_logs` — 동기화 로그

| 컬럼 | 타입 | 제약 | 의미 | 예시 |
|---|---|---|---|---|
| `id` | INTEGER | PK, auto | 식별자 | `1` |
| `service` | TEXT | NOT NULL, CHECK | 동기화 대상 `gmail`/`calendar`/`notion`/`supabase` | `"gmail"` |
| `status` | TEXT | NOT NULL, CHECK | `success`/`failed` | `"failed"` |
| `last_sync` | TEXT | NOT NULL | 이 시도의 시각 (ISO8601) | — |
| `error_message` | TEXT | NULL 허용 | `status='failed'` 일 때만 채움 | `"401 Unauthorized"` |

- 인덱스: `idx_sync_service(service, last_sync)` — 서비스별 최근 동기화 조회 (FR-SYNC-03, NFR-OBS-03).
- 매 동기화 시도마다 1행 append (갱신 아님).

---

## 관계 요약

```
projects (1) ──< (N) tasks        tasks.project_id FK, ON DELETE SET NULL (ADR-0012)
briefs          독립 (날짜별 1건)
calendar_events 독립 (외부 캐시)
emails          독립 (외부 캐시)
sync_logs       독립 (append-only 로그)
```

---

**작성:** 2026-09-02
