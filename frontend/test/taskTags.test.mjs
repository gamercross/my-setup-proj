// 할일 태그 순수 로직 테스트 (TC-P6-01~06) — FR-TASK-08

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeTags,
  addTagTo,
  removeTagFrom,
  collectTags,
  filterByTag,
} from '../src/store/taskTags.js';

test('TC-P6-01: normalizeTags — 비배열/null → [], 트림·빈값·중복 제거 후 정렬', () => {
  assert.deepEqual(normalizeTags(null), []);
  assert.deepEqual(normalizeTags('공부'), []);
  assert.deepEqual(normalizeTags(['  나  ', '가', '가', '', 3, '나']), ['가', '나']);
});

test('TC-P6-02: addTagTo — 멱등, 정렬 유지', () => {
  const task = { tags: ['나'] };
  assert.deepEqual(addTagTo(task, '가'), ['가', '나']);
  assert.deepEqual(addTagTo(task, '나'), ['나']);
  assert.deepEqual(addTagTo(task, '  '), ['나']);
});

test('TC-P6-03: removeTagFrom — 대상 제거, 없던 태그는 무해', () => {
  assert.deepEqual(removeTagFrom({ tags: ['가', '나'] }, '가'), ['나']);
  assert.deepEqual(removeTagFrom({ tags: ['가'] }, '없음'), ['가']);
  assert.deepEqual(removeTagFrom({}, '가'), []);
});

test('TC-P6-04: collectTags — 유니크·정렬, 빈 입력 → []', () => {
  const tasks = [{ tags: ['b', 'a'] }, { tags: ['a', 'c'] }, {}];
  assert.deepEqual(collectTags(tasks), ['a', 'b', 'c']);
  assert.deepEqual(collectTags([]), []);
  assert.deepEqual(collectTags(null), []);
});

test('TC-P6-05: filterByTag — 태그 일치 항목만', () => {
  const tasks = [
    { id: 1, tags: ['일'] },
    { id: 2, tags: ['이'] },
    { id: 3, tags: ['일', '이'] },
  ];
  assert.deepEqual(filterByTag(tasks, '일').map((t) => t.id), [1, 3]);
});

test('TC-P6-06: filterByTag — tag 가 null/"" 이면 원본 참조 그대로 반환', () => {
  const tasks = [{ id: 1, tags: [] }];
  assert.equal(filterByTag(tasks, null), tasks);
  assert.equal(filterByTag(tasks, ''), tasks);
});
