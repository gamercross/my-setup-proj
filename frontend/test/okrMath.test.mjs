// OKR 달성률 계산 순수 함수 테스트 (TC-P8-MATH-01~05) — 백엔드 공식과 일치해야 한다.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  krPct,
  objectivePct,
  summarize,
  formatPct,
  round3,
  krGrade,
  objectiveGrade,
} from '../src/store/okrMath.js';

test('TC-P8-MATH-01: krPct — 클램프 + target 0', () => {
  assert.equal(krPct({ target: 10, current: 5 }), 0.5);
  assert.equal(krPct({ target: 10, current: 25 }), 1); // 초과 클램프
  assert.equal(krPct({ target: 0, current: 5 }), 0); // target 0 → 0
  assert.equal(krPct({ target: 10, current: -3 }), 0);
});

test('TC-P8-MATH-02: objectivePct — 평균, 빈 배열 0', () => {
  assert.equal(objectivePct([{ target: 10, current: 10 }, { target: 10, current: 0 }]), 0.5);
  assert.equal(objectivePct([]), 0);
});

test('TC-P8-MATH-03: summarize — 버킷 경계 0.9 / 0.4', () => {
  const krs = [
    { target: 10, current: 9 }, // 0.9 high
    { target: 10, current: 4 }, // 0.4 mid
    { target: 10, current: 3.9 }, // 0.39 low
    { target: 0, current: 1 }, // 0 low
  ];
  const s = summarize(krs, 2);
  assert.deepEqual(s.bucket, { high: 1, mid: 1, low: 2 });
  assert.equal(s.objectiveCount, 2);
  assert.equal(s.keyResultCount, 4);
});

test('TC-P8-MATH-04: 반올림은 소수 셋째 자리', () => {
  assert.equal(round3(0.123456), 0.123);
  assert.equal(krPct({ target: 3, current: 1 }) > 0.333 && krPct({ target: 3, current: 1 }) < 0.334, true);
  const s = summarize([{ target: 3, current: 1 }], 1);
  assert.equal(s.krAvgPct, 0.333);
});

test('TC-P8-MATH-05: formatPct — 소수 한 자리 % 문자열', () => {
  assert.equal(formatPct(0.844), '84.4%');
  assert.equal(formatPct(1), '100%');
  assert.equal(formatPct(0), '0%');
});

test('TC-P8-MATH-GRADE: krGrade/objectiveGrade — 백엔드와 동일 경계 (ADR-0034)', () => {
  // committed: <0.4 red, 0.4~0.9 yellow, >=0.9 green
  assert.equal(krGrade(0.9, 'committed'), 'green');
  assert.equal(krGrade(0.4, 'committed'), 'yellow');
  assert.equal(krGrade(0.399, 'committed'), 'red');
  // aspirational: <0.4 red, 0.4~0.7 yellow, >=0.7 green
  assert.equal(krGrade(0.7, 'aspirational'), 'green');
  assert.equal(krGrade(0.4, 'aspirational'), 'yellow');
  assert.equal(krGrade(0.399, 'aspirational'), 'red');
  // kind 미상이면 committed 밴드로 폴백
  assert.equal(krGrade(0.9, undefined), 'green');
  assert.equal(krGrade(0.7, undefined), 'yellow');

  // objectiveGrade — 전부 aspirational 이면 aspirational 밴드, 그 외는 committed 밴드
  const allAsp = [{ kind: 'aspirational' }, { kind: 'aspirational' }];
  assert.equal(objectiveGrade(0.75, allAsp), 'green'); // aspirational 밴드 0.75>=0.7
  const mixed = [{ kind: 'committed' }, { kind: 'aspirational' }];
  assert.equal(objectiveGrade(0.75, mixed), 'yellow'); // committed 밴드 0.75<0.9
  assert.equal(objectiveGrade(0, []), 'red'); // KR 0개
});
