# FR-UI — 대시보드 / 화면 상세 명세

> [REQUIREMENTS_FUNCTIONAL.md](REQUIREMENTS_FUNCTIONAL.md) 의 UI 도메인 상세화.
> 화면 요소·컴포넌트 계약은 [UI_SPEC.md](../reference/UI_SPEC.md)(예정)에서 더 자세히 다룬다. 이 문서는 "요구사항" 수준.

## 공통 규칙

- 앱은 **단일 화면(대시보드)**. 별도 라우팅 없음.
- 모든 데이터 패널은 4가지 상태를 렌더한다: **로딩 / 비어있음 / 정상 / 에러**.
- 백엔드 base URL 은 `preload.js` 가 `window.appInfo.apiBaseUrl` 로 노출 (`http://localhost:3000/api`, `PORT` 반영).
- Electron 보안 설정 고정: `contextIsolation:true`, `nodeIntegration:false` (NFR-SEC-04).

---

## FR-UI-01 — 통합 대시보드

**사용자 스토리:** 사용자로서 나는 할일·프로젝트·일정·브리핑을 한 화면에서 보고 싶다, 여러 앱을 오가지 않으려고.

**우선순위** P0 · **목표 주차** W3 · **상태** 🚧 (컴포넌트 파일만 존재, 렌더 경로 밖)

### 수용 기준
- **AC-1** 앱 실행 시 대시보드에 4개 영역이 보인다: 할일 패널, 프로젝트 패널, 캘린더 위젯, 브리핑 카드.
- **AC-2** 각 영역은 독립적으로 로딩/에러를 표시한다 — 한 영역의 API 실패가 다른 영역을 가리지 않는다.
- **AC-3** 창 최소 크기 800×600 에서 레이아웃이 깨지지 않는다.
- **AC-4** 데이터 없음 상태에서도 각 영역의 제목과 "없음" 안내가 보인다.
- **AC-a** (P4.5 · [ADR-0032](../architecture/adr/ADR-0032-sidebar-shell-per-topic-layouts.md)) 앱 실행 시 왼쪽 고정 사이드바가 4그룹(COMMAND/PLAN/AGENT/SYSTEM) 11항목을 표시하고, 마지막 선택 주제를 복원한다(없으면 `overview`).
- **AC-b** 사이드바 항목 클릭 시 본문 그리드가 그 주제의 레이아웃으로 교체된다 — 라우팅·새로고침 없음. 한 주제의 편집이 다른 주제에 영향을 주지 않는다.

### 관련
UI `App`→`AppShell`→`Sidebar`/`TopicView`→`WidgetShell` · FR-TASK-02, FR-PROJ-02, FR-CAL-01, FR-AGENT-04 · [ADR-0032](../architecture/adr/ADR-0032-sidebar-shell-per-topic-layouts.md)

---

## FR-UI-02 — React 렌더링 + 백엔드 데이터 표시

**사용자 스토리:** (기술 요구) 개발자로서 나는 이미 작성된 React 컴포넌트가 실제로 화면에 그려지고 API 데이터를 표시하길 원한다.

**우선순위** P0 · **목표 주차** W2~3 · **상태** ✅ Phase B1 (Vite + `renderer.jsx` 마운트). AC-5 는 "에러 표시" 수준까지 — 실제 200 응답은 CORS(C1) 후. G1 해소.

### 수용 기준
- **AC-1** `renderer.js`(바닐라)가 제거되고, `renderer.jsx` 가 `ReactDOM.createRoot(#root).render(<App/>)` 로 React 트리를 마운트한다.
- **AC-2** Vite 로 번들되며, `frontend/package.json` 에 `dev`/`build` 스크립트와 `vite`·`@vitejs/plugin-react` devDependency 가 추가된다.
- **AC-3** ✅ 개발 모드(`NODE_ENV=development`): `main.js` 가 Vite dev 서버(`http://localhost:5173`)를 `loadURL` 로 로드, HMR 동작.
- **AC-4** ✅ 프로덕션: `npm run build` → `dist/` 산출물을 `main.js` 가 `loadFile(dist/index.html)` 로 로드.
- **AC-5** `App` 안에서 `fetch(apiBaseUrl + '/health')` 결과를 3상태로 화면에 표시한다. 현재는 CORS 미설정으로 "에러 표시" 수준까지 검증 — 실제 200 은 C1 이후.
- **AC-6** `preload.js` 의 `appInfo` (version/electron/node) 노출은 유지된다.
- **AC-7** `verify.sh` 의 `node -c frontend/src/main.js` 가 계속 통과하고, 빌드가 CI 에서 성공한다.
- **AC-8** `index.html` 의 CSP 에 `connect-src 'self' http://localhost:3000` (dev 는 `ws:` 포함)를 추가한다 — 현재 CSP 는 `connect-src` 미지정으로 `'self'` 제한이라 백엔드 `fetch` 가 차단된다 ([UI_SPEC.md](../reference/UI_SPEC.md) §7).

### 오류 시나리오
| 상황 | 기대 동작 |
|---|---|
| dev 서버 미기동 상태로 앱 실행 | 흰 화면 대신 "개발 서버(:5173)에 연결할 수 없습니다" 안내 |
| 번들 로드 실패(프로덕션) | `main.js` 가 에러 로깅 후 폴백 HTML |

### 관련
ADR-01 · [AS_IS.md](../vision/AS_IS.md) G1 · DESIGN §6 · NFR-PORT-01, NFR-TEST-03

---

## FR-UI-03 — 창 제어

**사용자 스토리:** 사용자로서 나는 앱 창을 최소화/최대화/종료할 수 있어야 한다.

**우선순위** P1 · **목표 주차** W2 · **상태** ✅ (OS 기본 창 제어 동작)

### 수용 기준
- **AC-1** OS 기본 타이틀바로 최소화·최대화·종료가 된다.
- **AC-2** macOS: 모든 창을 닫아도 앱이 종료되지 않고, 독 아이콘 클릭 시 창이 재생성된다.
- **AC-3** macOS 외: 모든 창을 닫으면 앱이 종료된다.
- **AC-4** (W9, NFR-REL-06) 종료 신호(SIGTERM) 수신 시 진행 중인 DB 쓰기를 완료하고 종료한다.

### 관련
`frontend/src/main.js` · NFR-REL-06

---

## FR-UI-04 — 오류 표시

**사용자 스토리:** 사용자로서 나는 뭔가 잘못됐을 때 흰 화면이 아니라 무슨 일인지 알고 싶다.

**우선순위** P1 · **목표 주차** W3 · **상태** ⏳

### 수용 기준
- **AC-1** API 호출 실패 시 해당 영역에 `ErrorBanner`(메시지 + "재시도" 버튼)가 표시된다.
- **AC-2** 메시지는 사용자 친화적 한국어. 스택 트레이스·상태코드 원문을 그대로 노출하지 않는다.
- **AC-3** "재시도" 클릭 시 해당 API 만 다시 호출한다.
- **AC-4** 네트워크 복구 후 성공하면 배너가 사라진다.
- **AC-5** 예기치 못한 렌더 오류는 React error boundary 가 잡아 앱 전체가 죽지 않는다.

### 관련
UI `ErrorBanner` · `api/client.js` · NFR-REL-02

---

## FR-UI-05 — 프로젝트 다이어그램 뷰어

**사용자 스토리:** 사용자로서 나는 이 프로젝트가 지금 어떤 구조이고 어디까지 진행됐는지를
저장소를 열지 않고 대시보드에서 그림으로 보고 싶다.

**우선순위** P2 · **목표 주차** W4~5 (Phase C4) · **상태** 🚧 구현 완료 (2026-09-06, [ADR-0014](../architecture/adr/ADR-0014-dashboard-diagram-viewer.md) 채택) — 브라우저 E2E 수동 확인 대기

### 범위
- **이번(MVP)**: `docs/**/*.md` 에 이미 있는 Mermaid 다이어그램을 대시보드 패널에서 렌더.
- **후속**: 다이어그램 위에 Phase 진행 상태 오버레이(별도 진행상태 단일 원천 필요),
  코드 스캔 기반 의존 그래프 자동 생성.

### 수용 기준
- **AC-1** 대시보드에 "다이어그램" 패널이 있고, 문서별 자동 목록(`docs/**/*.md` 스캔)에서
  문서를 선택 바로 고른다. 최소 DESIGN·ROADMAP·ORCHESTRATION·AS_IS 문서의 다이어그램이 포함된다.
- **AC-2** 선택한 다이어그램이 SVG 로 그려지고, 다크 테마(대시보드 배경과 어울림)로 렌더된다.
- **AC-3** 패널은 공통 규칙의 4상태를 지킨다 — 로딩 / 비어있음(`docs/` 를 못 찾음) / 정상 / 에러(API 실패).
- **AC-4** 개별 다이어그램 렌더가 실패해도 패널 전체가 죽지 않고, 해당 항목만
  "이 다이어그램을 그릴 수 없습니다" + 원문 Mermaid 코드로 폴백한다.
- **AC-5** 데이터는 `GET /api/diagrams` 로 받는다. 응답은 `{ "diagrams": [{ doc, path, index, title, code }] }`.
  (엔드포인트 상세는 [API_REFERENCE.md](../reference/API_REFERENCE.md) 다이어그램 절.)
- **AC-6** `mermaid` 는 패널 진입 시 동적 import 되어 초기 대시보드 번들에 포함되지 않는다
  (별도 청크). CI 빌드가 계속 성공한다.
- **AC-7** CSP 추가 완화 없이 동작한다 (`script-src 'self'`, 기존 `style-src 'unsafe-inline'`).
- **AC-8** 문서를 고치고 앱을 새로고침하면 변경이 반영된다 (dev 기준 — 라이브 소스).

### 오류 시나리오
| 상황 | 기대 동작 |
|---|---|
| 백엔드 미기동 / CORS 미설정 | 패널에 `ErrorBanner`("다이어그램을 불러올 수 없습니다" + 재시도) |
| 패키지 빌드에 `docs/` 미동봉 | `GET /api/diagrams` 가 빈 배열(200) → 패널은 "비어있음" 상태 |
| 특정 블록의 Mermaid 문법 오류 | 그 항목만 원문 코드로 폴백, 나머지는 정상 렌더 |

### 관련
[ADR-0014](../architecture/adr/ADR-0014-dashboard-diagram-viewer.md) · [DIAGRAMS.md](../../setup/DIAGRAMS.md) ·
DESIGN §8 (신규 단계) · Phase C1(CORS 선행) · NFR-REL-02, NFR-PERF

---

**작성:** 2026-09-02 (FR-UI-05 추가: 2026-09-03)
