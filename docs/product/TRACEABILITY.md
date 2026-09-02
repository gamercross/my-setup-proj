# 🔗 추적 매트릭스 (Traceability)

> 요구사항 → 갭 → 설계 → 구현 단계 → 테스트 → 코드 를 한 줄로 잇는다.
> 기능 완료 시 `finisher` 가 이 문서의 **상태** 열과 코드 위치를 갱신한다 ([GIT_WORKFLOW.md](../setup/GIT_WORKFLOW.md)).
> 요구사항 [requirements/](requirements/) · 갭 [AS_IS.md](AS_IS.md) §4 · 설계 [DESIGN.md](DESIGN.md)/[adr/](adr/) · 테스트 [TEST_PLAN.md](TEST_PLAN.md).

상태: ⏳ 예정 · 🚧 진행(일부) · ✅ 완료

---

## 1. 갭(G) → 요구사항 → 단계

[AS_IS.md](AS_IS.md) §4 의 갭이 어느 요구사항·Phase 로 닫히는가.

| 갭 | 내용 | 닫는 요구사항 | Phase | 상태 |
|---|---|---|---|:---:|
| G1 | React 미연결 (번들러 없음) | FR-UI-02 | B1 | ✅ (Vite + `renderer.jsx` 마운트, 2026-09-02) |
| G2 | DB 영속성 없음 (인메모리) | FR-TASK-05 | B2 | ⏳ |
| G3 | 프론트↔백엔드 연결 코드 0 | FR-TASK-01~04, FR-UI-01 | B3 | ⏳ |
| G4 | 로컬 환경 미검증 | NFR-TEST-04 | A2 | ✅ (`verify.sh` 12/0/0, 2026-09-02) |
| G5 | 경로 이관 변경분 미커밋 | — | A1 | ✅ (`fc4404c`) |
| G6 | 자동화 테스트 없음 | NFR-TEST-01~03 | A3 | ✅ (backend 15 + agent 3, CI 연결, 2026-09-02) |
| G7 | 외부 API 스텁 | FR-CAL, FR-MAIL, FR-PROJ-03 | C3, D2 | ⏳ |
| G8 | 다중 사용자·Supabase·Docker 미착수 | FR-AUTH-02, FR-SYNC, NFR-DEPLOY | E1~E3 | ⏳ |

## 2. Week ↔ Phase

[DESIGN.md](DESIGN.md) §8 대응표 참조. 요약: A=W1~2, B=W2~3, C=W4~5, D=W6~7, E=W9~13.

---

## 3. 기능 요구사항 (FR)

| FR | 갭 | 설계 / ADR | Phase·단계 | 테스트 | 코드 위치 | 상태 |
|---|---|---|---|---|---|:---:|
| FR-TASK-01 | G3 | API_REFERENCE `POST /tasks`, [ADR-0004](adr/ADR-0004-front-back-http-rest.md) | B3 | TC-TASK-01~03 | `backend/src/routes/tasks.js`, `frontend/.../TaskForm.jsx` | 🚧 |
| FR-TASK-02 | G3 | UI_SPEC §3.2 | B3 | TC-TASK-04,05 | `routes/tasks.js`, `components/TaskList.jsx` | 🚧 |
| FR-TASK-03 | G3 | API_REFERENCE `PUT /tasks/:id` | B3 | TC-TASK-06 | `routes/tasks.js`, `Dashboard.jsx` | 🚧 |
| FR-TASK-04 | G3 | API_REFERENCE | B3 | TC-TASK-07~11 | `routes/tasks.js` | 🚧 |
| FR-TASK-05 | G2 | [ADR-0002](adr/ADR-0002-local-db-better-sqlite3.md), [ADR-0003](adr/ADR-0003-schema-single-file.md), [ADR-0009](adr/ADR-0009-sqlite-file-location.md) | B2 | TC-DB-01~03 | `backend/db/`, `backend/src/db.js` | ⏳ |
| FR-TASK-06 | — | API_REFERENCE 쿼리 파라미터 | C (W4) | TC-TASK-12 | `routes/tasks.js`, `db.js` | ⏳ |
| FR-TASK-07 | — | requirements/TASK.md | C (W5) | — | `routes/tasks.js` | ⏳ |
| FR-PROJ-01 | G3 | API_REFERENCE `/projects` | C2 | TC-PROJ-01~03,06 | `backend/src/routes/projects.js` | 🚧 |
| FR-PROJ-02 | G3 | UI_SPEC §3.3, [ADR-0012](adr/ADR-0012-task-project-link.md) | C2 | TC-PROJ-04,05 | `routes/projects.js`, `components/ProjectCard.jsx` | 🚧 |
| FR-PROJ-03 | G7 | [ADR-0006](adr/ADR-0006-agent-owns-external-apis.md) | D2 | — | `agent/services/notion.py` | ⏳ |
| FR-PROJ-04 | G7 | DATA_DICTIONARY `projects.notion_id` | D2 | — | `agent/services/notion.py` | ⏳ |
| FR-CAL-01 | G7 | API_REFERENCE `/calendar/events`, [ADR-0006](adr/ADR-0006-agent-owns-external-apis.md) | C3, D2 | — | `agent/services/calendar.py`, `routes/calendar.js`(신규) | ⏳ |
| FR-CAL-02 | — | UI_SPEC §3.4 | C3 | — | `components/CalendarWidget.jsx`(신규) | ⏳ |
| FR-CAL-03 | — | DATA_DICTIONARY `calendar_events` | C3 | — | `agent/db.py` | ⏳ |
| FR-MAIL-01 | G7 | API_REFERENCE `/mail/unread`, [ADR-0006](adr/ADR-0006-agent-owns-external-apis.md) | D2 | — | `agent/services/gmail.py` | ⏳ |
| FR-MAIL-02 | G8 | — | E (W9) | — | `agent/services/gmail.py` | ⏳ |
| FR-MAIL-03 | G8 | — | E (W9) | — | `components/EmailView.jsx`(신규) | ⏳ |
| FR-AGENT-01 | G7 | DESIGN §7 (시퀀스), [ADR-0011](adr/ADR-0011-agent-backend-db-access.md) | D1 | TC-AGENT-01,02 | `agent/daily_brief.py`, `agent/db.py` | 🚧 |
| FR-AGENT-02 | — | DESIGN §7, CONVENTIONS §4 | D1 | TC-AGENT-06 | `agent/services/claude.py` | 🚧 |
| FR-AGENT-03 | G7 | requirements/AGENT.md | D3 | TC-AGENT-04 | `agent/services/notion.py` | ⏳ |
| FR-AGENT-04 | — | API_REFERENCE `/brief/today` | D3 | TC-AGENT-05 | `routes/brief.js`(신규), `components/BriefCard.jsx`(신규) | ⏳ |
| FR-AGENT-05 | — | [ADR-0007](adr/ADR-0007-schedule-launchd-cron.md) | D3 | — | `scripts/`, plist | ⏳ |
| FR-AGENT-06 | — | DESIGN §7, NFR-REL-02 | D1 | TC-AGENT-03 | `agent/daily_brief.py` | 🚧 |
| FR-AGENT-07 | — | requirements/AGENT.md | E (W11) | — | `agent/schedule_advisor.py`(신규) | ⏳ |
| FR-SYNC-01 | G8 | [ADR-0008](adr/ADR-0008-supabase-deferred.md) | E2 | — | 신규 동기화 모듈 | ⏳ |
| FR-SYNC-02 | G8 | [ADR-0008](adr/ADR-0008-supabase-deferred.md) | E2 | — | 동상 | ⏳ |
| FR-SYNC-03 | G7 | API_REFERENCE `/sync/logs`, DATA_DICTIONARY `sync_logs` | D2 | — | `agent/db.py`, `routes/sync.js`(신규) | ⏳ |
| FR-AUTH-01 | G7 | NFR-SEC-05 | D2 | TC-UI-06 | `agent/auth/google_oauth.py`(신규) | ⏳ |
| FR-AUTH-02 | G8 | [ADR-0008](adr/ADR-0008-supabase-deferred.md) | E1 | — | 신규 | ⏳ |
| FR-AUTH-03 | — | requirements(예정) | E1 | — | 신규 | ⏳ |
| FR-UI-01 | G3 | UI_SPEC §2, DESIGN §3 (flowchart) | B3, C, D3 | TC-UI-02 | `components/Dashboard.jsx` | 🚧 |
| FR-UI-02 | G1 | [ADR-0001](adr/ADR-0001-frontend-react-vite.md), [ADR-0010](adr/ADR-0010-vite-dev-vs-build.md), UI_SPEC §7 | B1 | TC-UI-01,05,07,08 | `frontend/src/{renderer.jsx,vite.config.js,main.js,App.jsx}` | ✅ (AC-5 는 에러표시 수준, 실제 200 은 CORS C1 대기) |
| FR-UI-03 | — | requirements/UI.md | W2 (완료) | TC-UI-04 | `frontend/src/main.js` | ✅ |
| FR-UI-04 | — | UI_SPEC §3.6 | B3 | TC-UI-02 | `components/ErrorBanner.jsx`(신규), `api/client.js` | ⏳ |

---

## 4. 비기능 요구사항 (NFR) — 주요

| NFR | 설계 / 수단 | Phase | 검증 | 상태 |
|---|---|---|---|:---:|
| NFR-SEC-01 | `.gitignore` `.env`, [ENV_REFERENCE.md](../setup/ENV_REFERENCE.md) | 상시 | `security-review`, grep | ✅ |
| NFR-SEC-03 | Claude 키 백엔드/에이전트 전용, `preload.js` 화이트리스트 | B1 | 코드리뷰 | 🚧 |
| NFR-SEC-04 | Electron `contextIsolation:true`/`nodeIntegration:false` | 상시 | TC-UI-05 | ✅ |
| NFR-SEC-05 | OAuth 토큰 암호화 저장 | D2 | TC-UI-06 | ⏳ |
| NFR-SEC-06 | CORS 로컬 오리진 화이트리스트 | C1 | 설정 리뷰 | ⏳ |
| NFR-SEC-07 | API 경계 입력 검증 | C1, B2 | TC-TASK-02,03 / TC-PROJ-02,03 | 🚧 |
| NFR-REL-01 | 모든 외부 호출·IO try/catch | 상시 | supervisor 리뷰 | 🚧 |
| NFR-REL-02 | 외부 API 실패가 앱 크래시로 안 이어짐 | D1 | TC-AGENT-03, TC-UI-02 | 🚧 |
| NFR-REL-03 | 백엔드 `unhandledRejection` 로깅·생존 | 상시 | 예외 주입 | ✅ (`server.js`) |
| NFR-REL-04 | 오프라인 로컬 캐시 조회 | C3, D2 | 수동 (비행기모드) | ⏳ |
| NFR-REL-05 | 네트워크 재시도 (지수 백오프 ×3) | D2 | 단위(모킹) | ⏳ |
| NFR-REL-06 | graceful shutdown (SIGTERM) | E4 (W9) | `kill -TERM` | ⏳ |
| NFR-MAINT-02 | 계층 분리 routes→services→db | C1 | 코드리뷰 | 🚧 |
| NFR-MAINT-03 | `db.js` 인터페이스 불변 | B2 | TC-DB-02 | ⏳ |
| NFR-MAINT-04 | 모델 상수 1곳 (`claude.py DEFAULT_MODEL`) | 상시 | grep | ✅ |
| NFR-MAINT-05 | 한 기능 = `/feature` 1회 | 상시 | 커밋 히스토리 | 🚧 |
| NFR-OBS-01 | 백엔드 요청 로깅 미들웨어 | C1 | 서버 콘솔 | ⏳ |
| NFR-OBS-02 | 에이전트 4단계 로깅 | D1 | 실행 로그 | ⏳ |
| NFR-OBS-03 | `sync_logs` 영속 | D2 | SQL | ⏳ |
| NFR-TEST-01 | backend supertest | A3 | `npm test` | ✅ (15 pass, 2026-09-02) |
| NFR-TEST-02 | agent pytest | A3 | `pytest` | ✅ (3 pass, 2026-09-02) |
| NFR-TEST-03 | CI 문법 + 테스트 | A3 | Actions | ✅ (`npm test` + `pytest -m "not network"` 연결) |
| NFR-TEST-04 | `verify.sh` exit 0 | A2 | `bash verify.sh` | ✅ (12/0/0, 2026-09-02) |
| NFR-PORT-02 | CI Node 22 / Python 3.12 고정 (로컬 상위 허용) | 상시 | CI | ✅ |
| NFR-PORT-03 | 경로·환경값 설정 분리 | B2, [ADR-0009](adr/ADR-0009-sqlite-file-location.md) | grep `/Users/` | 🚧 |
| NFR-DEPLOY-01 | Docker 빌드 | E3 (W12) | `docker build` | ⏳ |
| NFR-DEPLOY-02 | electron-builder 패키징 | E3 | `npm run build` | ⏳ |
| NFR-DEPLOY-03 | Daily Brief 무인 실행 | D3 | 로그 | ⏳ |

*(전체 NFR 은 [REQUIREMENTS_NONFUNCTIONAL.md](REQUIREMENTS_NONFUNCTIONAL.md). 여기엔 추적이 의미 있는 항목만.)*

---

## 5. ADR 결정 상태

Phase A~D 를 막던 제안 ADR 4건은 **2026-09-02 채택** → `/build-next` 가 A3~C2 를 막힘 없이 진행 가능.

| ADR | 관련 FR | 상태 |
|---|---|---|
| [ADR-0009](adr/ADR-0009-sqlite-file-location.md) SQLite 위치 | FR-TASK-05 | ✅ 채택 |
| [ADR-0010](adr/ADR-0010-vite-dev-vs-build.md) Vite 로드 방식 | FR-UI-02 | ✅ 채택 |
| [ADR-0011](adr/ADR-0011-agent-backend-db-access.md) DB 동시 접근 | FR-AGENT-01 | ✅ 채택 |
| [ADR-0012](adr/ADR-0012-task-project-link.md) `tasks.project_id` | FR-PROJ-02 | ✅ 채택 (스키마 반영, 라우트는 C2) |
| [ADR-0013](adr/ADR-0013-dashboard-agent-queue.md) 에이전트 작업 큐 | FR-AGENT-08 | 제안 — 핵심 4기능 완성 후 |

**남은 정지 요인:** `.env` API 키 (D2 부터 — Google OAuth / Notion / Anthropic), 대화형 준비(OAuth 앱 등록).

---

**작성:** 2026-09-02
