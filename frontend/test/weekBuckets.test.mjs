// 주간 플래너 버킷팅 순수 함수 테스트 (TC-P8-WEEK-01~03) — 백엔드 planner.js 와 같은 정의.

import test from 'node:test';
import assert from 'node:assert/strict';

import { bucketTasks, startOfIsoWeek, toDateKey } from '../src/widgets/weekBuckets.js';

// 고정 기준일 2026-06-17(수). ISO 주 = 06-15(월)~06-21(일).
const NOW = new Date(2026, 5, 17, 10, 0, 0);

const mk = (id, due_date, status = 'todo') => ({ id, title: `t${id}`, due_date, status, priority: 'medium', tags: [] });

test('TC-P8-WEEK-01: startOfIsoWeek 는 그 주 월요일', () => {
  assert.equal(toDateKey(startOfIsoWeek(NOW)), '2026-06-15');
  assert.equal(toDateKey(startOfIsoWeek(new Date(2026, 5, 15))), '2026-06-15');
  assert.equal(toDateKey(startOfIsoWeek(new Date(2026, 5, 21))), '2026-06-15');
});

test('TC-P8-WEEK-02: 3버킷 분리 + done 카운트', () => {
  const tasks = [
    mk(1, '2026-06-10', 'done'), // 지난주
    mk(2, '2026-06-12', 'todo'), // 지난주
    mk(3, '2026-06-15', 'todo'), // 이번주 (월)
    mk(4, '2026-06-21', 'done'), // 이번주 (일)
    mk(5, '2026-06-24', 'todo'), // 다음주
  ];
  const b = bucketTasks(tasks, NOW);
  assert.deepEqual(b.lastWeek, { done: 1, total: 2 });
  assert.equal(b.thisWeek.total, 2);
  assert.equal(b.thisWeek.done, 1);
  assert.equal(b.nextWeek.total, 1);
});

test('TC-P8-WEEK-03: due_date null 제외, 경계일 포함, 정렬', () => {
  const tasks = [
    mk(1, null),
    mk(2, '2026-06-14'), // 지난주 마지막날
    mk(3, '2026-06-22'), // 다음주 첫날
    mk(4, '2026-06-19T09:00:00Z'), // 포맷 혼재 — slice(0,10)
    mk(5, '2026-06-16'),
  ];
  const b = bucketTasks(tasks, NOW);
  assert.equal(b.lastWeek.total, 1);
  assert.equal(b.nextWeek.total, 1);
  assert.deepEqual(b.thisWeek.items.map((t) => t.id), [5, 4]); // 06-16, 06-19 순
});
