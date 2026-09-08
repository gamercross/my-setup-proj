// 주간 플래너 테스트 (TC-PLAN-01~04) — P8, FR-OKR-05

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');

// 고정 기준일: 2026-06-17(수). ISO 주 = 2026-06-15(월)~06-21(일).
// 지난주 06-08~06-14 / 다음주 06-22~06-28.
const NOW = new Date(2026, 5, 17, 10, 0, 0);

async function addTask(app, title, due_date, status = 'todo') {
  const res = await request(app).post('/api/tasks').send({ title, due_date, status });
  return res.body.task;
}

describe('주간 플래너', () => {
  let app;
  let planner;

  beforeEach(() => {
    app = createTestApp();
    planner = require('../src/services/planner');
  });

  it('TC-PLAN-01: 고정 날짜로 3버킷이 정확히 나뉜다', async () => {
    await addTask(app, '지난주 완료', '2026-06-10', 'done');
    await addTask(app, '지난주 미완료', '2026-06-12', 'todo');
    await addTask(app, '이번주 A', '2026-06-15', 'todo');
    await addTask(app, '이번주 B', '2026-06-21', 'in_progress');
    await addTask(app, '다음주', '2026-06-22', 'todo');

    const w = planner.getWeekly(NOW);
    assert.deepEqual(w.lastWeek, { done: 1, total: 2 });
    assert.equal(w.thisWeek.total, 2);
    assert.equal(w.thisWeek.done, 0);
    assert.equal(w.thisWeek.items.length, 2);
    assert.equal(w.nextWeek.total, 1);
    assert.equal(w.nextWeek.items.length, 1);
  });

  it('TC-PLAN-02: due_date null 은 어느 버킷에도 없고, 주 경계 하루 밖은 제외', async () => {
    await addTask(app, '마감없음', null);
    await addTask(app, '지난주 직전', '2026-06-07'); // 지난주 시작 하루 전
    await addTask(app, '다음주 직후', '2026-06-29'); // 다음주 끝 하루 뒤
    await addTask(app, '이번주 월요일', '2026-06-15');
    await addTask(app, '이번주 일요일', '2026-06-21');

    const w = planner.getWeekly(NOW);
    assert.equal(w.lastWeek.total, 0);
    assert.equal(w.thisWeek.total, 2);
    assert.equal(w.nextWeek.total, 0);
  });

  it('TC-PLAN-03: items 필드셋·정렬·상한 50', async () => {
    // 역순으로 넣어도 due_date 오름차순 정렬돼야 한다
    await addTask(app, 'c', '2026-06-19');
    await addTask(app, 'a', '2026-06-16');
    await addTask(app, 'b', '2026-06-17');

    const w = planner.getWeekly(NOW);
    assert.deepEqual(w.thisWeek.items.map((t) => t.title), ['a', 'b', 'c']);
    assert.deepEqual(
      Object.keys(w.thisWeek.items[0]).sort(),
      ['due_date', 'id', 'priority', 'status', 'tags', 'title'].sort()
    );

    // 상한 3 을 주면 items 는 3, total 은 전체
    const capped = planner.getWeekly(NOW, { limit: 2 });
    assert.equal(capped.thisWeek.items.length, 2);
    assert.equal(capped.thisWeek.total, 3);
  });

  it('TC-PLAN-04: 데이터 0건이면 모든 카운트 0, items: []', async () => {
    const res = await request(app).get('/api/planner/weekly');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      lastWeek: { done: 0, total: 0 },
      thisWeek: { done: 0, total: 0, items: [] },
      nextWeek: { total: 0, items: [] },
    });
  });
});
