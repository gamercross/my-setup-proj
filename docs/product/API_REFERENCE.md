# 🔌 API 레퍼런스 (백엔드 REST)

> 백엔드 Express API 의 엔드포인트별 상세. 설계 개요는 [DESIGN.md](DESIGN.md) §5, 데이터 구조는 [DATA_DICTIONARY.md](DATA_DICTIONARY.md), 요구사항은 [requirements/](requirements/).
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
| `priority` | `high` \| `medium` \| `low` | 400 (도입 예정 — [현재 구현과의 차이](#현재-구현과의-차이)) |
| `status` (task) | `todo` \| `in_progress` \| `done` | 400 (도입 예정) |
| `progress` | 숫자, 0 ≤ n ≤ 100 | 400 `"progress 는 0~100 사이 숫자여야 합니다."` |
| `due_date` | `YYYY-MM-DD` 형식 | 400 (도입 예정) |

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
  "created_at": "2026-09-02T09:00:00.000Z",
  "updated_at": "2026-09-02T09:00:00.000Z"
}
```

### `GET /api/tasks` — 할일 목록 ✅

FR-TASK-02

**쿼리 파라미터** (🔷 필터는 FR-TASK-06, 예정)

| 이름 | 타입 | 필수 | 설명 |
|---|---|:---:|---|
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

**부작용:** `tasks` 에 1행 추가. `id`·`created_at`·`updated_at` 은 서버가 채운다(클라이언트 값 무시).

---

### `PUT /api/tasks/:id` — 할일 수정 (부분) ✅

FR-TASK-03, FR-TASK-04

- 보낸 필드만 병합, 나머지 유지. 허용 필드: `title`, `description`, `due_date`, `priority`, `status`.
- `updated_at` 은 항상 갱신.

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

**부작용:** `tasks` 에서 해당 행 제거.

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

### `DELETE /api/projects/:id` — 삭제 ✅

**응답 200** `{ "ok": true }` / **404** 없음.

---

## 캘린더 (calendar) 🔷 예정 — Week 5

### `GET /api/calendar/events` — 캐시된 일정

FR-CAL-01, FR-CAL-02

| 쿼리 | 설명 |
|---|---|
| `from` | ISO8601, 이 시각 이후 시작하는 일정 |
| `to` | ISO8601, 이 시각 이전 시작 |

**응답 200**
```json
{ "events": [ {
  "id": 1, "event_id": "abc@google.com", "title": "팀 미팅",
  "start_time": "2026-09-03T02:00:00Z", "end_time": "2026-09-03T03:00:00Z",
  "location": "회의실 A", "synced_at": "2026-09-03T00:00:00Z"
} ] }
```
- 데이터 출처: `calendar_events` 캐시 (agent 가 채움). 읽기 전용.

---

## 이메일 (mail) 🔷 예정 — Week 6

### `GET /api/mail/unread` — 캐시된 미읽은 메일

FR-MAIL-01

**응답 200**
```json
{ "emails": [ {
  "id": 1, "email_id": "18f9a...", "from_address": "prof@univ.ac.kr",
  "subject": "과제 안내", "snippet": "이번 주 과제는...",
  "received_at": "2026-09-02T01:00:00Z", "is_read": 0
} ] }
```

---

## 브리핑 (brief) 🔷 예정 — Week 7

### `GET /api/brief/today` — 오늘 브리핑

FR-AGENT-04

**응답 200**
```json
{ "brief": {
  "id": 1, "date": "2026-09-02",
  "content": "## 오늘의 우선순위\n1. ...",
  "notion_url": "https://notion.so/...", "created_at": "2026-09-02T08:00:05Z"
} }
```
**응답 404** — `{ "error": "오늘 브리핑이 아직 없습니다." }`
- 데이터 출처: `briefs` 테이블 (agent 가 매일 아침 upsert).

---

## 동기화 로그 (sync) 🔷 예정 — Week 6

### `GET /api/sync/logs` — 동기화 이력

FR-SYNC-03, NFR-OBS-03

| 쿼리 | 설명 |
|---|---|
| `service` | `gmail`\|`calendar`\|`notion`\|`supabase` 로 필터 |
| `limit` | 최대 반환 수 (기본 50) |

**응답 200**
```json
{ "logs": [ {
  "id": 12, "service": "gmail", "status": "failed",
  "last_sync": "2026-09-02T08:00:03Z", "error_message": "401 Unauthorized"
} ] }
```

---

## 다이어그램 (diagrams) 🔷 예정 — Week 4~5 (Phase C4)

### `GET /api/diagrams` — 문서 다이어그램 목록

FR-UI-05 · [ADR-0014](adr/ADR-0014-dashboard-diagram-viewer.md)

`docs/**/*.md` 안의 ```` ```mermaid ```` 코드블록을 추출해 반환한다. 파일시스템 읽기 전용
(`backend/src/services/diagrams.js`). DB·에이전트 관여 없음.

| 쿼리 | 설명 |
|---|---|
| `doc` | 특정 문서만 (예: `DESIGN` — 확장자·경로 제외 basename) |

**응답 200**
```json
{ "diagrams": [ {
  "doc": "DESIGN",
  "path": "docs/product/DESIGN.md",
  "index": 1,
  "title": "목표 아키텍처 (TO-BE)",
  "code": "flowchart TB\n  ..."
} ] }
```
- `title` = 블록 직전 최근접 heading 텍스트. 없으면 `"<doc> #<index>"`.
- `docs/` 를 찾지 못하면(패키지에 미동봉 등) `{ "diagrams": [] }` (200, 에러 아님).
- 클라이언트(`DiagramPanel.jsx`)가 `mermaid` 를 동적 import 해 SVG 로 렌더. 렌더 실패는
  블록 단위로 폴백(원문 코드 표시).

**응답 500** — `{ "error": "다이어그램을 불러오지 못했습니다." }`

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
| D1 | `priority`/`status` enum 위반 시 400 | 라우트 검증은 있으나 DB CHECK 매핑(→400)은 부분 | C2 (TC-DB-04, `isValidationError` 확장) |
| D2 | `due_date` 형식 검증 | 없음 | C2 |
| D3 | `PUT /tasks/:id` 빈 `title` 로 덮어쓰기 금지 | `updateTask` 가 허용 | B3~C2 (FR-TASK-04 AC-3) |
| ~~D4~~ | 데이터 영속 (재시작 후 유지) | ✅ 해소 — better-sqlite3 (B2, 2026-09-02, FR-TASK-05) | — |
| D5 | 쿼리 필터/정렬 | 미구현 | Week 4 (FR-TASK-06) |
| ~~D6~~ | CORS 화이트리스트 | ✅ 해소 — `middleware/cors.js` (C1, 2026-09-03) | — |
| ~~D7~~ | 요청 로깅 미들웨어 | ✅ 해소 — `middleware/requestLogger.js` (C1, 2026-09-03) | — |
| D8 | `calendar`/`mail`/`brief`/`sync` 라우트 | 없음 | Week 5~7 |
| D9 | `diagrams` 라우트 + `services/diagrams.js` | 없음 | Week 4~5 C4 (C1 이후) |

---

**작성:** 2026-09-02
