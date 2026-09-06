// 위젯 테마 → CSS 변수 매핑 (ADR-0022)
// - C5 에서는 골격만. 항상 빈 객체를 돌려준다 (WidgetFrame 이 호출 지점만 확보).
// - C6 에서 theme(다크/라이트/커스텀 accent 등) 를 { '--widget-bg': ..., '--widget-fg': ... } 형태로 변환한다.

export function themeToVars(theme) {
  // C6: theme 값에 따라 CSS 변수 객체를 반환하도록 구현 예정
  void theme;
  return {};
}
