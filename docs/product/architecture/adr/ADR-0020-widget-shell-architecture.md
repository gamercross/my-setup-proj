# ADR-0020: 위젯 셸 아키텍처 (배치 엔진 · 위젯 계약)

- 상태: 제안 (2026-09-03)
- 관련: [DASHBOARD_OS.md](../../vision/DASHBOARD_OS.md), FR-WIDGET-01~03·07·08, [ADR-0001](ADR-0001-frontend-react-vite.md), [ADR-0005](ADR-0005-state-zustand.md), [UI_SPEC.md](../../reference/UI_SPEC.md) §3.8

## 맥락
제품을 "고정 패널 대시보드" 에서 "위젯이 움직이는 데스크톱 OS" 로 바꾼다. `Dashboard.jsx` 가 패널을 하드코딩하는 대신, 위젯을 배치·이동·리사이즈하는 **셸**과, 모든 위젯이 따르는 **계약**이 필요하다.

## 결정 (제안)
1. **배치 엔진: `react-grid-layout`(RGL, MIT)** — 드래그·리사이즈·반응형 그리드·레이아웃 직렬화의 사실상 표준. `WidgetHost` 가 RGL 을 감싼다.
   - 기본 12열 그리드, 반응형 브레이크포인트(lg/md/sm). 완전 프리폼(픽셀 자유배치)은 채택 안 함(범위 밖).
2. **위젯 계약** — `frontend/src/widgets/registry.js` 의 항목:
   ```
   { type, name, icon, description,
     defaultSize:{w,h}, minSize:{w,h}, maxSize:{w,h},
     view: React.Component,        // props: { instanceId, config, data-hooks 결과 }
     configSchema,                 // 테마 + 표시 옵션의 허용 키·타입 (검증용)
     useData }                     // 이 위젯이 구독할 도메인 스토어/엔드포인트
   ```
3. **컴포넌트 계층**
   ```
   WidgetShell        편집모드 토글 · 위젯 피커 · 레이아웃 스토어 연결
     └ WidgetHost     RGL 래퍼 · onLayoutChange → useLayoutStore
         └ WidgetFrame  타이틀바(⚙️ ─ ✕) · per-widget ErrorBoundary · Suspense
             └ <view>   레지스트리의 뷰 (기존 TaskList/ProjectCard/… 재사용)
   ```
4. **상태 분리** — 레이아웃/편집모드/포커스 = `useLayoutStore`(zustand, UI 상태). 위젯 데이터 = 기존 도메인 스토어(`useTaskStore` 등, server 상태). 섞지 않는다.
5. **격리** — 위젯마다 `ErrorBoundary` + 데이터 4상태. 한 위젯 실패가 셸에 전파 금지(FR-WIDGET-07).

## 근거
- RGL 은 React 18 호환, 예제·문서 풍부, `layouts` 직렬화가 [ADR-0021](ADR-0021-widget-layout-persistence.md) 영속화와 바로 맞물린다.
- 레지스트리 패턴으로 새 위젯 = 항목 추가 → `Dashboard.jsx` 비대화([DESIGN.md](../DESIGN.md) §1) 를 구조로 차단.
- 기존 뷰 컴포넌트를 그대로 위젯 뷰로 재사용 → 재작성 최소.

## 대안
- **직접 구현(드래그/리사이즈 로직 자작):** 학습엔 좋지만 스냅·충돌·반응형·접근성까지 재발명. 강의 시간 대비 비효율.
- **golden-layout / dockview(도킹 탭):** IDE식 도킹은 "데스크톱 위젯" UX 와 다르고 무겁다.
- **완전 프리폼 창 매니저:** z-order·겹침·리사이즈 전부 자작. 범위 밖([DASHBOARD_OS.md](../../vision/DASHBOARD_OS.md) §6).
- **CSS Grid + 순서만 바꾸기:** 리사이즈·자유 배치 불가 → 요구사항(FR-WIDGET-01) 미충족.

## 결과 / 트레이드오프
- 의존성 추가: `react-grid-layout` + `react-resizable`(peer). 번들 크기 증가(수십 KB) — 위젯 셸 전용 청크로 분리.
- RGL 은 CSS 를 import 해야 함(`react-grid-layout/css/styles.css`) — Vite 에서 처리.
- RGL 레이아웃 모델(`{i,x,y,w,h}`)에 z-order·minimized 는 없다 → `useLayoutStore` 가 별도 필드로 관리하고 병합.
- 접근성(키보드로 위젯 이동)은 후속 — 1차는 마우스/터치.
- 재검토: 멀티 워크스페이스나 위젯 겹침이 필요해지면 배치 엔진 재평가.
