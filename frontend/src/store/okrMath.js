// OKR 달성률 계산 (순수 함수). 백엔드 backend/src/services/okr.js 와 같은 공식을 유지한다.
//   krPct = target > 0 ? clamp(current / target, 0, 1) : 0
//   objectivePct = 하위 KR pct 의 산술 평균 (하위 0개면 0)
//   버킷 경계: round3 후 값으로 pct >= 0.9 → high, >= 0.4 → mid, 그 외 low

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// 소수 셋째 자리에서 반올림 (백엔드와 동일)
export function round3(x) {
  return Math.round(x * 1000) / 1000;
}

export function krPct(kr) {
  const target = Number(kr && kr.target);
  const current = Number(kr && kr.current);
  if (!(target > 0)) return 0;
  return clamp01(current / target);
}

export function objectivePct(krs) {
  if (!Array.isArray(krs) || krs.length === 0) return 0;
  const sum = krs.reduce((acc, kr) => acc + krPct(kr), 0);
  return sum / krs.length;
}

// KR 배열 → { krAvgPct, objectiveCount, keyResultCount, bucket:{high,mid,low} }
// objectiveCount 는 호출부에서 채운다 (여기서는 KR 만 안다).
export function summarize(allKrs, objectiveCount = 0) {
  const krs = Array.isArray(allKrs) ? allKrs : [];
  const pcts = krs.map((kr) => round3(krPct(kr)));
  const krAvgPct = pcts.length
    ? round3(pcts.reduce((a, b) => a + b, 0) / pcts.length)
    : 0;
  const bucket = { high: 0, mid: 0, low: 0 };
  for (const p of pcts) {
    if (p >= 0.9) bucket.high += 1;
    else if (p >= 0.4) bucket.mid += 1;
    else bucket.low += 1;
  }
  return { krAvgPct, objectiveCount, keyResultCount: krs.length, bucket };
}

// 0~1 실수를 '84.4%' 같은 소수 한 자리 문자열로 (UI 표기, FR-OKR-03 AC-5)
export function formatPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0%';
  return `${Math.round(n * 1000) / 10}%`;
}
