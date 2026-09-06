// 위젯 테마 프리셋 (C6 — FR-WIDGET-05)
// - 각 theme 은 themeToVars 화이트리스트 키만 담는다.
// - 전역 --accent(#f59e0b) 는 그대로 두고, 보라(#7c6cf5)는 '강조' 프리셋 accent 에만 쓴다.

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
