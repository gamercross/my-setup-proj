# ADR-0027: 라이트 테마를 기본으로 전환 + 디자인 토큰 v2

- 상태: **채택** (2026-09-07) — P3 구현. 사용자 결정: PO-1(라이트 기본)·PO-2(강조색 파랑) 채택.
- 관련: [PERSONAL_OS.md](../../vision/PERSONAL_OS.md) T5, [../../reference/UI_STYLE.md](../../reference/UI_STYLE.md), [ADR-0022](ADR-0022-per-widget-theming.md)(위젯별 테마), FR-WIDGET-05/06, Phase 개인 OS P3

## 맥락
현재 앱은 전면 다크(`#0f172a`)다. `styles.css` `:root` 에 토큰이 있지만(C6) 컴포넌트는
대부분 하드코딩 hex 를 쓴다. 사용자가 제시한 시각 목표(노션 위젯 팩 스크린샷)는 전부
**라이트 오프화이트**다 — 흰 카드, 매우 옅은 보더, 큰 굵은 숫자, 점-그리드 진행바, 칩, 여백.

C6 에서 이미 만든 것: `styles.css` `:root` 토큰, `themeToVars` 화이트리스트, `themePresets`
(다크·미니멀·강조), `WidgetSettings` 모달. 이 인프라를 재사용한다.

## 결정

### PO-1 — 라이트를 **기본**으로, 다크는 프리셋 옵션으로 유지 (권장)
- `:root` 기본값을 v2 라이트 토큰으로 재정의.
- `[data-theme="dark"]` 에서 토큰을 대칭적으로 재정의 (다크는 없어지지 않음).
- C6 "다크" 프리셋을 `[data-theme="dark"]` 와 정합.
- 대안(B): 다크 기본 유지 + 라이트 프리셋 추가 → **기각 근거:** 시각 목표가 라이트이고,
  첫인상(데모)이 다크면 목표와 어긋난다.

### PO-2 — `--accent` 를 차분한 파랑 `#2f6feb` 로
- 노션 위젯의 강조 숫자(84.4%)가 파랑 계열.
- US-1(앰버 `#f59e0b` → 보라 `#7c6cf5`)은 **US-1 을 이 ADR 로 흡수해 종결**: 브랜드색을
  앰버도 보라도 아닌 **파랑**으로 확정. `--priority-medium` 은 앰버(`#f59e0b`) 유지 —
  우선순위 배지는 강조색과 독립(C6 에서 이미 이름 분리).

### 디자인 토큰 v2

| 토큰 | 라이트(:root) | 다크([data-theme=dark]) | 용도 |
|---|---|---|---|
| `--bg` | `#f7f7f5` | `#0f172a` | 앱 배경 |
| `--panel` | `#ffffff` | `#1e293b` | 카드·위젯 본문 |
| `--panel-2` | `#f2f2ef` | `#172033` | 중첩 카드·헤더 (신규) |
| `--border` | `#ececec` | `#334155` | 경계 |
| `--text` | `#1a1a1a` | `#e2e8f0` | 본문 |
| `--muted` | `#8a8a8a` | `#94a3b8` | 보조 텍스트 |
| `--accent` | `#2f6feb` | `#60a5fa` | 강조 숫자·활성·[실행] |
| `--ok` | `#2e7d5b` | `#4ade80` | 달성 90%+, 성공 상태 (신규) |
| `--warn` | `#c2691f` | `#fbbf24` | 달성 40~90%, 경고 (신규) |
| `--bad` | `#c23b3b` | `#f87171` | 달성 <40%, 실패 (신규) |
| `--priority-high` | `#ef4444` | `#ef4444` | 우선순위 배지 (불변) |
| `--priority-medium` | `#f59e0b` | `#f59e0b` | 〃 (강조색과 독립) |
| `--priority-low` | `#64748b` | `#94a3b8` | 〃 |
| `--card-radius` | `16px` | `16px` | 카드 모서리 (10 → 16) |
| `--chip-radius` | `999px` | `999px` | 칩/필 (신규) |
| `--shadow-card` | `0 1px 2px rgba(0,0,0,.04)` | `none` | 라이트에서만 아주 옅은 그림자 (신규) |

- **숫자 강조:** `.stat-number { font-weight: 700; font-size: clamp(28px, 4vw, 44px); }`
- **진행 표시:** solid bar 대신 점 그리드 — 별도 컴포넌트(P4).

## 결과 / 트레이드오프
- 컴포넌트의 하드코딩 hex 를 토큰으로 바꾸는 작업이 P3 의 대부분. 인라인 style 이 많아
  파일 수가 많다 (`App.jsx`·`WidgetShell.jsx`·`WidgetFrame.jsx`·각 위젯 뷰·카드 컴포넌트).
- `index.html` 의 `body` 초기 배경(`#0f172a`)과 로딩 문구 색도 라이트로.
- `DiagramPanel`(mermaid)의 테마도 라이트로 — `mermaid.initialize({ theme })` 분기 필요.
- 웹 데모의 첫인상이 바뀐다 — 목표대로.
- `UI_STYLE.md` 를 v2 로 개정(별도 커밋): Cowork → 노션 위젯 라이트, 토큰표 교체, US-1 종결 반영.

## 채택 시 영향
`frontend/src/styles.css`(토큰 전면 v2 + `[data-theme]` 3-상태 — bare `:root` / `@media dark` /
`[data-theme]` override), `index.html`, `App.jsx`·`WidgetShell.jsx`·`WidgetFrame.jsx`,
`widgets/views/*`, `components/{TaskForm,ProjectForm,ProjectCard,CalendarWidget,BriefCard,DiagramPanel}.jsx`,
`widgets/themePresets.js`, `UI_STYLE.md`, `UI_SPEC.md §1`.
