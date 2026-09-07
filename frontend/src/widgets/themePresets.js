// 위젯 테마 프리셋 (C6 — FR-WIDGET-05)
// - 각 theme 은 themeToVars 화이트리스트 키만 담는다.
// - 전역 --accent 는 파랑 #2f6feb (ADR-0027 라이트 테마, US-1 종결). 아래 프리셋 값은
//   위젯별 오버라이드용이며 P3 범위 밖이라 손대지 않는다 — 라이트 정합은 P4 에서.

export const THEME_PRESETS = [
  {
    id: 'dark',
    name: '다크',
    theme: { bg: '#0b1220', accent: '#38bdf8', text: '#e2e8f0', radius: 8, density: 'comfortable', titlebar: 'solid' },
  },
  {
    id: 'minimal',
    name: '미니멀',
    theme: { bg: '#0f172a', accent: '#94a3b8', text: '#cbd5e1', radius: 4, density: 'compact', titlebar: 'ghost' },
  },
  {
    id: 'accent',
    name: '강조',
    theme: { bg: '#171233', accent: '#7c6cf5', text: '#ede9fe', radius: 14, density: 'comfortable', titlebar: 'solid' },
  },
];

// id → 프리셋 (없으면 null)
export function getPreset(id) {
  return THEME_PRESETS.find((p) => p.id === id) ?? null;
}
