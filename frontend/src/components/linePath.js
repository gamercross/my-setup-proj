// 라인차트 경로 계산 (순수 함수). 인라인 SVG 로 그린다 (PO-8 — 차트 라이브러리 미도입).
// points: [{ [labelKey]: 'YYYY-MM', [valueKey]: 0~1 }] (오름차순)
// valueKey/labelKey 는 하위 호환 옵션 — 기본값은 기존 OKR 추이(month/krAvgPct)와 동일하다.
// 반환: { d, dots:[{x,y,month,label,pct}], yTicks:[{y,label}] } — points 0개면 null.

export function buildLinePath(
  points,
  { width = 320, height = 120, padding = 24, valueKey = 'krAvgPct', labelKey = 'month' } = {}
) {
  const pts = Array.isArray(points) ? points : [];
  if (pts.length === 0) return null;

  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  // y: 0~1 고정 스케일. pct 0 → 바닥, 1 → 천장.
  const yFor = (pct) => padding + innerH * (1 - Math.max(0, Math.min(1, Number(pct) || 0)));
  const xFor = (i) =>
    pts.length === 1 ? padding + innerW / 2 : padding + (innerW * i) / (pts.length - 1);

  const dots = pts.map((p, i) => ({
    x: xFor(i),
    y: yFor(p[valueKey]),
    month: p.month,
    label: p[labelKey],
    pct: Number(p[valueKey]) || 0,
  }));

  // 점 1개면 선 없이 점만.
  const d =
    dots.length === 1
      ? ''
      : dots.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${round(pt.x)} ${round(pt.y)}`).join(' ');

  const yTicks = [0, 0.5, 1].map((v) => ({
    y: yFor(v),
    label: `${Math.round(v * 100)}%`,
  }));

  return { d, dots, yTicks };
}

function round(n) {
  return Math.round(n * 100) / 100;
}
