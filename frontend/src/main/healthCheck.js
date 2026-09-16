// 백엔드 헬스체크 폴링 (ADR-0016 결정 2항)
// - /api/health 200 을 받을 때까지 폴링하되, 10초(기본) 안에 못 받으면 false 로 끝낸다(무한 대기 금지).
// - 연결 거부(아직 기동 중)는 정상 경로로 보고 조용히 재시도, 마지막에만 1줄 로그.

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth({
  url,
  timeoutMs = 10000,
  intervalMs = 250,
  fetchImpl = fetch,
  now = Date.now,
  sleep = defaultSleep,
} = {}) {
  const deadline = now() + timeoutMs;
  let lastErr = null;

  while (now() < deadline) {
    try {
      const options = {};
      // 개별 요청이 소켓 대기로 길어져 전체 타임아웃을 늘리지 않도록 요청당 1초로 끊는다.
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        options.signal = AbortSignal.timeout(1000);
      }
      const res = await fetchImpl(url, options);
      if (res && res.ok) return true;
      lastErr = new Error(`응답 상태 ${res && res.status}`);
    } catch (err) {
      lastErr = err;
    }
    await sleep(intervalMs);
  }

  if (lastErr) console.error('백엔드 헬스체크 타임아웃:', lastErr.message);
  return false;
}

module.exports = { waitForHealth };
