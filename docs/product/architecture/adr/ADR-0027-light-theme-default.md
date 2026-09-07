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
- **P3 범위:** `[data-theme="dark"]` 블록은 **정의만** 한다. 전역 라이트/다크 전환 UI
  (셸 바 토글 또는 C6 프리셋 연동)는 후속 스텝 — P3 는 라이트 고정.
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
| `--card-radius` | `10px` (P3 유지) → `16px` (P4) | 〃 | 카드 모서리 — 상향은 P4 카드 정리에서 |
| `--radius` / `--pad` | `8px` / `10px` (유지) | 〃 | 일반 모서리 / 위젯 패딩 |
| `--chip-radius` | `999px` | `999px` | 칩/필 (P4 칩 컴포넌트 대비) |

- **P4 로 미루는 것:** `--card-radius` 10→16, `--shadow-card`, 스탯 타일 숫자·점-그리드 진행바 컴포넌트, 카드 여백 정리. P3 는 **팔레트 전환 + hex→토큰 치환**까지만.

## 결과 / 트레이드오프
- P3 는 팔레트(다크→라이트) + 하드코딩 hex → `var(--*)` 치환. 인라인 style 이 많아 파일 수가 많다.
- `index.html` 의 `body` 초기 배경(`#0f172a`→`#f7f7f5`)·로딩 문구 색.
- `DiagramPanel` mermaid `PALETTE` 상수를 라이트 값으로.
- 웹 데모의 첫인상이 라이트로 바뀐다 — 목표대로.
- `UI_STYLE.md` v2 개정(Cowork → 노션 위젯 라이트)은 **별도 커밋/PR**.
- 전역 다크 토글 UI 는 후속 스텝.

## 채택 시 영향 (P3 실제 변경)
`frontend/src/styles.css`(`:root` v2 + `[data-theme=dark]` 블록), `index.html`,
`App.jsx`, `components/{WidgetShell,WidgetPicker,WidgetFrame,WidgetSettings,TaskForm,ProjectForm,CalendarWidget,DiagramPanel,ErrorBoundary}.jsx`,
`docs/product/reference/UI_SPEC.md §1`.
