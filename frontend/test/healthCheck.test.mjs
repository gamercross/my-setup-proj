// 백엔드 헬스체크 폴링 테스트 (TC-TOPO-03·04) — ADR-0016 결정 2항

import test from 'node:test';
import assert from 'node:assert/strict';

import { waitForHealth } from '../src/main/healthCheck.js';

// 가짜 시계: sleep 이 호출될 때마다 now 를 그만큼 앞당긴다 (실제 대기 없이 타임아웃 흐름 검증)
function makeFakeClock(startMs = 0) {
  let current = startMs;
  const now = () => current;
  const sleep = (ms) => {
    current += ms;
    return Promise.resolve();
  };
  return { now, sleep };
}

test('TC-TOPO-03: 3번째 호출에서 200 → true 반환', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls < 3) return { ok: false, status: 503 };
    return { ok: true, status: 200 };
  };
  const { now, sleep } = makeFakeClock();

  const ok = await waitForHealth({
    url: 'http://127.0.0.1:3000/api/health',
    timeoutMs: 10000,
    intervalMs: 250,
    fetchImpl,
    now,
    sleep,
  });

  assert.equal(ok, true);
  assert.equal(calls, 3);
});

test('TC-TOPO-04: 계속 실패하는 fetch + timeoutMs=300 → false 반환, 폴링 중단', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    throw new Error('연결 거부');
  };
  const { now, sleep } = makeFakeClock();

  const ok = await waitForHealth({
    url: 'http://127.0.0.1:3000/api/health',
    timeoutMs: 300,
    intervalMs: 100,
    fetchImpl,
    now,
    sleep,
  });

  assert.equal(ok, false);
  // 300ms 타임아웃, 100ms 간격 → 최대 3회 정도 시도 후 중단 (무한 폴링 아님)
  assert.ok(calls <= 4, `호출 횟수가 과도합니다: ${calls}`);
});
