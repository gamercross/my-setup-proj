// 위젯 테마 → CSS 변수 매핑 (ADR-0022)
// - 화이트리스트(THEME_KEYS)만 처리한다. for…in 순회 금지 — 고정 배열만 돈다.
// - 색은 정규식 1차 + (있으면) CSS.supports 2차 게이트를 모두 통과해야 한다.
// - themeToVars 는 spread 가능한 평평한 style 객체를 반환한다 (WidgetFrame 호환).

// 처리하는 테마 키 (이 배열에 없는 키는 완전히 무시)
export const THEME_KEYS = ['bg', 'accent', 'text', 'radius', 'density', 'titlebar'];

// 색 문자열 안전성 검사 — #rgb / #rrggbb / rgb() / rgba() 만 허용
const COLOR_RE = /^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|rgb\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\)|rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\))$/;

export function isSafeColor(v) {
  if (typeof v !== 'string') return false;
  if (v.length > 32) return false;
  // url( · expression · 세미콜론 · 중괄호가 있으면 즉시 탈락 (CSS 주입 방지)
  if (/url\(|expression|;|\}|\{/i.test(v)) return false;
  if (!COLOR_RE.test(v.trim())) return false;
  // 브라우저가 있으면 한 번 더 검증 (Node 테스트 환경엔 CSS 없음 — 옵셔널 게이트)
  if (typeof CSS !== 'undefined' && CSS && typeof CSS.supports === 'function') {
    return CSS.supports('color', v.trim());
  }
  return true;
}

// radius → `${n}px` (0–24 clamp). 숫자로 못 읽으면 undefined.
function safeRadius(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  const clamped = Math.max(0, Math.min(24, Math.round(n)));
  return `${clamped}px`;
}

// density enum → 본문 패딩
function safePad(v) {
  if (v === 'comfortable') return '12px';
  if (v === 'compact') return '6px';
  return undefined;
}

// theme 객체 → { '--w-bg', '--w-accent', '--w-text', '--w-radius', '--w-pad' }
// 검증 실패한 키는 생략한다 (WidgetFrame 의 var(..., 전역기본) 폴백이 받는다).
export function themeToVars(theme) {
  if (!theme || typeof theme !== 'object' || Array.isArray(theme)) return {};
  const out = {};
  for (const key of THEME_KEYS) {
    const v = theme[key];
    if (v == null) continue;
    if (key === 'bg' && isSafeColor(v)) out['--w-bg'] = v.trim();
    else if (key === 'accent' && isSafeColor(v)) out['--w-accent'] = v.trim();
    else if (key === 'text' && isSafeColor(v)) out['--w-text'] = v.trim();
    else if (key === 'radius') {
      const r = safeRadius(v);
      if (r !== undefined) out['--w-radius'] = r;
    } else if (key === 'density') {
      const p = safePad(v);
      if (p !== undefined) out['--w-pad'] = p;
    }
    // titlebar(solid/ghost/hidden)는 WidgetFrame 이 인라인 style 로 처리 — 변수 아님
  }
  return out;
}
