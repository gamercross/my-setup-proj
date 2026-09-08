# ADR-0033: 독립 위젯 창 (standalone widget windows) — 방향 유지

- 상태: **제안 (2026-09-08) — 보류(deferred).** 지금 구현하지 않는다. 이 ADR 의 목적은
  "나중에 할 수 있도록 지금 길을 막지 않는다" 를 규범으로 못 박는 것.
- 관련: [DASHBOARD_OS.md](../../vision/DASHBOARD_OS.md) §3·§6, [PERSONAL_OS.md](../../vision/PERSONAL_OS.md) §4 (노션 위젯 팩 참조),
  [ADR-0020](ADR-0020-widget-shell-architecture.md)(위젯 계약), [ADR-0016](ADR-0016-desktop-process-topology.md)(창·프로세스 토폴로지 — 제안),
  [ADR-0026](ADR-0026-web-demo-mode.md)(웹 데모는 미리보기), NFR-SEC-04

## 맥락

현재 모든 위젯은 **하나의 Electron 창**(대시보드 OS) 안의 `react-grid-layout` 그리드에
올라간다. 시각 참조([PERSONAL_OS.md](../../vision/PERSONAL_OS.md) §4 "노션 위젯 팩",
[DASHBOARD_OS.md](../../vision/DASHBOARD_OS.md) §3 "macOS/iOS 위젯")는 원래 **개별 위젯이
바탕화면에 떠 있는** 형태다. 사용자는 이 방향 — 위젯 하나를 대시보드에서 떼어내
frameless·always-on-top 독립 창으로 바탕화면에 두는 것 — 을 **나중에 할 수 있도록
열어두고 싶다** (2026-09-08).

이건 웹 데모(`VITE_DEMO`, 단일 페이지)로는 불가능하고 **실제 Electron 앱에서만** 가능하다.
그래서 "앱으로서 작동" 이 데모보다 우선한다는 것이 이 결정의 배경이기도 하다.

## 결정 (제안 — 지금은 규범만)

**독립 위젯 창 기능은 지금 만들지 않는다.** 대신 그때까지 지켜야 할 제약을 규범으로 둔다:

1. **위젯 뷰(`frontend/src/widgets/views/*WidgetView.jsx`)는 셸에 독립적이어야 한다.**
   - 뷰는 `WidgetShell` · `WidgetHost` · `react-grid-layout` · `useLayoutStore` 를
     **import 하지 않는다.** 뷰가 받는 것은 `{ config, configSchema }` (+ 일부는
     `instanceId`·`topicId`) 뿐이고, 자기 도메인 스토어를 직접 구독하며 로딩/빈/정상/에러
     4상태를 스스로 렌더한다 ([ADR-0020](ADR-0020-widget-shell-architecture.md) 계약 그대로).
   - 결과: 같은 뷰 컴포넌트를 독립 창의 루트에 그대로 마운트할 수 있다.
2. **테마 주입은 `WidgetFrame` 이 담당하고, 뷰에는 테마 코드가 없다.** 독립 창 도입 시
   `WidgetFrame` 의 CSS 변수 주입부(`themeToVars`)를 재사용 가능한 래퍼로 추출하면 된다
   ([ADR-0022](ADR-0022-per-widget-theming.md) 스코프 CSS 변수 유지).
3. **위젯 계약에 셸 전용 개념을 더 얹지 않는다.** 그리드 좌표·z-order·편집 모드 등은
   `useLayoutStore`(UI 상태)에만 있고 위젯 타입 정의(`widgetMeta.js`)에는 없다.
4. **1st-party 코드만.** 독립 창도 서드파티 위젯 로딩·외부 코드 실행은 없다 (NFR-SEC-04).

## 채택(=구현)하게 되면 필요한 것 (그때 별도 ADR)

- Electron `main` 이 위젯 타입·인스턴스 id 를 받아 `BrowserWindow`(frameless·transparent·
  `alwaysOnTop` 옵션)를 만드는 다중 창 관리 — [ADR-0016](ADR-0016-desktop-process-topology.md) 창·프로세스 토폴로지 결정에 포함.
- 단일 위젯 진입점/라우트 (`?widget=<type>&instance=<id>` 또는 별도 HTML 엔트리).
- 독립 창 목록·위치·크기 영속화 ([ADR-0021](ADR-0021-widget-layout-persistence.md) 확장).
- 백엔드 미기동 시 독립 창의 연결 오류 표시 (FR-UI-04 재사용).
- 데모에서는 불가 — 데모는 계속 단일 페이지 미리보기.

## 대안

- **지금 구현** — P8(OKR)·P9 앞에 끼우기. 기각: 다중 창·토폴로지(ADR-0016 미결)·영속화가
  얽혀 범위가 크고, 핵심 로드맵(OKR·진행 현황)이 먼저다.
- **아무것도 안 적기** — 기각: 이후 Phase 가 위젯 뷰에 셸 의존성을 넣어버리면 나중에 큰
  리팩터가 필요하다. 규범을 지금 박아두는 비용이 훨씬 싸다.

## 결과 / 트레이드오프

- 규범 1(뷰의 셸 독립)은 이미 `views/*WidgetView.jsx` 가 지키고 있다 — 이 ADR 은 그것을
  **회귀 방지 규칙**으로 승격할 뿐. `check-docs.sh` 또는 리뷰 체크리스트에 "새 WidgetView 가
  `WidgetShell`/`react-grid-layout`/`useLayoutStore` 를 import 하는가?" 를 추가 고려.
- 재검토 시점: [ADR-0016](ADR-0016-desktop-process-topology.md) 결정 시, 또는 개인 OS 로드맵 P9 완료 후.
