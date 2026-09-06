# ADR-0022: 위젯별 테마 커스터마이즈 방식

- 상태: 채택 — C6 구현 완료 (2026-09-06)
- 관련: FR-WIDGET-05·06, [ADR-0020](ADR-0020-widget-shell-architecture.md), [ADR-0021](ADR-0021-widget-layout-persistence.md), NFR-SEC-04, [UI_SPEC.md](../../reference/UI_SPEC.md) §1(디자인 토큰)

## 맥락
"각 위젯(앱)을 각자 디자인" 하려면 위젯 인스턴스마다 배경색·강조색·모서리·밀도·타이틀바 스타일을 다르게 줄 수 있어야 한다. 전역 디자인 토큰 1벌만 있는 현재 구조를 확장한다. **임의 CSS 를 사용자가 입력하게 두면 안 된다**(주입·레이아웃 파괴).

## 결정 (채택 — C6 구현 완료)
**스코프된 CSS 커스텀 프로퍼티(변수) + 구조화된 config.**

> ## 구현 현황 (C6, 2026-09-06)
> - `frontend/src/styles.css` — 전역 토큰을 `:root` 로 승격 (기존 hex/px 1:1 치환, 시각 변화 0). `renderer.jsx` 상단 import.
> - `widgets/themeVars.js` — `themeToVars(theme)`(평평한 style 객체 반환, spread 호환), `THEME_KEYS` 고정 배열 순회(`for…in` 안 씀), `isSafeColor`(정규식 + `CSS.supports` 옵셔널 게이트). titlebar solid/ghost/hidden 은 `WidgetFrame` 이 인라인 style 로(styles.css 클래스는 인라인 `TITLEBAR_STYLE` 에 눌려 무효).
> - 뷰 3종은 `configSchema` 를 `WidgetFrame` prop 으로 받는다(뷰→`registry.js` 최상위 import 시 ESM 순환으로 TDZ `ReferenceError` → 부팅 실패 회피).
> - `widgets/themePresets.js` — 다크·미니멀·강조 프리셋. 전역 `--accent`(`#f59e0b`)는 유지, 보라 `#7c6cf5` 는 '강조' 프리셋 accent 에만.
> - `widgets/displayConfig.js` — `resolveDisplay(configSchema, display)` 표시 옵션 검증 단일 지점 (FR-WIDGET-06 AC-3).
> - `components/WidgetSettings.jsx` — `createPortal` 중앙 모달(백드롭 `zIndex:2000`, Esc/백드롭 닫기, `role="dialog"`). 색은 `<input type="color">`, 나머지 select/range/checkbox.
> - `--w-panel`/`panel` 은 화이트리스트에 넣지 않았다(프레임 wrapper bg 만). US-1(앰버→보라 전역 전환)은 미결 유지.

1. **전역 토큰**은 `:root` 에 유지(기본값). `UI_SPEC.md` §1 의 `--bg`/`--panel`/`--accent` 등을 CSS 변수로 승격(현재 인라인 style → 변수).
2. **위젯 프레임**이 인스턴스 `config.theme` 를 **화이트리스트 키만** CSS 변수로 변환해 자기 wrapper 에 인라인으로 건다:
   ```jsx
   <div className="widget" data-widget-id={id} style={themeToVars(config.theme)}>
   ```
   `themeToVars` 가 허용하는 키 (그 외는 버림):
   | config.theme 키 | CSS 변수 | 값 제약 |
   |---|---|---|
   | `bg` | `--w-bg` | 색상 파서 통과값만 (`#rgb`,`#rrggbb`,`rgb()`) |
   | `accent` | `--w-accent` | 〃 |
   | `text` | `--w-text` | 〃 |
   | `radius` | `--w-radius` | 정수 0–24 → `Npx` |
   | `density` | `--w-pad` | `comfortable`→`12px` / `compact`→`6px` (enum) |
   | `titlebar` | (class) | `solid`/`ghost`/`hidden` (enum) |
3. **위젯 내부 CSS**는 `var(--w-bg, var(--panel))` 처럼 **위젯 변수 → 전역 변수 → 하드 기본** 순으로 폴백.
4. **프리셋**: `widgets/themePresets.js` 에 다크·미니멀·강조 등 `config.theme` 객체 상수. 적용 = config 병합.
5. **커스터마이즈 UI**: 색은 컬러 피커, 나머지는 셀렉트/슬라이더. 자유 텍스트 입력 없음(FR-WIDGET-05 AC-6).
6. **검증**: 프론트 `themeToVars` 에서 1차, 저장 시([ADR-0021](ADR-0021-widget-layout-persistence.md) 단계 2) 백엔드에서 동일 화이트리스트로 2차.

## 근거
- CSS 변수는 상속되므로 wrapper 한 곳에만 걸면 위젯 하위 전체에 적용, 다른 위젯엔 무영향(스코프 자연 격리).
- 화이트리스트 + 타입 제약으로 주입 표면 제거(NFR-SEC-04). 색은 파서로 검증해 `url(...)`·`expression` 등 차단.
- 전역 토큰을 CSS 변수로 올리는 작업은 어차피 필요했던 것([UI_SPEC.md](../../reference/UI_SPEC.md) §1 "Week 4+ 통합 예정").

## 대안
- **인스턴스별 `<style>` 주입:** 문자열 CSS → 주입 위험, 정리 어려움.
- **Tailwind 클래스 조합 저장:** 클래스명 화이트리스트도 결국 관리 필요하고 동적 값(임의 색)엔 안 맞음.
- **CSS-in-JS 테마 프로바이더(위젯마다 ThemeProvider):** 런타임 비용, 기존 인라인 style 코드와 충돌.
- **전역 테마만 두고 위젯별은 포기:** 요구사항(FR-WIDGET-05) 미충족.

## 결과 / 트레이드오프
- 전역 인라인 style → CSS 변수 리팩터가 선행 작업으로 필요(위젯 셸 착수와 같은 Phase).
- 색상 파싱 유틸(작게) 필요 — 브라우저 `CSS.supports('color', v)` 활용 가능.
- 접근성: 사용자가 배경·텍스트 대비를 나쁘게 설정할 수 있음 → 커스터마이즈 UI 에 대비 경고(후속).
- 다크/라이트 전역 전환과 위젯 오버라이드의 상호작용은 위젯 변수가 우선(의도된 동작).
