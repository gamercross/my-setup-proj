// C6 표시 옵션 해석 테스트 (TC-WIDGET-13)

import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDisplay } from '../src/widgets/displayConfig.js';

const tasksSchema = {
  sortBy: { type: 'enum', options: ['due', 'priority', 'created'], default: 'created' },
  hideCompleted: { type: 'bool', default: false },
  maxItems: { type: 'number', min: 5, max: 100, step: 5, default: 50 },
};

test('TC-WIDGET-13: 스키마 밖 키 무시 + 범위 clamp + default 채움', () => {
  assert.deepEqual(resolveDisplay(tasksSchema, { sortBy: 'due', nope: 1, maxItems: 9999 }), {
    sortBy: 'due',
    hideCompleted: false,
    maxItems: 100,
  });
});

test('resolveDisplay: 잘못된 enum 은 default', () => {
  assert.equal(resolveDisplay(tasksSchema, { sortBy: 'zzz' }).sortBy, 'created');
});

test('resolveDisplay: display 없으면 전부 default', () => {
  assert.deepEqual(resolveDisplay(tasksSchema, undefined), {
    sortBy: 'created',
    hideCompleted: false,
    maxItems: 50,
  });
});

test('resolveDisplay: 빈 스키마는 빈 객체', () => {
  assert.deepEqual(resolveDisplay({}, { anything: 1 }), {});
});
