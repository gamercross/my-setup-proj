// 점그리드 진행바 계산 로직 (순수 함수).
// UI 컴포넌트와 분리해 두면 규칙(clamp·반올림·total 정규화)을 한 곳에서 고정할 수 있고
// DotProgress 가 "점 개수"와 "채움 개수"에 같은 규칙을 쓰도록 강제할 수 있다.

// 비정상 total(0 이하·비정수·NaN)은 기준값 20 으로 되돌린다.
export function normalizeTotal(total) {
  if (!Number.isInteger(total) || total <= 0) return 20;
  return total;
}

// 진행도 입력을 0~100 정수로 정규화한다. 숫자로 못 바꾸면(NaN·'abc' 등) 0.
export function clampPct(pct) {
  let v = Number(pct);
  if (Number.isNaN(v)) v = 0;
  v = Math.max(0, Math.min(100, v));
  return Math.round(v);
}

// 채울 점 개수.
export function dotFill(pct, total = 20) {
  const t = normalizeTotal(total);
  return Math.round((clampPct(pct) / 100) * t);
}
