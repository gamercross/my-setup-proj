// 할일 캐시 헬퍼 고정 테스트 (TC-P5-01~05) — ADR-0028
// taskCache.js 는 순수 JS 라 node --test 로 직접 import.

import test from 'node:test';
import assert from 'node:assert/strict';

import { toCache, listFrom, upsert, patchOne, removeOne } from '../src/store/taskCache.js';

const T = (id, extra = {}) => ({ id, title: `t${id}`, status: 'todo', ...extra });

test('TC-P5-01: toCache/listFrom 왕복은 원래 목록을 순서대로 복원한다', () => {
  const list = [T(1), T(2), T(3)];
  const cache = toCache(list);
  assert.deepEqual(cache.order, [1, 2, 3]);
  assert.deepEqual(listFrom(cache), list);
});

test('TC-P5-02: toCache 비배열 방어 → 빈 캐시', () => {
  for (const bad of [null, undefined, {}, 'x', 42]) {
    assert.deepEqual(toCache(bad), { byId: {}, order: [] });
  }
  assert.deepEqual(toCache([]), { byId: {}, order: [] });
});

test('TC-P5-03: upsert — 신규는 끝에 append, 기존은 byId 만 교체(순서 유지)', () => {
  const c0 = toCache([T(1), T(2)]);
  const c1 = upsert(c0, T(3));
  assert.deepEqual(c1.order, [1, 2, 3]);
  const c2 = upsert(c1, T(2, { title: '수정됨' }));
  assert.deepEqual(c2.order, [1, 2, 3]);
  assert.equal(c2.byId[2].title, '수정됨');
  assert.notEqual(c2, c1);
});

test('TC-P5-04: patchOne — 존재 시 병합, 부재 시 원본 참조 그대로', () => {
  const c0 = toCache([T(1)]);
  const c1 = patchOne(c0, 1, { status: 'done' });
  assert.equal(c1.byId[1].status, 'done');
  assert.equal(c1.byId[1].title, 't1');
  const c2 = patchOne(c1, 999, { status: 'todo' });
  assert.equal(c2, c1, '대상 없으면 동일 참조');
});

test('TC-P5-05: removeOne + 롤백 시 order 인덱스가 스냅샷대로 복원된다', () => {
  const prev = toCache([T(1), T(2), T(3)]);
  const removed = removeOne(prev, 2);
  assert.deepEqual(removed.order, [1, 3]);
  assert.equal(removeOne(prev, 42), prev, '없는 id 는 동일 참조');
  // 롤백: 스냅샷을 그대로 커밋하면 order 가 원상 복구된다
  assert.deepEqual(prev.order, [1, 2, 3]);
  assert.deepEqual(listFrom(prev).map((t) => t.id), [1, 2, 3]);
});
