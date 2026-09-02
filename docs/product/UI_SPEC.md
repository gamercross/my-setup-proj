# 🖥️ 화면 명세 (UI Spec)

> Electron 데스크톱 앱의 화면·컴포넌트·상태 계약. 요구사항은 [requirements/UI.md](requirements/UI.md), 설계는 [DESIGN.md](DESIGN.md) §6, API 는 [API_REFERENCE.md](API_REFERENCE.md).
> 이 문서와 코드가 다르면 **코드가 맞고 이 문서를 고친다** — 단 "예정" 표시 요소는 아직 코드가 없다.

---

## 1. 개요

| 항목 | 값 |
|---|---|
| 화면 수 | **1개 (대시보드).** 라우팅 없음 |
| 창 크기 | 기본 800×600, 최소 800×600 (`main.js`) |
| 렌더 방식 | ✅ React + Vite (FR-UI-02 / B1). `renderer.jsx` → `createRoot(#root).render(<App/>)` |
| 마운트 지점 | `index.html` 의 `<div id="root">` |
| 브리지 | `preload.js` → `window.appInfo` (아래 §5) |

### 디자인 토큰 (현재 코드 기준)

| 이름 | 값 | 용도 |
|---|---|---|
| `--bg` | `#0f172a` | 화면 배경 |
| `--panel` | `#1e293b` | 카드·리스트 아이템 배경 |
| `--text` | `#e2e8f0` | 본문 텍스트 |
| `--muted` | `#94a3b8` | 보조 텍스트·섹션 제목 |
| `--accent` | `#f59e0b` | 진행도 바, priority medium |
| priority high | `#ef4444` | 할일 우선순위 배지 |
| priority low | `#64748b` | 할일 우선순위 배지 |
| радиус | 카드 `10px`, 배지 `999px` | |

> 🔷 Week 4+ 에 CSS 변수 또는 Tailwind 로 통합 예정 ([ARCHITECTURE.md](ARCHITECTURE.md)). 지금은 인라인 style.

---

## 2. 레이아웃 (와이어프레임)

```
┌─────────────────────────────────────────────────────────────┐
│  AI Computer OS                                    v0.1.0    │  ← 헤더
├───────────────────────────┬─────────────────────────────────┤
│  할 일                     │  프로젝트                        │
│  ┌─────────────────────┐  │  ┌───────────────────────────┐  │
│  │ ☐ 회의 자료 준비  [high]│ │ │ AI OS 실습        [진행 중] │  │
│  │ ☑ 슬라이드 검토  [med] 🗑│ │ │ ▓▓▓▓▓░░░░░ 40%             │  │
│  └─────────────────────┘  │  └───────────────────────────┘  │
│  [+ 할일 추가]  ← 예정      │                                 │
├───────────────────────────┴─────────────────────────────────┤
│  오늘 일정 (🔷 예정)         │  오늘 브리핑 (🔷 예정)           │
│  09:00 팀 미팅              │  ## 오늘의 우선순위 TOP 3        │
│  14:00 강의                 │  1. ...                          │
├─────────────────────────────────────────────────────────────┤
│  ⚠️ 백엔드에 연결할 수 없습니다  [재시도]   ← ErrorBanner (조건부) │
└─────────────────────────────────────────────────────────────┘
```

- 상단 2열(할일 / 프로젝트): 현재 `Dashboard.jsx` 에 존재 (`display:flex; gap:24px`).
- 하단 2열(일정 / 브리핑): 🔷 예정 (Week 5, 7).
- `ErrorBanner`: 🔷 예정 (FR-UI-04). 영역별로 개별 표시 가능.

---

## 3. 영역별 명세

### 3.1 헤더

| 항목 | 내용 |
|---|---|
| 목적 | 앱 정체성·버전 표시 |
| 요소 | 제목 `"AI Computer OS"`, 버전 `window.appInfo.version` |
| 데이터 출처 | `preload.js` (`appInfo`) |
| 상태 | 단일 (로딩/에러 없음) |
| 관련 FR | FR-UI-01 |

### 3.2 할일 패널

| 항목 | 내용 |
|---|---|
| 목적 | 할일 목록 조회·완료 토글·삭제·(예정) 추가 |
| 요소 | 섹션 제목 "할 일", `TaskList`, 🔷 `TaskForm`("+ 할일 추가") |
| 데이터 출처 | `GET /api/tasks` → `useTaskStore.tasks` |
| 관련 FR | FR-TASK-02/03/04, FR-UI-01 |

**렌더 상태 4종:**

| 상태 | 조건 | 표시 |
|---|---|---|
| 로딩 | 첫 fetch 진행 중 | "불러오는 중…" (🔷) |
| 비어있음 | `tasks.length === 0` | "할 일이 없습니다" (현재 `TaskList` 구현) |
| 정상 | `tasks.length > 0` | 각 항목: 체크박스 + 제목 + priority 배지 + 삭제 버튼 |
| 에러 | fetch 실패 | `ErrorBanner` "할일을 불러오지 못했습니다" + [재시도] (🔷) |

**인터랙션:**

| 동작 | 결과 |
|---|---|
| 체크박스 클릭 | `onToggle(id)` → `PUT /api/tasks/:id {status: done↔todo}` → 성공 시 해당 항목만 갱신 (낙관적 업데이트 허용, 실패 시 롤백) |
| 삭제 버튼 클릭 | `onDelete(id)` → `DELETE /api/tasks/:id` → 목록에서 제거. 실패 시 복원 + `ErrorBanner` |
| (예정) 추가 폼 제출 | `POST /api/tasks` → 201 시 목록에 append, 폼 초기화 |

> ⚠️ 현재 `Dashboard.jsx` 의 `handleToggle`/`handleDelete` 는 **로컬 state 만** 변경한다. Week 3(B3)에 store + API 호출로 교체.

### 3.3 프로젝트 패널

| 항목 | 내용 |
|---|---|
| 목적 | 프로젝트 진행도·상태 표시 |
| 요소 | 섹션 제목 "프로젝트", `ProjectCard` 목록 |
| 데이터 출처 | `GET /api/projects` → `useAppStore.projects` |
| 관련 FR | FR-PROJ-01/02, FR-UI-01 |

**렌더 상태:** 로딩 / 비어있음("프로젝트가 없습니다" — 🔷, 현재 미구현) / 정상 / 에러.

**`ProjectCard` 표시 요소:** 이름, 상태 배지, 진행도 바(`width: progress%`, accent 색), `{progress}%` 텍스트.

> ⚠️ 현재 `ProjectCard.statusLabel` 은 `'hold'` 를 "보류"로 처리하지만 [GLOSSARY.md](GLOSSARY.md)·`schema.sql` 은 `'on_hold'` 다. **불일치 — 코드를 `on_hold` 로 맞춘다** (Week 4).

### 3.4 오늘 일정 위젯 🔷 예정 (Week 5)

| 항목 | 내용 |
|---|---|
| 목적 | 오늘·다가오는 일정 표시, 오늘/내일 강조 |
| 요소 | `CalendarWidget` — 시간 + 제목 리스트 |
| 데이터 출처 | `GET /api/calendar/events?from=..&to=..` → `useAppStore.events` |
| 관련 FR | FR-CAL-01/02 |
| 상태 | 로딩 / "일정 없음" / 정상 / 에러 |

### 3.5 오늘 브리핑 카드 🔷 예정 (Week 7)

| 항목 | 내용 |
|---|---|
| 목적 | 에이전트가 생성한 "오늘의 우선순위" 표시 |
| 요소 | `BriefCard` — 마크다운 렌더, 생성 시각, (있으면) Notion 링크 |
| 데이터 출처 | `GET /api/brief/today` → `useAppStore.brief` |
| 관련 FR | FR-AGENT-04 |
| 상태 | 로딩 / "오늘 브리핑이 아직 없습니다"(404) / 정상 / 에러 |

### 3.6 ErrorBanner 🔷 예정 (FR-UI-04)

| 항목 | 내용 |
|---|---|
| 목적 | API/네트워크 오류를 사용자 친화적으로 표시 |
| 요소 | 아이콘 + 한국어 메시지 + [재시도] 버튼 |
| 규칙 | 스택 트레이스·상태코드 원문 노출 금지. 재시도는 해당 API 만 재호출. 성공 시 배너 제거 |
| 배치 | 영역별 개별 표시 (한 영역 실패가 다른 영역을 가리지 않음 — FR-UI-01 AC-2) |
| 최상위 | React error boundary 로 렌더 예외를 잡아 앱 전체 크래시 방지 (FR-UI-04 AC-5) |

---

## 4. 컴포넌트 계약

| 컴포넌트 | props | 내부 state | 방출 이벤트 | 상태 |
|---|---|---|---|:---:|
| `App` | — | `health` (loading/ok/error) | — | 🚧 B1 마운트됨 (appInfo + `/api/health` 렌더, error boundary·Dashboard 배선은 B3) |
| `Dashboard` | — | store 구독 | — | 🚧 (로컬 state) |
| `TaskList` | `tasks: Task[]`, `onToggle(id)`, `onDelete(id)` | — | `onToggle`, `onDelete` | ✅ |
| `TaskForm` | `onSubmit(payload)` | `title, description, dueDate, priority` | `onSubmit` | 🔷 |
| `ProjectCard` | `project: Project` | — | — | ✅ (status 값 수정 필요) |
| `CalendarWidget` | `events: Event[]` | — | — | 🔷 |
| `BriefCard` | `brief: Brief \| null` | — | — | 🔷 |
| `ErrorBanner` | `message: string`, `onRetry()` | — | `onRetry` | 🔷 |

**타입 형태**는 [DATA_DICTIONARY.md](DATA_DICTIONARY.md) 및 [API_REFERENCE.md](API_REFERENCE.md) 의 리소스 객체와 동일 (필드명 snake_case 유지).

---

## 5. `window.appInfo` (preload 브리지)

현재 노출 (`preload.js`):
```js
{ name: 'AI Computer OS', version: '0.1.0',
  electron: process.versions.electron, node: process.versions.node,
  apiBaseUrl: 'http://localhost:3000/api' }  // ✅ B1 추가 (3000 고정, CSP connect-src 와 정합)
```
- 시크릿·Node API 는 절대 노출하지 않는다 (NFR-SEC-03/04).

---

## 6. zustand 스토어 계약 🔷 예정 (Week 3 B3)

### `useTaskStore`
```
상태:   tasks: Task[]        loading: boolean    error: string | null
액션:   fetchTasks()                     → GET /api/tasks
        addTask(payload)                 → POST /api/tasks
        toggleTask(id)                   → PUT /api/tasks/:id
        updateTask(id, patch)            → PUT /api/tasks/:id
        removeTask(id)                   → DELETE /api/tasks/:id
```

### `useAppStore`
```
상태:   projects, events, brief, 각 영역별 loading/error
액션:   fetchProjects() fetchEvents() fetchBrief()
```

- 모든 액션은 `api/client.js`(fetch 래퍼) 경유. 에러는 문자열로 정규화해 `error` 에 저장 (NFR-REL-02).

---

## 7. React 렌더링 전환 (FR-UI-02 요약)

| 파일 | 현재 | 목표 |
|---|---|---|
| `index.html` | ✅ B1 완료 — `<script type="module" src="renderer.jsx">`, prod CSP `script-src 'self'` + `connect-src 'self' http://localhost:3000`. dev 는 `devCspPlugin` 이 완화 |
| `renderer.jsx` | ✅ B1 완료 — `createRoot(#root).render(<App/>)` (`renderer.js` 삭제) |
| `main.js` | ✅ B1 완료 — `NODE_ENV` 분기: dev `loadURL(:5173)` / prod `loadFile(dist/index.html)`, 실패 시 `fallback.html` |
| `package.json` | ✅ B1 완료 — `vite`, `@vitejs/plugin-react`, `concurrently`/`wait-on`/`cross-env`, `dev`/`build`/`start`/`package` 스크립트 |

> ⚠️ **CSP 주의:** 현재 `index.html` 의 CSP 에 `connect-src` 가 없어 `'self'` 로 제한된다 → `fetch('http://localhost:3000')` 이 **차단된다.** React 연결 시 CSP 에 `connect-src 'self' http://localhost:3000` (+ dev 는 ws) 를 반드시 추가한다.

---

## 8. 현재 구현과의 차이

| # | 명세 | 현재 | 해소 |
|---|---|---|---|
| U1 | React 트리 렌더 | ✅ B1 — `renderer.jsx` → `createRoot().render(<App/>)` (`renderer.js` 삭제) |
| U2 | `Dashboard` 가 store+API 사용 | 로컬 state, fetch 없음 | Week 3 B3 |
| U3 | `apiBaseUrl` 브리지 | ✅ B1 — `preload.js` `apiBaseUrl: 'http://localhost:3000/api'` (3000 고정) |
| U4 | `ProjectCard` status `on_hold` | `'hold'` 로 처리 | Week 4 |
| U5 | 일정·브리핑·에러 영역 | 없음 | Week 5·7, FR-UI-04 |
| U6 | CSP `connect-src` 허용 | ✅ B1 — prod `connect-src 'self' http://localhost:3000`, dev 는 `devCspPlugin` 완화 |
| U7 | 로딩/에러 상태 렌더 | `App.jsx` 는 `/api/health` 3상태 렌더. Dashboard 영역 로딩/에러는 B3 | B3, FR-UI-04 |

---

**작성:** 2026-09-02
