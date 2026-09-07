// dotFill 채움 규칙 고정 테스트 (TC-P4-01~04)
// dotFill.js 는 순수 JS(JSX 아님)라 node --test 로 직접 import 가능.

import test from 'node:test';
import assert from 'node:assert/strict';

import { dotFill, normalizeTotal, clampPct } from '../src/components/dotFill.js';

test('TC-P4-01: 50% / 20칸 → 10', () => {
  assert.equal(dotFill(50, 20), 10);
});

test('TC-P4-02: 경계값 0% → 0, 100% → 20', () => {
  assert.equal(dotFill(0), 0);
  assert.equal(dotFill(100), 20);
});

test('TC-P4-03: 비정상·범위 밖 입력', () => {
  assert.equal(dotFill(NaN), 0);
  assert.equal(dotFill('abc'), 0);
  assert.equal(dotFill(-5), 0);
  assert.equal(dotFill(150), 20);
});

test('TC-P4-04: total 이 비정상이면 20 으로 대체', () => {
  assert.equal(dotFill(50, 0), 10);
  assert.equal(dotFill(50, 3.5), 10);
});

test('TC-P4-05: normalizeTotal — 정상값은 그대로, 비정상은 20', () => {
  assert.equal(normalizeTotal(20), 20);
  assert.equal(normalizeTotal(12), 12);
  assert.equal(normalizeTotal(0), 20);
  assert.equal(normalizeTotal(-3), 20);
  assert.equal(normalizeTotal(3.5), 20);
  assert.equal(normalizeTotal(NaN), 20);
  assert.equal(normalizeTotal(undefined), 20);
});

test('TC-P4-05: clampPct — NaN→0, 범위 clamp, 정수 반올림', () => {
  assert.equal(clampPct(50), 50);
  assert.equal(clampPct('abc'), 0);
  assert.equal(clampPct(NaN), 0);
  assert.equal(clampPct(-5), 0);
  assert.equal(clampPct(150), 100);
  assert.equal(clampPct(37.6), 38);
});
