// 라인차트 경로 계산 테스트 (TC-P8-LINE-01~03).

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLinePath } from '../src/components/linePath.js';

test('TC-P8-LINE-01: 0개 점이면 null', () => {
  assert.equal(buildLinePath([]), null);
  assert.equal(buildLinePath(undefined), null);
});

test('TC-P8-LINE-02: 1개 점이면 점만, d 는 빈 문자열', () => {
  const m = buildLinePath([{ month: '2026-07', krAvgPct: 0.5 }]);
  assert.equal(m.dots.length, 1);
  assert.equal(m.d, '');
  assert.equal(m.yTicks.length, 3);
});

test('TC-P8-LINE-03: N개 점이면 M...L 경로 + 점 좌표 단조 증가', () => {
  const m = buildLinePath(
    [
      { month: '2026-06', krAvgPct: 0.2 },
      { month: '2026-07', krAvgPct: 0.6 },
      { month: '2026-08', krAvgPct: 1 },
    ],
    { width: 300, height: 100, padding: 20 }
  );
  assert.equal(m.dots.length, 3);
  assert.match(m.d, /^M .* L .* L /);
  assert.ok(m.dots[0].x < m.dots[1].x && m.dots[1].x < m.dots[2].x);
  // pct 클수록 y 는 작다 (위로)
  assert.ok(m.dots[0].y > m.dots[2].y);
});
