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

## 2. 아키텍처 결정 (ADR)

결정 하나 = 파일 하나. 전체·배경은 **[adr/](adr/)**.

| # | 결정 | 상태 |
|---|---|---|
| [0001](adr/ADR-0001-frontend-react-vite.md) | 프론트 렌더링을 React + Vite 로 통일 | 채택 |
| [0002](adr/ADR-0002-local-db-better-sqlite3.md) | 로컬 DB 는 better-sqlite3 (동기 API) | 채택 |
| [0003](adr/ADR-0003-schema-single-file.md) | 스키마는 `schema.sql` 1파일 + `IF NOT EXISTS` | 채택 |
| [0004](adr/ADR-0004-front-back-http-rest.md) | 프론트↔백엔드는 HTTP REST | 채택 |
| [0005](adr/ADR-0005-state-zustand.md) | 상태관리는 zustand | 채택 |
| [0006](adr/ADR-0006-agent-owns-external-apis.md) | 외부 API 는 Python 에이전트가 전담 | 채택 |
| [0007](adr/ADR-0007-schedule-launchd-cron.md) | 스케줄은 launchd/cron | 채택 |
| [0008](adr/ADR-0008-supabase-deferred.md) | Supabase 동기화는 Week 10 이후 | 채택 |
| [0009](adr/ADR-0009-sqlite-file-location.md) | SQLite 위치: `DATABASE_PATH` 주입 | 채택 |
| [0010](adr/ADR-0010-vite-dev-vs-build.md) | Vite: `NODE_ENV` 로 dev/빌드 분기 | 채택 |
| [0011](adr/ADR-0011-agent-backend-db-access.md) | 에이전트–백엔드 SQLite: WAL + 쓰기 주체 분리 | 채택 |
| [0012](adr/ADR-0012-task-project-link.md) | `tasks.project_id` FK (`ON DELETE SET NULL`) | 채택 |
| [0013](adr/ADR-0013-dashboard-agent-queue.md) | 대시보드 에이전트 작업 큐 (향후 확장) | **제안** |

---

## 3. 목표 아키텍처 (TO-BE)

> 다이어그램은 Mermaid. GitHub 에서 자동 렌더된다. 로컬/오프라인 이미지는 [DIAGRAMS.md](../setup/DIAGRAMS.md) 참고.

```mermaid
flowchart TB
  subgraph EL["Electron App (frontend/)"]
    MAIN["main.js<br/>창·수명주기"]
    PRE["preload.js<br/>contextBridge: appInfo, apiBaseUrl"]
    subgraph R["renderer (React + Vite)"]
      APP["App"] --> DASH["Dashboard<br/>(zustand store 구독)"]
      DASH --> TL["TaskList / TaskForm"]
      DASH --> PC["ProjectCard"]
      DASH --> CW["CalendarWidget"]
      DASH --> BC["BriefCard"]
      DASH --> EB["ErrorBanner"]
    end
    MAIN --> PRE --> R
  end

  subgraph BE["Backend (backend/, Express)"]
    SRV["server.js<br/>cors → json → logger → routes → 404 → errorHandler"]
    SRV --> RT["routes/<br/>tasks · projects · calendar · mail · brief · sync"]
    RT --> SVC["services/"]
    SVC --> DBM["db/ (better-sqlite3)"]
  end

  subgraph AG["Python Agent (agent/)"]
    DB2["daily_brief.py<br/>launchd/cron 매일 08:00"]
    DB2 --> GS["services/ gmail · calendar · notion · claude"]
    DB2 --> ADB["db.py"]
  end

  SQLITE[("SQLite<br/>schema.sql")]

  R -- "HTTP REST :3000/api" --> SRV
  DBM --> SQLITE
  ADB --> SQLITE
  GS -. "OAuth / HTTPS" .-> EXT["Gmail · Google Calendar<br/>Notion · Claude API"]
  SQLITE -. "Week 10+ 증분 동기화" .-> SUPA[("Supabase")]
```

핵심 변경점: **① renderer 를 React 로 교체, ② db 를 SQLite 로 교체, ③ 프론트–백엔드 fetch 연결, ④ agent 가 같은 SQLite 에 씀.**

---

## 4. 데이터 모델

**DDL 단일 원천: [`backend/db/schema.sql`](../../backend/db/schema.sql).** 필드별 의미·규칙은 [DATA_DICTIONARY.md](DATA_DICTIONARY.md).
이 절은 관계와 설계 의도만 다룬다.

테이블: `tasks`, `projects`, `calendar_events`(Google 캐시), `emails`(Gmail 캐시), `briefs`(날짜별 1건), `sync_logs`(append-only).

```
projects (1) ──< (N) tasks     tasks.project_id FK, ON DELETE SET NULL (ADR-0012)
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

> 엔드포인트별 요청/응답 예시·검증·부작용·curl 은 **[API_REFERENCE.md](API_REFERENCE.md)** 가 단일 원천이다.
> 이 절은 개요표와 설계 원칙만 둔다.

Base: `http://localhost:3000/api` · 응답은 JSON · 오류는 `{ "error": "메시지" }`

엔드포인트 범위: `/health`, `/tasks`(CRUD), `/projects`(CRUD), `/calendar/events`, `/mail/unread`, `/brief/today`, `/sync/logs`.
요청·응답 예시, 검증 규칙, 상태코드, 현재 구현과의 차이는 [API_REFERENCE.md](API_REFERENCE.md).

설계 규칙:
- 검증(NFR-SEC-07): `title`/`name` 필수, `priority ∈ {high,medium,low}`, `status ∈ {todo,in_progress,done}`, `progress ∈ [0,100]`. 위반 시 400.
- 미들웨어 순서: `cors(로컬 오리진만)` → `express.json()` → `requestLogger` → 라우트 → `404` → `errorHandler`.
- `calendar`/`mail`/`brief`/`sync` 는 읽기 전용 — 데이터는 에이전트가 SQLite 캐시 테이블에 씀 ([ADR-0006](adr/ADR-0006-agent-owns-external-apis.md)).

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

컴포넌트 계약(props/state/이벤트)·렌더 상태·와이어프레임은 [UI_SPEC.md](UI_SPEC.md) 가 단일 원천.

> ⚠️ `index.html` CSP 에 `connect-src` 가 없어 백엔드 `fetch` 가 차단된다. B1 에서 `connect-src 'self' http://localhost:3000` (+ dev `ws:`) 를 반드시 추가한다.

### 흐름: 할일 생성 (FR-TASK-01)

```mermaid
sequenceDiagram
  actor U as 사용자
  participant F as TaskForm (React)
  participant S as useTaskStore
  participant C as api/client.js
  participant R as routes/tasks.js
  participant SV as services
  participant DB as db (SQLite)

  U->>F: 제목·우선순위 입력 후 제출
  F->>S: addTask(payload)
  S->>C: POST /api/tasks
  C->>R: HTTP 요청
  R->>R: 입력 검증 (title 필수 등)
  alt 검증 실패
    R-->>C: 400 { error }
    C-->>S: 정규화된 에러 문자열
    S-->>F: error 상태 → ErrorBanner
  else 정상
    R->>SV: createTask(payload)
    SV->>DB: INSERT (created_at/updated_at 서버가 채움)
    DB-->>SV: task 행
    SV-->>R: task
    R-->>C: 201 { task }
    C-->>S: task
    S->>S: tasks 배열에 append
    S-->>F: 목록 갱신, 폼 초기화
  end
```

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

### 흐름: Daily Brief 생성 (FR-AGENT-01~06)

```mermaid
sequenceDiagram
  participant SCH as launchd/cron (08:00)
  participant DB2 as daily_brief.py
  participant GM as gmail / calendar
  participant DBP as db.py (SQLite)
  participant CL as claude.py → Claude API
  participant NO as notion.py

  SCH->>DB2: 실행
  DB2->>GM: 수집 요청
  alt 외부 API 실패
    GM-->>DB2: 오류
    DB2->>DBP: sync_logs('gmail','failed', 원인)
    Note over DB2: 해당 소스는 "없음"으로 대체, 계속 진행
  else 정상
    GM-->>DB2: 이메일·일정
    DB2->>DBP: emails / calendar_events upsert + sync_logs(success)
  end
  DB2->>DBP: 오늘 tasks 조회
  DBP-->>DB2: 할일 목록
  DB2->>DB2: build_context()
  DB2->>CL: ask(context, system=SYSTEM_PROMPT)
  alt Claude 실패
    CL-->>DB2: 예외
    DB2-->>SCH: "⚠️ Claude 호출 실패: 원인" (비정상 종료코드, 크래시 없음)
  else 정상
    CL-->>DB2: 브리핑 텍스트
    DB2->>DBP: briefs upsert (date 기준)
    DB2->>NO: save_to_notion(브리핑)
    alt Notion 실패
      NO-->>DB2: 오류
      DB2->>DBP: sync_logs('notion','failed', 원인)
      Note over DB2: 로컬 저장은 유지, "Notion 저장만 실패"로 보고
    else 정상
      NO-->>DB2: 페이지 URL
      DB2->>DBP: briefs.notion_url 갱신
    end
  end
```

---

## 8. 단계별 구현 계획 (`/feature` 단위)

각 행 = `/feature` 1회. "커버 요구사항" 은 완료 시 상태를 갱신할 ID.

### Week ↔ Phase 대응

세 가지 넘버링을 맞춘다: 강의 "Week"([ROADMAP.md](ROADMAP.md)) · 요구사항 "목표 주차"([REQUIREMENTS_FUNCTIONAL.md](REQUIREMENTS_FUNCTIONAL.md)) · 설계 "Phase".

| Phase | 강의 Week | 주제 | 상태 |
|---|---|---|---|
| A | Week 1~2 | 기반 정리 (환경·테스트·커밋 체계) | A1~A3 ✅ |
| B | Week 2~3 | 프론트 React 연결 + SQLite + 할일 CRUD | ⏳ (ADR 결정 완료) |
| C | Week 4~5 | 백엔드 미들웨어 · 프로젝트 · 캘린더 | ⏳ |
| D | Week 6~7 | 에이전트 (수집·Claude·Notion·스케줄) | ⏳ |
| — | Week 8 | 중간고사 · 과제 1 발표 | ⏳ |
| E | Week 9~13 | 다중 사용자 · Supabase · Docker · 최적화 | ⏳ |
| — | Week 14~15 | 기말고사 · 과제 2 · 최종 발표 | ⏳ |

### Phase A — 기반 정리 (Week 1 잔여)

| 단계 | `/feature` 설명 | 커버 | 상태 |
|---|---|---|---|
| A1 | 경로 이관 변경분 커밋 | G5 | ✅ `fc4404c` |
| A2 | node/npm/python 설치 + `setup.sh`·`verify.sh` 통과 + 백엔드 실행 검증 | G4, NFR-TEST-04 | ✅ `45f0a15` (12/0/0) |
| A3 | backend supertest 스모크(TC-TASK/PROJ P0, 15케이스) + agent pytest(TC-AGENT-01~03), CI 에 `npm test`·`pytest -m "not network"` 연결, `app.js` 분리 | NFR-TEST-01~03, G6 | ✅ A3 |

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

## 9. 결정 완료 / 남은 열린 질문

Phase A~D 를 막던 제안 ADR 4건은 **2026-09-02 채택**:

| ADR | 결정 |
|---|---|
| [0009](adr/ADR-0009-sqlite-file-location.md) | `DATABASE_PATH` 환경변수 주입, 기본 `backend/data/app.db`, 패키지는 `userData` |
| [0010](adr/ADR-0010-vite-dev-vs-build.md) | `NODE_ENV` 분기 — dev=Vite 서버(5173)+HMR, prod=`dist` 빌드 |
| [0011](adr/ADR-0011-agent-backend-db-access.md) | WAL 모드 + `busy_timeout=5000`, 쓰기 주체 분리(agent=캐시, backend=tasks/projects) |
| [0012](adr/ADR-0012-task-project-link.md) | `tasks.project_id` FK `ON DELETE SET NULL`, 스키마 반영 완료, 라우트는 C2 |

남은 열린 질문: [ADR-0013](adr/ADR-0013-dashboard-agent-queue.md)(대시보드 에이전트 작업 큐) — 핵심 4기능 완성 후.

---

**작성:** 2026-09-02
