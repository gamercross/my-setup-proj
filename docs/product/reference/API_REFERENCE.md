# 🔌 API 레퍼런스 (백엔드 REST)

> 백엔드 Express API 의 엔드포인트별 상세. 설계 개요는 [DESIGN.md](../architecture/DESIGN.md) §5, 데이터 구조는 [DATA_DICTIONARY.md](DATA_DICTIONARY.md), 요구사항은 [requirements/](../requirements/).
> 이 문서와 실제 코드가 다르면 **코드가 맞고 이 문서를 고친다** — 단, "예정" 표시 엔드포인트는 아직 코드가 없다.

---

## 공통 규칙

| 항목 | 값 |
|---|---|
| Base URL | `http://localhost:{PORT}/api` (`PORT` 기본 `3000`) |
| 요청 본문 | `Content-Type: application/json` (`express.json()` 파싱) |
| 인증 | **현재 없음.** 로컬 단일 사용자 전제. 다중 사용자(FR-AUTH-02)는 Week 10+ |
| 응답 형식 | 항상 JSON |
| 목록 응답 | `{ "<도메인복수>": [ ... ] }` — 예: `{ "tasks": [...] }` |
| 단건 응답 | `{ "<도메인단수>": { ... } }` — 예: `{ "task": {...} }` |
| 삭제 응답 | `{ "ok": true }` |
| 오류 응답 | `{ "error": "<사람이 읽을 메시지>" }` (한국어) |
| CORS | 구현 완료 (C1, `backend/src/middleware/cors.js`, NFR-SEC-06). 허용 오리진: `http://localhost:5173`, `http://127.0.0.1:5173`, `null`(prod Electron `file://`). 그 외 오리진은 CORS 헤더 미부여 |
| 요청 로깅 | 모든 요청 1줄 (`METHOD path status ms`) — `backend/src/middleware/requestLogger.js` (C1, NFR-OBS-01) |
| 본문 크기 | `express.json({ limit: '100kb' })`. 초과 시 413 |

### 상태 코드 정책

| 코드 | 사용 |
|---|---|
| `200` | 조회·수정·삭제 성공 |
| `201` | 생성 성공 (`POST`) |
| `400` | 입력 검증 실패 (필수 누락, 타입/범위 위반, 잘못된 JSON) |
| `404` | 경로의 `:id` 리소스 없음 / 정의되지 않은 경로 |
| `413` | 요청 본문 크기 초과 (100KB) |
| `500` | 서버 내부 오류 (DB 쓰기 실패 등). 본문은 일반 메시지, 상세는 서버 로그 |

### 공통 검증 규칙 (NFR-SEC-07)

| 필드 | 규칙 | 위반 시 |
|---|---|---|
| `title` (task) | 필수, 트림 후 길이 ≥ 1 | 400 `"title 은 필수입니다."` |
| `name` (project) | 필수 | 400 `"name 은 필수입니다."` |
| `priority` | `high` \| `medium` \| `low` | 400 `"입력값이 허용된 값 범위를 벗어났습니다."` (DB CHECK → 400, `backend/src/errors.js`, C2) |
| `status` (task) | `todo` \| `in_progress` \| `done` | 400 (DB CHECK → 400, `errors.js`) |
| `status` (project) | `active` \| `done` \| `on_hold` | 400 `"입력값이 허용된 값 범위를 벗어났습니다."` (`PUT /api/projects/:id`, DB CHECK → 400) |
| `progress` | 숫자, 0 ≤ n ≤ 100 | 400 `"progress 는 0~100 사이 숫자여야 합니다."` |
| `project_id` (task) | 존재하는 프로젝트 id 또는 `null` | 400 `"연결할 프로젝트를 찾을 수 없습니다."` / `"project_id 는 프로젝트 id(정수) 또는 null 이어야 합니다."` |
| `due_date` | `YYYY-MM-DD` 형식 | 400 (도입 예정) |

**400 한국어 메시지 (C2 등록, `backend/src/errors.js`)**
- `입력값이 허용된 값 범위를 벗어났습니다.` — SQLite CHECK 위반 (priority/status enum, progress 범위)
- `연결할 프로젝트를 찾을 수 없습니다.` — 없는 `project_id` (라우트 사전 검증 또는 FK 위반)
- `project_id 는 프로젝트 id(정수) 또는 null 이어야 합니다.` — 타입 오류
- SQLite 영문 원문은 클라이언트에 노출하지 않는다.

---

## 구현 상태 범례

| 표시 | 의미 |
|---|---|
| ✅ 구현됨 | 코드 존재 (`backend/src/routes/`). 저장소는 **better-sqlite3** (`backend/src/db.js` → `db/index.js`, WAL, `DATABASE_PATH`) — B2 완료(2026-09-02) |
| 🔷 설계됨 | 명세만 존재. 코드 없음 |

---

# 엔드포인트

## `GET /` — 루트 헬스체크 ✅

앱 라우트가 아니라 서버 상태 확인용. `/api` 밖이다.

**응답 200**
```json
{
  "service": "ai-computer-os-backend",
  "status": "ok",
  "time": "2026-09-02T10:30:00.000Z"
}
```

---

## `GET /api/health` — API 헬스체크 ✅

**응답 200**
```json
{ "ok": true }
```

관련: 없음 (모니터링·연결 확인용, FR-UI-02 AC-5 에서 프론트가 호출)

---

## 할일 (tasks)

리소스 형태 (`task` 객체):
```json
{
  "id": 1,
  "title": "회의 자료 준비",
  "description": "3장 슬라이드 초안",
  "due_date": "2026-09-10",
  "priority": "high",
  "status": "todo",
  "project_id": null,
  "tags": ["공부", "시험"],
  "created_at": "2026-09-02T09:00:00.000Z",
  "updated_at": "2026-09-02T09:00:00.000Z"
}
```
- `project_id`: 연결된 프로젝트 id (정수) 또는 `null`(= 단독 할일). ADR-0012.
- `tags`: 문자열 배열(오름차순, 없으면 `[]`). FR-TASK-08 / ADR-0029. 수동·에이전트 태그를 합쳐 노출하며 `source` 는 싣지 않는다. 아래 태그 엔드포인트로만 변경되고 `PUT /api/tasks/:id` 로는 바뀌지 않는다.

### `GET /api/tasks` — 할일 목록 ✅

FR-TASK-02, FR-TASK-06

**쿼리 파라미터**

| 이름 | 타입 | 필수 | 설명 |
|---|---|:---:|---|
| `project_id` | number \| `"none"` | — | ✅ FR-TASK-06. 정수면 그 프로젝트의 할일만, `none`(또는 `null`)이면 단독 할일(`project_id` NULL)만. 없는 id 는 200 + 빈 목록, 양의 정수/`none` 이 아니면 400 |
| `status` | string | — | `todo`\|`in_progress`\|`done` 로 필터 (예정) |
| `priority` | string | — | `high`\|`medium`\|`low` 로 필터 (예정) |
| `due` | string | — | `today`\|`tomorrow`\|`overdue` (FR-TASK-07, 예정) |
| `sort` | string | — | `due_date`\|`priority`\|`created_at` (예정) |

**응답 200**
```json
{ "tasks": [ { "id": 1, "title": "...", "...": "..." } ] }
```
- 할일이 없으면 `{ "tasks": [] }` (200, 에러 아님).
- 현재 정렬: 생성 순(삽입 순).

**응답 500** — `{ "error": "할일을 불러오지 못했습니다." }`

---

### `GET /api/tasks/:id` — 할일 단건 ✅

FR-TASK (공통)

| 파라미터 | 설명 |
|---|---|
| `:id` (path) | 할일 id (정수) |

**응답 200** — `{ "task": { ... } }`
**응답 404** — `{ "error": "할일을 찾을 수 없습니다." }`

---

### `POST /api/tasks` — 할일 생성 ✅

FR-TASK-01

**요청 본문**

| 필드 | 타입 | 필수 | 기본값 |
|---|---|:---:|---|
| `title` | string | ✅ | — |
| `description` | string | — | `""` |
| `due_date` | string (`YYYY-MM-DD`) | — | `null` |
| `priority` | string | — | `"medium"` |
| `status` | string | — | `"todo"` |
| `project_id` | number \| null | — | `null` (ADR-0012) |

**요청 예시 (정상)**
```json
{ "title": "발표 준비", "description": "5장", "due_date": "2026-09-10", "priority": "high" }
```

**응답 201**
```json
{ "task": {
  "id": 2, "title": "발표 준비", "description": "5장",
  "due_date": "2026-09-10", "priority": "high", "status": "todo",
  "created_at": "2026-09-02T10:31:00.000Z", "updated_at": "2026-09-02T10:31:00.000Z"
} }
```

**요청 예시 (검증 실패)** — `title` 누락
```json
{ "description": "제목 없음" }
```
**응답 400** — `{ "error": "title 은 필수입니다." }`

**`project_id` 검증 400 (ADR-0012, C2)**
- 존재하지 않는 프로젝트: `{ "error": "연결할 프로젝트를 찾을 수 없습니다." }`
- 정수/`null` 이 아닌 값(예: `"1"`): `{ "error": "project_id 는 프로젝트 id(정수) 또는 null 이어야 합니다." }`

**부작용:** `tasks` 에 1행 추가. `id`·`created_at`·`updated_at` 은 서버가 채운다(클라이언트 값 무시).

---

### `PUT /api/tasks/:id` — 할일 수정 (부분) ✅

FR-TASK-03, FR-TASK-04

- 보낸 필드만 병합, 나머지 유지. 허용 필드: `title`, `description`, `due_date`, `priority`, `status`, `project_id`.
- `updated_at` 은 항상 갱신.
- `project_id`: 존재하는 프로젝트 id 또는 `null`(연결 해제). 그 외 값은 400 (POST 와 동일한 3종 메시지, 아래).
- 검증 순서: 없는 `:id` → 404 를 `project_id` 검증(400)보다 먼저 반환.

**요청 예시** — 완료 토글
```json
{ "status": "done" }
```
**응답 200** — `{ "task": { "...": "...", "status": "done", "updated_at": "..." } }`

**응답 404** — `{ "error": "할일을 찾을 수 없습니다." }`
**응답 400** — 잘못된 `priority`/`status`/`due_date` (검증 도입 후)

---

### `DELETE /api/tasks/:id` — 할일 삭제 ✅

FR-TASK-04

**응답 200** — `{ "ok": true }`
**응답 404** — `{ "error": "할일을 찾을 수 없습니다." }`

**부작용:** `tasks` 에서 해당 행 제거. 연결된 `task_tags` 도 함께 삭제된다 (`ON DELETE CASCADE`).

---

### `POST /api/tasks/:id/tags` — 태그 추가 ✅

FR-TASK-08 / ADR-0029

**요청 본문** — `{ "tag": "공부" }` (트림 후 1~20자, 개행·콤마 불가)

**응답 201** — `{ "task": { ..., "tags": ["공부"] } }` (갱신된 할일 전체)
- 이미 있는 태그면 멱등(201, 목록 불변).

**응답 400** — `{ "error": "태그는 1~20자여야 합니다." }`
**응답 404** — `{ "error": "할일을 찾을 수 없습니다." }`
**응답 500** — `{ "error": "태그를 저장하지 못했습니다." }`

---

### `DELETE /api/tasks/:id/tags/:tag` — 태그 삭제 ✅

FR-TASK-08 / ADR-0029. `:tag` 는 URL 인코딩(한글 등). Express 가 자동 디코드한다.

**응답 200** — `{ "task": { ..., "tags": [...] } }`
- 없던 태그를 지워도 200(멱등).

**응답 404** — `{ "error": "할일을 찾을 수 없습니다." }`
**응답 500** — `{ "error": "태그를 삭제하지 못했습니다." }`

---

## 프로젝트 (projects)

리소스 형태 (`project` 객체):
```json
{
  "id": 1, "name": "AI OS 실습", "notion_id": null,
  "progress": 40, "status": "active",
  "created_at": "2026-09-02T09:00:00.000Z", "updated_at": "2026-09-02T09:00:00.000Z"
}
```

### `GET /api/projects` — 목록 ✅ · `GET /api/projects/:id` — 단건 ✅

FR-PROJ-01, FR-PROJ-02

- 목록: `{ "projects": [ ... ] }`, 없으면 `[]`.
- 단건 없음: 404 `{ "error": "프로젝트를 찾을 수 없습니다." }`

### `POST /api/projects` — 생성 ✅

FR-PROJ-01

| 필드 | 타입 | 필수 | 기본값 |
|---|---|:---:|---|
| `name` | string | ✅ | — |
| `progress` | number (0–100) | — | `0` |
| `status` | string | — | `"active"` |
| `notion_id` | string | — | `null` |

**요청 예시**
```json
{ "name": "캘린더 연동", "progress": 10 }
```
**응답 201** — `{ "project": { ... } }`
**응답 400** — `{ "error": "name 은 필수입니다." }` / `{ "error": "progress 는 0~100 사이 숫자여야 합니다." }`

### `PUT /api/projects/:id` — 수정 ✅

FR-PROJ-02

- 허용 필드: `name`, `progress`, `status`, `notion_id`.
- 없는 `:id` 는 `progress` 값과 무관하게 **404 우선**.
- `progress` 범위 위반 → 400.
- `status` 허용값(`active`/`done`/`on_hold`) 밖 → 400 `"입력값이 허용된 값 범위를 벗어났습니다."` (DB CHECK → 400, `errors.js`, C2).

### `DELETE /api/projects/:id` — 삭제 ✅

**응답 200** `{ "ok": true }` / **404** 없음.
**부작용:** 하위 할일의 `project_id` 가 `null` 로 설정된다 (ADR-0012 `ON DELETE SET NULL`). 할일은 삭제되지 않음.

---

## 캘린더 (calendar) ✅ C3 (더미 데이터)

### `GET /api/calendar/events` — 일정 목록

FR-CAL-01, FR-CAL-02

| 쿼리 | 설명 |
|---|---|
| `from` | ISO8601, 이 시각 이후 시작하는 일정. 미지정 시 하한 없음. 파싱 불가 시 400 |
| `to` | ISO8601, 이 시각 이전 시작. 미지정 시 상한 없음. 파싱 불가 시 400 |

- 경계 포함. `from > to` 는 400 이 아니라 200 (유효 `start_time` 일정 0건).
- `start_time` 이 null/미정인 일정은 `from`/`to` 와 무관하게 항상 포함되며 목록 맨 뒤에 온다.
- 정렬: `start_time` 오름차순, null 은 맨 뒤.

**응답 200**
```json
{ "events": [ {
  "id": 1, "event_id": "abc@google.com", "title": "팀 미팅",
  "start_time": "2026-09-03T02:00:00Z", "end_time": "2026-09-03T03:00:00Z",
  "location": "회의실 A", "synced_at": "2026-09-03T00:00:00Z"
} ] }
```

**응답 400** (from/to 파싱 불가)
```json
{ "error": "from 은 ISO8601 형식이어야 합니다." }
```

- 데이터 출처: ✅ **`calendar_events` 캐시 테이블** (agent `sync.py` 가 채움 — [ADR-0011](../architecture/adr/ADR-0011-agent-backend-db-access.md)). 백엔드는 SELECT 만. 동기화 전이면 `{ "events": [] }`. 로컬 데모 데이터는 `scripts/seed-demo.js` 로 채운다.

---

## 이메일 (mail) ✅

### `GET /api/mail/unread` — 캐시된 미읽은 메일

FR-MAIL-01

| 쿼리 | 설명 |
|---|---|
| `limit` | 1 이상의 정수. 최대 반환 개수 (기본 50). 그 외 값은 400 |

- `is_read = 0` 인 메일만, `received_at` 내림차순(최신 먼저).
- 동기화 전이면 `{ "emails": [] }` (200).
- 데이터 출처: ✅ **`emails` 캐시 테이블** (agent `sync.py` 가 채움 — [ADR-0011](../architecture/adr/ADR-0011-agent-backend-db-access.md)). 백엔드는 SELECT 만. 보내기·읽음 처리 없음.

**응답 200**
```json
{ "emails": [ {
  "id": 1, "email_id": "18f9a...", "from_address": "prof@univ.ac.kr",
  "subject": "과제 안내", "snippet": "이번 주 과제는...",
  "received_at": "2026-09-02T01:00:00Z", "is_read": 0, "synced_at": "2026-09-02T02:00:00Z"
} ] }
```

**응답 400** — `{ "error": "limit 은 1 이상의 정수여야 합니다." }`

---

## 브리핑 (brief) ✅ Week 7 (D3)

### `GET /api/brief/today` — 오늘 브리핑

FR-AGENT-04

**응답 200** (있을 때)
```json
{ "brief": {
  "id": 1, "date": "2026-09-02",
  "content": "오늘의 우선순위 TOP 3\n1. ...",
  "notion_url": "https://notion.so/...", "created_at": "2026-09-02T08:00:05Z"
} }
```
**응답 200** (오늘 행 없음) — `{ "brief": null }` (404 아님 — [ADR-0025](../architecture/adr/ADR-0025-brief-empty-response.md))
- `content` 는 plain text 다. 클라이언트는 pre-wrap 으로 렌더한다(마크다운 파싱 안 함).
- `notion_url` 은 `null` 일 수 있다.
- "오늘"은 서버 로컬 시각 기준 `YYYY-MM-DD`.
- 데이터 출처: `briefs` 테이블 (agent 가 매일 아침 upsert — 백엔드는 SELECT 만).

---

## 동기화 (sync)

### `GET /api/sync/health` — Supabase 외부 연결 진단 ✅ 구현 (2026-09-06)

ADR-0008 후속. 외부 연결 진단 **전용**이다. Supabase 클라이언트 배선만 확인하며 동기화·인증·`user_id` 는 없다(Week 10 이후).

- **항상 200** 이다. Supabase 실패도 `{ "supabase": "error" }` 200 으로 응답하며 절대 5xx 가 아니다.
- 응답에 `SUPABASE_KEY` 값·`SUPABASE_URL` 경로/쿼리를 포함하지 않는다 (host 만 노출).
- 미설정(`SUPABASE_URL`/`SUPABASE_KEY` 없음) 시 네트워크에 접촉하지 않고 즉시 `unconfigured`.

| `supabase` | 의미 |
|---|---|
| `ok` | 연결됨 (프로브 테이블이 없어도 정상으로 판정) |
| `unconfigured` | `SUPABASE_URL`/`SUPABASE_KEY` 미설정 — 네트워크 미접촉 |
| `error` | 인증 실패 / 네트워크 도달 불가·시간 초과 / 기타 (`detail` 참고) |

**응답 200**
```json
{ "supabase": "ok", "detail": "연결됨 (프로브 테이블 없음 — 정상)", "host": "abcd.supabase.co", "checkedAt": "2026-09-06T00:00:00.000Z" }
```

### `GET /api/sync/logs` — 동기화 이력 ✅ 구현 — Phase D2-a

FR-SYNC-03, NFR-OBS-03

`sync_logs` 를 최신 순(id DESC)으로 반환한다. 읽기 전용 —
`sync_logs` 쓰기는 에이전트(`agent/db.py:log_sync`)만 한다.

| 쿼리 | 설명 |
|---|---|
| `service` | `gmail`\|`calendar`\|`notion`\|`supabase` 로 필터. 그 외 값은 400 |
| `limit` | 최대 반환 수 (기본 50). 1 이상의 정수 아니면 400 |

**응답 200**
```json
{ "logs": [ {
  "id": 12, "service": "gmail", "status": "failed",
  "last_sync": "2026-09-02T08:00:03Z", "error_message": "401 Unauthorized"
} ] }
```

**응답 400** — `{ "error": "service 는 gmail|calendar|notion|supabase 중 하나여야 합니다." }`

---

## 에이전트 (agent) ✅ 구현 — P7 (2026-09-08)

FR-AGENT-08 · [ADR-0011](../architecture/adr/ADR-0011-agent-backend-db-access.md) · [ADR-0013](../architecture/adr/ADR-0013-dashboard-agent-queue.md)

에이전트 활동 위젯용. 백엔드는 파이썬 프로세스를 직접 실행하지 않는다 —
"지금 실행"은 `agent/.triggers/run-now` 플래그 파일만 쓰고, launchd `WatchPaths` 가 감지해
`agent/trigger.py` → `sync.sync_all()` 을 실행한다.

### `GET /api/agent/activity` — 활동 요약

`sync_logs`(읽기 전용) + Supabase 연결 상태 + 다음 예약 시각 + "지금 실행" 대기 상태를 조립한다.
health 확인이 실패해도 200 이다. `sync_logs` 조회 실패만 500.

| 쿼리 | 설명 |
|---|---|
| `limit` | 로그 최대 수 (기본 10, 상한 50). 1 이상의 정수 아니면 400 |

**응답 200**
```json
{
  "logs": [ { "id": 12, "service": "gmail", "status": "failed",
              "last_sync": "2026-09-08T07:30:03Z", "error_message": "401 Unauthorized" } ],
  "health": { "supabase": "unconfigured", "detail": "SUPABASE_URL/SUPABASE_KEY 미설정", "host": null },
  "nextRun": { "at": "2026-09-09T07:30:00.000Z", "hour": 7, "minute": 30, "source": "schedule" },
  "runNow": { "pending": false, "requestedAt": null, "available": true },
  "checkedAt": "2026-09-08T09:00:00.000Z"
}
```
- `nextRun` 은 plist 를 파싱하지 않고 `.env` 의 `DAILY_BRIEF_HOUR`/`DAILY_BRIEF_MINUTE`(기본 07:30) 기준.
- `runNow.available` 은 `agent/` 폴더(또는 `AGENT_PATH`)를 찾은 경우에만 true.

### `POST /api/agent/run-now` — 지금 실행 요청

본문은 무시한다. 트리거 플래그 파일을 만든다(멱등 — 이미 있으면 기존 요청 시각 유지).

**응답 200**
```json
{ "ok": true, "pending": true, "requestedAt": "2026-09-08T09:00:00.000Z",
  "alreadyPending": false, "note": "에이전트가 다음 감지 시 실행합니다." }
```

**응답 503** — `{ "error": "에이전트 폴더를 찾을 수 없어 실행을 요청할 수 없습니다." }`
**응답 500** — `{ "error": "지금 실행 요청을 저장하지 못했습니다." }` (파일 IO 실패)

---

## 다이어그램 (diagrams) ✅ 구현 — Phase C4 (2026-09-06)

### `GET /api/diagrams` — 문서 다이어그램 목록

FR-UI-05 · [ADR-0014](../architecture/adr/ADR-0014-dashboard-diagram-viewer.md)

`docs/**/*.md` 안의 ```` ```mermaid ```` 코드블록을 추출해 반환한다. 파일시스템 읽기 전용
(`backend/src/services/diagrams.js`). DB·에이전트 관여 없음.

| 쿼리 | 설명 |
|---|---|
| `doc` | 특정 문서만 (예: `DESIGN` — 확장자·경로 제외 basename, 대소문자 무시 정확 일치) |

**응답 200**
```json
{ "diagrams": [ {
  "doc": "DESIGN",
  "path": "docs/product/architecture/DESIGN.md",
  "index": 1,
  "title": "목표 아키텍처 (TO-BE)",
  "code": "flowchart TB\n  ..."
} ] }
```
- `title` = 블록 직전 최근접 heading 텍스트. 없으면 `"<doc> #<index>"`.
- `docs/` 를 찾지 못하면(패키지에 미동봉 등) `{ "diagrams": [] }` (200, 에러 아님).
- 정렬은 `path` 오름차순 → `index` 오름차순. 스캔 상한: 깊이 8 · 파일 500 · 파일당 1MB · 블록 300.
  `node_modules`·`.git`·`diagrams/`·숨김 디렉터리는 건너뛴다.
- 원천 경로 우선순위: `DOCS_PATH`(있으면 이것만) → 저장소 `docs/` → `process.resourcesPath/docs`(패키지).
- 클라이언트(`DiagramPanel.jsx`)가 `mermaid` 를 동적 import 해 SVG 로 렌더. 렌더 실패는
  블록 단위로 폴백(원문 코드 표시).

**응답 500** — `{ "error": "다이어그램을 불러오지 못했습니다." }`

---

## OKR (okr) ✅ 구현 — P8 (2026-09-08)

FR-OKR-01~04 · [ADR-0030](../architecture/adr/ADR-0030-okr-data-model.md) · 서비스 `backend/src/services/okr.js`

달성률 공식: `krPct = target > 0 ? clamp(current/target, 0, 1) : 0`,
`objectivePct = 하위 KR pct 산술 평균`. 소수 셋째 자리 반올림. 버킷: `pct ≥ 0.9 high` · `≥ 0.4 mid` · 그 외 `low`.

### `GET /api/okr` — 대시보드 ✅

| 쿼리 | 설명 |
|---|---|
| `includeArchived` | `1`·`true` 면 `status='archived'` 목표 포함 (기본 제외) |

**응답 200**
```json
{
  "objectives": [ { "id": 1, "title": "...", "period": "2026-Q1", "status": "active", "pct": 0.62,
                    "keyResults": [ { "id": 3, "title": "...", "target": 100, "current": 62,
                                     "unit": "건", "pct": 0.62, "project_id": null } ] } ],
  "summary": { "krAvgPct": 0.62, "objectiveCount": 2, "keyResultCount": 4,
               "bucket": { "high": 1, "mid": 2, "low": 1 } }
}
```

### `GET /api/okr/trend` — 월별 KR 평균 달성률 추이 ✅

진입 시 이번 달 스냅샷을 UPSERT 한다 (적재 주체 = 백엔드, 프로세스당 하루 1회 가드). 스냅샷 실패는 200 을 막지 않는다.

**응답 200** — `{ "points": [ { "month": "2026-07", "krAvgPct": 0.41 }, ... ] }` (month 오름차순)

### `POST /api/okr/objectives` ✅ · `PUT /api/okr/objectives/:id` ✅ · `DELETE /api/okr/objectives/:id` ✅

| 필드 | 규칙 |
|---|---|
| `title` | 필수, 1~120자 |
| `period` | 필수, `YYYY` 또는 `YYYY-Q1`~`YYYY-Q4` |
| `status` | 선택, `active`·`done`·`archived` |

- POST → `201 { "objective": {...} }`. PUT 은 부분 수정 → `200 { "objective": {...} }`. DELETE → `200 { "ok": true }` (하위 KR·스냅샷 CASCADE).
- 없는 id 수정/삭제 → 404. 검증 실패 → 400.

### `POST /api/okr/key-results` ✅ · `PUT /api/okr/key-results/:id` ✅ · `DELETE /api/okr/key-results/:id` ✅

| 필드 | 규칙 |
|---|---|
| `objective_id` | 생성 시 필수. 없는 목표면 **400** (404 아님) |
| `title` | 필수, 1~120자 |
| `target` | 0 이상의 숫자 (생성 시 필수) |
| `current` | 숫자 (기본 0) |
| `unit` | 선택, 트림 후 `''`→null, 12자 이하 |
| `project_id` | 선택, 느슨 FK (없는 프로젝트면 400) |

- POST → `201 { "keyResult": {...} }`. PUT 부분 수정 → `200 { "keyResult": {...} }`. DELETE → `200 { "ok": true }` (하위 스냅샷 CASCADE).

---

## 주간 플래너 (planner) ✅ 구현 — P8 (2026-09-08)

FR-OKR-05 · 서비스 `backend/src/services/planner.js` · 읽기 전용 SQL 집계 (Claude 호출 없음)

### `GET /api/planner/weekly` — 주간 요약 ✅

`tasks.due_date` 를 ISO 주(월요일 시작, 서버 로컬 시간대)로 버킷팅한다. `due_date` 없는 할 일은 제외.

| 쿼리 | 설명 |
|---|---|
| `limit` | `thisWeek`·`nextWeek` items 최대 수 (기본 50) |

**응답 200**
```json
{
  "lastWeek": { "done": 5, "total": 8 },
  "thisWeek": { "done": 2, "total": 6,
                "items": [ { "id": 1, "title": "...", "due_date": "2026-09-09",
                             "priority": "high", "status": "todo", "tags": [] } ] },
  "nextWeek": { "total": 3, "items": [ ... ] }
}
```
- `lastWeek` 는 카운트만 (items 없음). 정렬은 `due_date` → `id` 오름차순.

---

# curl 예시 세트

```bash
BASE=http://localhost:3000/api

# 헬스
curl -s $BASE/health

# 할일 생성 → 목록 → 완료 토글 → 삭제
TID=$(curl -s -X POST $BASE/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"curl 테스트","priority":"high"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["task"]["id"])')

curl -s $BASE/tasks
curl -s -X PUT $BASE/tasks/$TID -H 'Content-Type: application/json' -d '{"status":"done"}'
curl -s -X DELETE $BASE/tasks/$TID

# 검증 실패 (400)
curl -s -X POST $BASE/tasks -H 'Content-Type: application/json' -d '{}'

# 없는 리소스 (404)
curl -s $BASE/tasks/99999
```

---

# 현재 구현과의 차이

명세(위)와 실제 코드(`backend/src/`)의 갭 (2026-09-03 기준):

| # | 명세 | 현재 코드 | 해소 |
|---|---|---|---|
| D1 ✅ | `priority`/`status`/`progress` enum·범위 위반 시 400 | ✅ 해소 — `backend/src/errors.js` 가 SQLite CHECK/NOTNULL/FK → 400 + 한국어로 매핑 (C2, 2026-09-03, TC-DB-04a~d) | — |
| D2 | `due_date` 형식 검증 | 없음 | 이월 (FR-TASK-06 즈음) |
| D3 | `PUT /tasks/:id` 빈 `title` 로 덮어쓰기 금지 | `updateTask` 가 허용 | 이월 (FR-TASK-04 AC-3) |
| D4 ✅ | 데이터 영속 (재시작 후 유지) | ✅ 해소 — better-sqlite3 (B2, 2026-09-02, FR-TASK-05) | — |
| D5 | 쿼리 필터/정렬 | 미구현 | Week 4 (FR-TASK-06) |
| D6 ✅ | CORS 화이트리스트 | ✅ 해소 — `middleware/cors.js` (C1, 2026-09-03) | — |
| D7 ✅ | 요청 로깅 미들웨어 | ✅ 해소 — `middleware/requestLogger.js` (C1, 2026-09-03) | — |
| D8 | `mail`/`brief`/`sync` 라우트 | `brief`·`sync` ✅ (D3·D2-a), `mail` 미구현 | `mail` 은 Week 5 이월 |
| D9 | `diagrams` 라우트 + `services/diagrams.js` | ✅ 구현 (C4, 2026-09-06) — prod `docs/` 동봉 설정은 E3 이월 | — |

---

**작성:** 2026-09-02
