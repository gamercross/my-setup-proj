# ADR-0032: 사이드바 셸 + 주제별 위젯 레이아웃

- 상태: **제안** (2026-09-08) — 개인 OS. 사용자 결정: US-5(사이드바 그룹 구성), US-6(rail 모드 범위).
- 관련: [UI_STYLE.md](../../reference/UI_STYLE.md) v2, [UI_SPEC.md](../../reference/UI_SPEC.md) §1, [ADR-0020](ADR-0020-widget-shell-architecture.md)(위젯 셸), [ADR-0021](ADR-0021-widget-layout-persistence.md)(레이아웃 영속화), [ADR-0027](ADR-0027-light-theme-default.md)(라이트 테마), [DASHBOARD_OS.md](../../vision/DASHBOARD_OS.md) DO-1~3, FR-UI-01, FR-WIDGET-01~06

## 맥락

지금 앱은 **화면 1개 · 라우팅 없음**([UI_SPEC.md](../../reference/UI_SPEC.md) §1). `App.jsx` 가
`ErrorBoundary > WidgetShell` 하나를 렌더하고, `WidgetShell` 이 단일 `react-grid-layout` 그리드에
모든 위젯을 올린다. 레이아웃은 `localStorage 'dashboard.layout.v1'` 키 하나([ADR-0021](ADR-0021-widget-layout-persistence.md)).
헤더는 우측 상단에 연결 상태 표시뿐이고 네비게이션 크롬이 없다.

사용자가 [UI_STYLE.md](../../reference/UI_STYLE.md) v2 로 제시한 방향("Confidency OS" 스타일 스크린샷):

1. **왼쪽 그룹형 사이드바** — 브랜드 블록 + 검색 + 그룹 헤더(COMMAND/PLAN/AGENT…) + 아이콘 리스트 + 하단 사용자 블록.
2. 사이드바의 **각 주제 항목이 자기 화면**을 연다("각 주제별로 고정 가이드들이 왼쪽 가이드 라인").
3. 그 화면 안의 **위젯들은 그대로 커스터마이즈 가능**해야 한다("그 위젯들을 우리가 커스텀 마이징").
4. 항목별 **기본 위젯 세트(초안 내용)** 는 우리가 채운다 — 빈 화면 금지.

즉 위젯 셸([ADR-0020](ADR-0020-widget-shell-architecture.md))은 유지하되, **셸이 N개의 주제별
인스턴스로 갈라지고 그 위에 네비게이션 크롬이 붙는다.** 제품 방향(개인 생산성 OS)·강조색·테마는
불변([UI_STYLE.md](../../reference/UI_STYLE.md) v2 §1, [ADR-0027](ADR-0027-light-theme-default.md) PO-2).

## 결정

### 1. 셸 구조 — 사이드바 + 주제별 그리드

```
App.jsx
└─ ErrorBoundary (전역)
   └─ AppShell.jsx            ← 신규: 좌 Sidebar + 우 <TopicView>
      ├─ Sidebar.jsx          ← 신규: 브랜드 블록 · 검색(표시만) · 그룹 네비 · 사용자 블록
      └─ TopicView.jsx        ← 신규: 페이지 헤더(제목·부제·Live 캡션·편집토글) + WidgetShell(topicId)
         └─ WidgetShell.jsx   ← 기존. prop `topicId` 추가, 그 주제의 레이아웃만 구독
            └─ WidgetHost → WidgetFrame ×N (변경 없음)
```

- **`WidgetShell` 은 재사용한다.** 편집 모드·위젯 피커·`WidgetFrame`·`react-grid-layout` 그대로.
  달라지는 것은 "어느 레이아웃을 읽고 쓰는가" 뿐 → `topicId` 로 스코프.
- 위젯 계약([ADR-0020](ADR-0020-widget-shell-architecture.md))·4상태·per-widget `ErrorBoundary`·테마
  주입([ADR-0022](ADR-0022-per-widget-theming.md))은 **불변**.

### 2. 네비게이션 모델 — 라우팅 없이 `activeTopic` state

- 라이브러리 라우터(react-router 등) **도입 안 함**. `useUiStore` 에 `activeTopic: string` 하나.
  Sidebar 클릭 → `setActiveTopic(id)`. Electron 단일 창·화면 1개 원칙과 충돌 최소.
- 딥링크·뒤로가기 요구 없음(사용자 1명·데스크톱). 마지막 선택 주제는 `localStorage` 로 복원.
- 주제 목록은 **정적 레지스트리**(`topics.js`): `{ id, label, icon, group }`.
  그룹·항목 최종 구성은 [UI_STYLE.md](../../reference/UI_STYLE.md) v2 §4 초안 → **US-5 로 확정.**

### 3. 주제별 레이아웃 영속화 — [ADR-0021](ADR-0021-widget-layout-persistence.md) 확장

- 저장 키를 **주제별로 네임스페이스**: `localStorage 'dashboard.layout.v2'` 아래
  `{ [topicId]: { instances, layouts, config } }` (기존 단일 객체 → 주제 맵).
- **마이그레이션**: 기존 `'dashboard.layout.v1'` 이 있으면 그 내용을 `overview` 주제로 이관하고
  `v2` 로 승격, `v1` 키 삭제. ([ADR-0018](ADR-0018-schema-migration-strategy.md) 순방향 전용 정신 — 1회성 코드.)
- 단계 2 (SQLite `widget_layouts`) 도 `topic_id` 컬럼 추가로 확장 — 이번 범위 아님.
- **기본 레이아웃**: `defaultLayout.js` 를 `defaultLayouts[topicId]` 로. 각 주제는
  비어있지 않은 시작 세트를 가진다(요구 4). 미정의 주제는 빈 그리드 + 피커 안내.

### 4. DO-2 (타입당 위젯 1개) 재해석

- 제약은 **주제(그리드) 단위로 적용**한다. 같은 위젯 타입을 서로 다른 주제에 하나씩 두는 것은 허용
  (예: `overview` 와 `할 일` 둘 다 `tasks` 위젯 — 같은 스토어 구독, 다른 표현).
- 한 주제 그리드 안에서는 여전히 타입당 1개. `WidgetPicker` 의 `activeTypes` 를 현재 주제 기준으로 계산.
- [DASHBOARD_OS.md](../../vision/DASHBOARD_OS.md) DO-2 에 이 각주를 추가한다.

### 5. 시각 — [UI_STYLE.md](../../reference/UI_STYLE.md) v2

- Sidebar: `--sidebar-w: 240px`, 활성 항목 `--nav-active-bg`(옅은 회색 알약) + 좌측 4px 파랑 인디케이터.
  강한 색 채움 금지.
- 페이지 헤더: 아이콘 + H1 + 한 줄 부제, 우측 `● Live`/새로고침 캡션 + 편집 모드 토글.
- **US-6 (rail 접기 모드)** 기본값 = **후속 범위** (v2 는 고정 폭).
- **US-7 (⌘K 검색)** 기본값 = **표시만** (동작은 후속).

## 대안

- **react-router + URL 경로**: 딥링크·히스토리 이득 있으나 데스크톱 단일 사용자엔 과함, 번들 증가,
  Electron `file://` 경로 처리 부담. → 기각. `activeTopic` state 로 충분.
- **주제 = 위젯 피커의 필터(태그)일 뿐, 그리드는 1개 유지**: 커스터마이즈가 주제별로 독립하지 않음
  → 요구 2·3 미충족. → 기각.
- **주제별로 완전히 다른 컴포넌트(위젯 셸 아님)**: 커스터마이즈 불가 → 요구 3 위반. → 기각.

## 결과 / 트레이드오프

- `WidgetShell`/`useLayoutStore` 에 `topicId` 스코프가 들어가 스토어 구조가 한 겹 깊어진다.
  공개 셀렉터를 유지해 `WidgetFrame`·뷰 컴포넌트는 무수정 목표.
- 레이아웃 저장 키 마이그레이션(v1→v2) 코드와 테스트 필요(TC-SHELL-*).
- 데모(`demoClient.js`/`demoData.js`)는 주제별 기본 레이아웃만 추가하면 자연히 맞음(서버 무관, UI 상태).
- 네비게이션이 생기지만 **화면 수는 여전히 "논리적으로 1개"**(라우팅 없음) — [UI_SPEC.md](../../reference/UI_SPEC.md) §1 표현을
  "화면 1개(주제 전환 = 본문 그리드 교체)" 로 갱신.

## 채택 시 영향

`frontend/src/App.jsx`(셸 교체), `frontend/src/components/{AppShell,Sidebar,TopicView}.jsx`(신규),
`frontend/src/components/WidgetShell.jsx`(`topicId` prop), `frontend/src/widgets/topics.js`(신규 레지스트리),
`frontend/src/widgets/{defaultLayout,layoutStorage}.js`(주제 네임스페이스 + v1→v2 마이그레이션),
`frontend/src/store/useLayoutStore.js`(주제 스코프) · `useUiStore.js`(신규, `activeTopic`),
`frontend/src/styles.css`(`--sidebar-w` 등 v2 토큰), `frontend/src/api/demoClient.js`(주제별 기본 레이아웃),
`docs/product/reference/UI_SPEC.md` §0·§1·§3(사이드바·페이지 헤더·주제 전환),
`docs/product/reference/UI_STYLE.md`(이미 v2), `docs/product/vision/DASHBOARD_OS.md`(DO-2 각주),
`docs/product/requirements/{UI.md,WIDGET.md}`(FR-UI-01·FR-WIDGET-04 주제 스코프),
`docs/product/TRACEABILITY.md` · `docs/product/testing/TEST_PLAN.md`(TC-SHELL-*).
