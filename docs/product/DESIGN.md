# 🏛️ 시스템 설계 (DESIGN)

> [AS_IS.md](AS_IS.md) 의 현행 분석과 [REQUIREMENTS_FUNCTIONAL.md](REQUIREMENTS_FUNCTIONAL.md) ·
> [REQUIREMENTS_NONFUNCTIONAL.md](REQUIREMENTS_NONFUNCTIONAL.md) 를 어떻게 구현할지.
> 큰 그림 기술스택은 [ARCHITECTURE.md](ARCHITECTURE.md), 일정은 [ROADMAP.md](ROADMAP.md).

---

## 1. 설계 원칙

1. **계층 고정** — `routes → services → db`. 라우트에 비즈니스 로직·SQL 금지 (NFR-MAINT-02).
2. **DB 인터페이스 불변** — `db.js` 의 `getX/addX/updateX/deleteX` 시그니처는 저장소가 바뀌어도 유지 (NFR-MAINT-03).
3. **오프라인 우선** — 로컬 SQLite 가 진실의 원천, 클라우드/외부 API 는 그 위에 얹는 캐시·동기화 (NFR-REL-04).
4. **최소 구현** — 각 단계는 데모 가능한 최소 범위. 과설계 금지 (NFR-MAINT-01).
5. **한 기능 = `/feature` 1회** — 에이전트 파이프라인으로만 변경 (NFR-MAINT-05).

---

## 2. 아키텍처 결정 (ADR 요약)

| # | 결정 | 이유 | 대안 |
|---|---|---|---|
| AD-01 | 프론트 렌더링을 **React + Vite** 로 통일, `renderer.js` 는 React 마운트 부트스트랩으로 축소 | `App.jsx` 등 이미 작성된 컴포넌트 활용, HMR 개발경험 | 바닐라 유지(❌ 확장성), Webpack(무거움) |
| AD-02 | 로컬 DB 는 **better-sqlite3** (동기 API) | Electron/Node 단일 프로세스, 간단·빠름, 강의 SQLite 실습과 일치 | `node:sqlite`(실험적), Prisma(과함) |
| AD-03 | 스키마는 `backend/db/schema.sql` 1파일 + 부팅 시 `CREATE TABLE IF NOT EXISTS` 적용 | 마이그레이션 도구 없이 시작, 강의 DDL 실습 | 마이그레이션 라이브러리(나중에) |
| AD-04 | 프론트 ↔ 백엔드는 **HTTP REST** (`http://localhost:3000/api`), base URL 은 환경설정 | 단순, 강의 웹서버 실습과 일치 | Electron IPC 직결(백엔드 재사용 불가) |
| AD-05 | 상태관리는 **zustand** (이미 의존성 있음), 서버데이터는 fetch 후 store 에 보관 | 가벼움 | Redux(과함), React Query(나중 고려) |
| AD-06 | 외부 API(Gmail/Calendar/Notion/Claude)는 **Python agent** 가 전담, 백엔드는 agent 결과를 DB 에서 읽음 | 언어별 SDK 성숙도, 강의 Python 실습 | Node 에서 전부(SDK 미성숙) |
| AD-07 | 에이전트 스케줄은 **launchd(macOS)/cron(Linux)** | 이미 worklog 에 launchd 사용 중 | APScheduler 상주 프로세스(나중) |
| AD-08 | 클라우드 동기화(Supabase)는 **Week 10 이후**, 그전까지 로컬 전용 | 핵심 기능 먼저 | 처음부터 클라우드(복잡도↑) |

---

## 3. 목표 아키텍처 (TO-BE)

```
┌───────────────────────────── Electron App ─────────────────────────────┐
│  main.js (창·수명주기)                                                  │
│    └─ preload.js (contextBridge: appInfo, apiBaseUrl)                   │
│         └─ renderer → React(Vite 번들)                                  │
│              App → Dashboard → { TaskList, ProjectCard, CalendarWidget, │
│                                  BriefCard }                            │
│              store/ (zustand)  ── fetch ──┐                             │
└───────────────────────────────────────────┼───────────────────────────┘
                                            │ HTTP REST  :3000/api
┌───────────────────────────── Backend (Express) ───────────────────────┐
│  server.js → middlewares(cors, logger, json, errorHandler)            │
│    routes/  tasks · projects · calendar · mail · brief                │
│      └─ services/  taskService · projectService · briefService ...    │
│           └─ db/  index.js (better-sqlite3)  ← schema.sql             │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ 같은 SQLite 파일 (읽기/쓰기)
┌───────────────────────── Python Agent ───────────────────────────────┐
│  daily_brief.py  (launchd/cron, 매일 08:00)                          │
│    services/ gmail · calendar · notion · claude                      │
│    → 수집 → claude.ask() → SQLite(brief, emails, calendar_events)     │
│           → notion.save_to_notion()                                  │
└─────────────────────────────────────────────────────────────────────┘
        (Week 10+) SQLite ⇄ Supabase 증분 동기화
```

핵심 변경점: **① renderer 를 React 로 교체, ② db 를 SQLite 로 교체, ③ 프론트–백엔드 fetch 연결, ④ agent 가 같은 SQLite 에 씀.**

---

## 4. 데이터 모델

**DDL 단일 원천: [`backend/db/schema.sql`](../../backend/db/schema.sql).** 필드별 의미·규칙은 [DATA_DICTIONARY.md](DATA_DICTIONARY.md).
이 절은 관계와 설계 의도만 다룬다.

테이블: `tasks`, `projects`, `calendar_events`(Google 캐시), `emails`(Gmail 캐시), `briefs`(날짜별 1건), `sync_logs`(append-only).

```
projects (1) ──< (N) tasks     ※ tasks.project_id FK 는 미도입 — FR-PROJ 세부화 시 결정
calendar_events / emails        외부 API 캐시. event_id / email_id UNIQUE 로 upsert
briefs                          date UNIQUE. 같은 날 재실행 시 갱신
sync_logs                       매 동기화 시도 1행 추가
```

설계 의도:
- **오프라인 우선** — 외부 데이터는 전부 로컬 캐시 테이블에 먼저 저장, UI 는 캐시를 읽는다.
- **enum 은 DB CHECK 로 강제** — `priority`/`status` 문자열이 코드와 어긋나지 않도록.
- **날짜는 TEXT + ISO8601** — SQLite 에 네이티브 날짜 타입이 없으므로 규약으로 통일.
- (Week 10+) Supabase 동기화 시 `user_id` / `is_synced` / `synced_at` 컬럼 추가 (schema.sql 하단 주석).

---

## 5. API 명세 (백엔드)

Base: `http://localhost:3000/api` · 응답은 JSON · 오류는 `{ "error": "메시지" }`

| 메서드 | 경로 | 설명 | 요청 본문 | 성공 | FR |
|---|---|---|---|---|---|
| GET | `/health` | 상태 확인 | — | `{ ok: true }` | — |
| GET | `/tasks` | 할일 목록 (쿼리: `status`,`priority`,`due`) | — | `{ tasks: [...] }` | FR-TASK-02/06 |
| GET | `/tasks/:id` | 단건 | — | `{ task }` / 404 | — |
| POST | `/tasks` | 생성 | `{title, description?, due_date?, priority?}` | 201 `{ task }` | FR-TASK-01 |
| PUT | `/tasks/:id` | 수정 (부분) | 허용 필드 | `{ task }` / 404 | FR-TASK-03/04 |
| DELETE | `/tasks/:id` | 삭제 | — | `{ ok: true }` / 404 | FR-TASK-04 |
| GET/POST/PUT/DELETE | `/projects...` | tasks 와 동일 구조 | | | FR-PROJ-01/02 |
| GET | `/calendar/events` | 캐시된 일정 (쿼리: `from`,`to`) | — | `{ events: [...] }` | FR-CAL-01 |
| GET | `/mail/unread` | 캐시된 미읽은 메일 | — | `{ emails: [...] }` | FR-MAIL-01 |
| GET | `/brief/today` | 오늘 브리핑 | — | `{ brief }` / 404 | FR-AGENT-04 |
| GET | `/sync/logs` | 동기화 이력 | — | `{ logs: [...] }` | FR-SYNC-03 |

검증 규칙(NFR-SEC-07): `title` 필수, `priority ∈ {high,medium,low}`, `status ∈ {todo,in_progress,done}`, `progress ∈ [0,100]`. 위반 시 400.

미들웨어 순서: `cors(로컬 오리진만)` → `express.json()` → `requestLogger` → 라우트 → `404` → `errorHandler`.

---

## 6. 프론트엔드 설계

```
frontend/src/
  main.js            Electron 메인 (변경 최소)
  preload.js         contextBridge: { appInfo, apiBaseUrl }
  index.html         <div id="root">
  renderer.jsx       ReactDOM.createRoot(#root).render(<App/>)   ← renderer.js 대체
  App.jsx            레이아웃 + 라우팅(단일 화면)
  store/
    useTaskStore.js  zustand: tasks, fetchTasks, addTask, toggleTask, removeTask
    useAppStore.js   projects, events, brief
  api/
    client.js        fetch 래퍼 (base URL, 에러 정규화, 재시도)
  components/
    Dashboard.jsx    store 구독 → 하위 컴포넌트에 주입
    TaskList.jsx     (기존) props 인터페이스 유지
    TaskForm.jsx     신규: 할일 추가 폼
    ProjectCard.jsx  (기존)
    CalendarWidget.jsx  신규
    BriefCard.jsx       신규
    ErrorBanner.jsx     신규 (FR-UI-04, NFR-REL-02)
```

Vite 설정: `frontend/vite.config.js`, `base: './'` (Electron file:// 로드), 빌드 산출물 `dist/` → `main.js` 가 `dist/index.html` 로드. 개발 시 `vite` dev 서버 + `loadURL`.

---

## 7. 에이전트 설계

```
agent/
  daily_brief.py       엔트리 (launchd/cron)
  db.py                신규: 백엔드와 같은 SQLite 파일에 읽기/쓰기
  services/
    gmail.py     get_unread_emails()  → 실 Gmail API (Week 6)
    calendar.py  get_today_events()   → 실 Calendar API (Week 5~6)
    notion.py    save_to_notion()     → 실 Notion API (Week 7)
    claude.py    ask()  (완료)
  auth/
    google_oauth.py    토큰 획득·갱신·암호화 저장 (Week 6, NFR-SEC-05)
```

흐름 (FR-AGENT-01~06):
1. `gmail/calendar` 에서 수집 → `emails`/`calendar_events` 테이블 upsert + `sync_logs` 기록
2. `db.py` 로 오늘 할일 + 위 데이터 조회 → `build_context()`
3. `claude.ask(context, system=SYSTEM_PROMPT)` — 실패 시 로그+종료(앱 영향 없음)
4. 결과를 `briefs` 테이블 저장 + `notion.save_to_notion()` → `notion_url` 갱신

---

## 8. 단계별 구현 계획 (`/feature` 단위)

각 행 = `/feature` 1회. "커버 요구사항" 은 완료 시 상태를 갱신할 ID.

### Phase A — 기반 정리 (Week 1 잔여)

| 단계 | `/feature` 설명 | 커버 | 산출물 |
|---|---|---|---|
| A1 | 경로 이관 변경분(docs 재배치·plist 경로·VISION.md) 커밋 | G5 | 커밋 1 |
| A2 | 개발 머신 node/npm/python 설치 후 `setup.sh`·`verify.sh` 통과 | G4, NFR-TEST-04 | verify PASS |
| A3 | backend supertest 스모크 + agent pytest 1개, CI 에 연결 | NFR-TEST-01~03, G6 | `tests/`, CI 갱신 |

### Phase B — 프론트 연결 + DB (Week 2~3)

| 단계 | `/feature` 설명 | 커버 | 산출물 |
|---|---|---|---|
| B1 | Vite 도입, `renderer.js`→`renderer.jsx` 로 React 마운트, `App` 렌더 확인 | AD-01, FR-UI-02, G1 | 빌드 파이프라인 |
| B2 | `schema.sql` + better-sqlite3 로 `db.js` 내부 교체 (라우트 무수정) | AD-02/03, FR-TASK-05, G2 | `backend/db/` |
| B3 | `api/client.js` + zustand store, Dashboard→TaskList/TaskForm 배선 (할일 CRUD E2E) | FR-TASK-01~04, FR-UI-01, G3 | 동작하는 할일 기능 |

### Phase C — 강의 동기화 (Week 4~5)

| 단계 | `/feature` 설명 | 커버 |
|---|---|---|
| C1 | 백엔드 미들웨어 정식화 (cors·requestLogger·errorHandler 분리) | NFR-SEC-06, NFR-OBS-01 |
| C2 | 프로젝트 CRUD 프론트 배선 + ProjectCard 진행도 바 | FR-PROJ-01/02 |
| C3 | 캘린더 위젯 + `/api/calendar/events` (더미→실 API 준비) | FR-CAL-01/02 |

### Phase D — 에이전트 (Week 6~7)

| 단계 | `/feature` 설명 | 커버 |
|---|---|---|
| D1 | `agent/db.py` + `briefs` 테이블, `daily_brief` 가 로컬 할일로 실 Claude 호출 | FR-AGENT-01/02/06 |
| D2 | Google OAuth + Gmail/Calendar 실 수집 → SQLite upsert + sync_logs | FR-AUTH-01, FR-MAIL-01, FR-CAL-01, FR-SYNC-03 |
| D3 | Notion 저장 + launchd/cron 자동 실행 + BriefCard 표시 | FR-AGENT-03/04/05 |

### Phase E — 배포/동기화 (Week 9~12, 계획대로)

| 단계 | 내용 | 커버 |
|---|---|---|
| E1 | 다중 사용자 + 데이터 분리 | FR-AUTH-02/03 |
| E2 | Supabase 증분 동기화 | FR-SYNC-01/02 |
| E3 | Dockerfile + electron-builder | NFR-DEPLOY-01/02 |
| E4 | graceful shutdown, 보안 점검, 성능 최적화 | NFR-REL-06, NFR-SEC-*, NFR-PERF-* |

---

## 9. 열린 질문

- Vite dev 서버 vs 빌드 산출물 로드 — 개발 편의(HMR) 위해 `NODE_ENV` 로 분기할지?
- SQLite 파일 위치 — `backend/data/app.db` vs OS 사용자 데이터 디렉토리(`app.getPath('userData')`)? 배포 시 후자가 맞음.
- agent 와 backend 가 같은 SQLite 에 동시 쓰기 — WAL 모드로 충분한지, 아니면 agent 는 backend API 경유로 쓸지.

---

**작성:** 2026-09-02
