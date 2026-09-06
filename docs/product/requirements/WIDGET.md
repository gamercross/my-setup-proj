# 요구사항 상세 — 위젯 셸 (WIDGET)

> 도메인: 대시보드 OS 의 위젯 셸(배치·생명주기·영속화)과 위젯별 커스터마이즈.
> 개념·배경은 [DASHBOARD_OS.md](../vision/DASHBOARD_OS.md), 요약표는 [REQUIREMENTS_FUNCTIONAL.md](REQUIREMENTS_FUNCTIONAL.md) §9,
> 화면은 [UI_SPEC.md](../reference/UI_SPEC.md) §3.8~3.10, 결정은 [ADR-0020~0022](../architecture/adr/).
>
> 상태: FR-WIDGET-01~08 ✅ (Phase C5~C6, 2026-09-06). FR-WIDGET-05·06 은 C6 에서 완료. DO-1~6 결정 완료 ([DASHBOARD_OS.md](../vision/DASHBOARD_OS.md) §8).

관련: 기존 [UI.md](UI.md)(FR-UI-01·04 의 "영역별 4상태·격리" 원칙을 위젯 단위로 계승).

---

## FR-WIDGET-01 — 위젯 배치 (이동·리사이즈)

**우선순위** P1 · **목표 주차** W4~5 (Phase C5) · **상태** ✅ (C5)

사용자로서 나는 위젯을 원하는 위치·크기로 두고 싶다, 나에게 중요한 정보를 크게 보기 위해.

- **AC-1** Given 편집 모드, When 위젯 타이틀바를 드래그, Then 그리드에 스냅되며 이동하고 다른 위젯과 겹치면 자동으로 밀린다.
- **AC-2** Given 편집 모드, When 위젯 모서리 핸들을 드래그, Then 위젯 타입의 min/max 크기 안에서 리사이즈된다.
- **AC-3** Given 편집 모드가 아님(잠금), When 위젯 본문을 드래그, Then 이동하지 않고 본문 스크롤/상호작용만 된다.
- **AC-4** When 창 너비가 좁아짐, Then `WidthProvider` 가 컨테이너 폭에 맞춰 위젯을 세로로 재배치한다. (저장 레이아웃은 단일 브레이크포인트 `lg` 하나 — 브레이크포인트 드리프트 방지.)
- **엣지** 위젯이 뷰포트 밖으로 나가면 저장 시 보이는 영역으로 clamp.

## FR-WIDGET-02 — 위젯 추가·제거 (생명주기)

**우선순위** P1 · **목표 주차** W4~5 · **상태** ✅ (C5)

- **AC-1** When "+ 위젯" 클릭, Then 레지스트리에 등록된 위젯 타입 목록(이름·아이콘·설명)이 뜬다.
- **AC-2** When 타입 선택, Then 기본 크기의 위젯 인스턴스가 빈 자리에 추가되고 즉시 데이터를 로드한다.
- **AC-3** When 위젯 타이틀바의 ✕ 클릭, Then 제거되고 레이아웃이 저장된다. 도메인 데이터는 삭제하지 않는다.
- **AC-4** When 타이틀바의 ─ 클릭, Then 위젯이 최소화(타이틀바만)되고, 다시 클릭하면 이전 높이로 복원된다.
- **AC-5** DO-2: 타입당 인스턴스 1개(인스턴스 id = 타입 id). 이미 추가된 타입은 피커에서 비활성("이미 추가됨").

## FR-WIDGET-03 — 위젯 포커스·스택

**우선순위** P2 · **목표 주차** W5 · **상태** ✅ (C5)

- **AC-1** When 위젯을 클릭, Then 그 위젯이 최상단(z 최대)이 되고 포커스 표시(테두리)된다.
- **AC-2** 리사이즈/이동 중인 위젯은 항상 최상단.

## FR-WIDGET-04 — 레이아웃 영속화

**우선순위** P1 · **목표 주차** W4~5 · **상태** ✅ (C5)

사용자로서 나는 앱을 다시 켰을 때 내가 만든 배치가 그대로 있길 바란다.

- **AC-1** When 위젯을 이동/리사이즈/추가/제거/최소화, Then 변경이 300ms 디바운스 후 저장된다.
- **AC-2** When 앱 재시작, Then 마지막 레이아웃(위치·크기·z·최소화·config)이 복원된다.
- **AC-3** Given 저장된 레이아웃이 없음(첫 실행), Then 기본 레이아웃(할일·프로젝트·캘린더 위젯)이 적용된다.
- **AC-4** Given 저장된 레이아웃이 손상됨/파싱 실패, Then 기본 레이아웃으로 폴백하고 경고를 남긴다(크래시 없음).
- **AC-5** 저장 위치는 [ADR-0021](../architecture/adr/ADR-0021-widget-layout-persistence.md) 결정을 따른다(1차 localStorage).
- **AC-6** "레이아웃 초기화" 액션으로 기본값으로 되돌릴 수 있다.

## FR-WIDGET-05 — 위젯별 테마 커스터마이즈

**우선순위** P1 · **목표 주차** W5~6 · **상태** ✅ (C6, 2026-09-06)

사용자로서 나는 위젯마다 색·밀도·모서리를 다르게 하고 싶다, 한눈에 구분하고 취향에 맞추기 위해.

> 구현: `components/WidgetSettings.jsx`(createPortal 중앙 모달, 테마/표시 탭) · `widgets/themeVars.js`(`themeToVars`/`THEME_KEYS` 화이트리스트) · `widgets/themePresets.js`(다크·미니멀·강조). 색은 `<input type="color">`, 나머지 select/range/checkbox — 자유 텍스트 0개(AC-6). titlebar solid/ghost/hidden 은 `WidgetFrame` 인라인 style. 편집 모드에서는 `titlebar:'hidden'` 이어도 타이틀바를 유지한다(⚙·✕ 접근).

- **AC-1** When 위젯 ⚙️ → 테마 탭, Then 배경색·강조색·모서리·밀도(comfortable/compact)·타이틀바(solid/ghost/hidden)를 조정할 수 있다.
- **AC-2** When 값 변경, Then 해당 위젯에만 즉시 반영된다(다른 위젯·전역 무변).
- **AC-3** 값은 위젯 인스턴스 `config.theme` 에 저장되고 FR-WIDGET-04 로 영속화된다.
- **AC-4** 프리셋 테마(최소 3개: 다크·미니멀·강조)를 한 번에 적용할 수 있고, 이후 개별 조정 가능.
- **AC-5** "테마 초기화" 로 전역 기본으로 되돌린다.
- **AC-6** 커스터마이즈는 [ADR-0022](../architecture/adr/ADR-0022-per-widget-theming.md) 의 스코프된 CSS 변수 방식을 쓰며, 임의 CSS 문자열 입력은 받지 않는다(주입 방지).

## FR-WIDGET-06 — 위젯별 표시 옵션

**우선순위** P2 · **목표 주차** W6 · **상태** ✅ (C6, 2026-09-06)

- **AC-1** When 위젯 ⚙️ → 표시 탭, Then 위젯 타입별 옵션을 조정한다.
  - 할일: 정렬 기준(마감/우선순위/생성), 완료 항목 숨김, 최대 표시 개수
  - 프로젝트: 상태 필터, 완료 프로젝트 숨김
  - 캘린더: 표시 범위(오늘/이번주). ※ "종일 일정 포함" 은 스키마에 `all_day` 컬럼이 없어 C6 범위에서 제외 (WIDGET.md 각주)
  - 메일: 계정 필터, 최대 개수 — 메일 위젯 미구현이라 `configSchema` 없음
  - 브리핑: 없음(전체 표시) — 브리핑 위젯 미구현
- **AC-2** 옵션은 `config.display` 에 저장·영속화된다.
- **AC-3** 알 수 없는 옵션 키는 무시한다(스키마 진화 대비) — `widgets/displayConfig.js` 의 `resolveDisplay(SCHEMA, config?.display)` 단일 지점에서 타입·범위 검증. `config.display` 는 클라이언트 필터/정렬만, 스토어 fetch 계약은 불변.

## FR-WIDGET-07 — 위젯 격리 (에러·로딩)

**우선순위** P0 · **목표 주차** W4~5 · **상태** ✅ (C5)

기존 FR-UI-04 원칙을 위젯 단위로 승격.

- **AC-1** When 한 위젯의 데이터 요청 실패, Then 그 위젯 안에만 `ErrorBanner` + 재시도가 뜨고 다른 위젯은 정상 렌더된다.
- **AC-2** When 한 위젯의 뷰 컴포넌트가 렌더 예외, Then 위젯별 `ErrorBoundary` 가 잡아 그 위젯만 폴백 표시, 셸과 다른 위젯은 살아있다.
- **AC-3** 각 위젯은 로딩/비어있음/정상/에러 4상태를 독립 렌더한다.

## FR-WIDGET-08 — 위젯 레지스트리 (확장 지점)

**우선순위** P2 · **목표 주차** W5 · **상태** ✅ (C5)

개발자로서 나는 새 위젯을 셸 코드 수정 없이 추가하고 싶다.

- **AC-1** `frontend/src/widgets/registry.js` 에 `{ type, name, icon, description, defaultSize, minSize, maxSize, view, configSchema }` 항목을 추가하면 피커·셸이 자동 인식한다. (데이터 구독 훅은 두지 않는다 — 뷰가 자기 스토어를 직접 구독.)
- **AC-2** 레지스트리에 없는 `widget_type` 이 저장된 레이아웃에 있으면 그 위젯만 "알 수 없는 위젯" 으로 표시(제거 가능), 나머지는 정상.
- **AC-3** 위젯 뷰는 1st-party 코드만. 동적 원격 로딩 없음(NFR-SEC-04).

---

## 비기능 연계

| NFR | 위젯 셸에서의 의미 |
|---|---|
| NFR-PERF-01 | 위젯 6개 초기 렌더 ≤ 1초. 드래그 60fps. |
| NFR-PERF-03 | 위젯 내부 목록 500건까지 위젯 스크롤로 처리(가상화). |
| NFR-REL-02 | 한 위젯 실패가 셸/다른 위젯에 전파 안 됨(FR-WIDGET-07). |
| NFR-SEC-04 | config 는 구조화된 값만. CSS/HTML 문자열 입력 금지. |
| NFR-MAINT-02 | 셸 · 레지스트리 · 위젯 뷰 · 도메인 스토어 계층 분리. |

---

**작성:** 2026-09-03
