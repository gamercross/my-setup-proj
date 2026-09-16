// 백엔드 재기동 백오프 스케줄 (ADR-0016 결정 3항) — 순수 함수.
// 자동 재기동은 최대 3회, 간격은 1s → 2s → 4s. 3회 초과 시 자동 재기동을 멈춘다
// (수동 "재시도" 는 backendSupervisor.retry() 가 attempts 를 0으로 초기화해 별도로 처리).

const BACKOFF_MS = [1000, 2000, 4000];
const MAX_AUTO_RESTARTS = BACKOFF_MS.length;

// attempt: 지금까지 실패한 횟수(0-based, 직전 exit 이전까지의 실패 누적).
// attempt=0 → 1000, 1 → 2000, 2 → 4000, 3 이상 → null(자동 재기동 중단, failed 상태로 전이).
function nextDelay(attempt) {
  if (attempt < 0 || attempt >= MAX_AUTO_RESTARTS) return null;
  return BACKOFF_MS[attempt];
}

module.exports = { BACKOFF_MS, MAX_AUTO_RESTARTS, nextDelay };
