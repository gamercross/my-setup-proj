// 재기동 백오프 스케줄 테스트 (TC-TOPO-05) — ADR-0016 결정 3항

import test from 'node:test';
import assert from 'node:assert/strict';

import { nextDelay, BACKOFF_MS, MAX_AUTO_RESTARTS } from '../src/main/backoff.js';

test('TC-TOPO-05: nextDelay → [1000,2000,4000,null]', () => {
  assert.equal(nextDelay(0), 1000);
  assert.equal(nextDelay(1), 2000);
  assert.equal(nextDelay(2), 4000);
  assert.equal(nextDelay(3), null);
  assert.equal(nextDelay(4), null);
  assert.deepEqual(BACKOFF_MS, [1000, 2000, 4000]);
  assert.equal(MAX_AUTO_RESTARTS, 3);
});
