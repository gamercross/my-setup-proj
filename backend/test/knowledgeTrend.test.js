// 지식 축적 추세 API 테스트 (TC-KNOW-01~08) — 개인 OS P11, ADR-0036

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');

// 고정 기준일: 2026-06-17(수). ISO 주 이번주 = 2026-06-15(월)~06-21(일) — planner.test.js 와 동일 규약.
const NOW = new Date(2026, 5, 17, 10, 0, 0);

function isoAt(y, m, d, h = 10) {
  return new Date(y, m - 1, d, h, 0, 0).toISOString();
}

describe('지식 축적 추세 API', () => {
  let app;
  let knowledge;
  let rawDb;

  beforeEach(() => {
    app = createTestApp();
    knowledge = require('../src/services/knowledgeTrend');
    rawDb = require('../db').getDb();
  });

  function insertCheckin(createdAt) {
    rawDb
      .prepare(
        `INSERT INTO expectation_checkins (period, what, created_at, updated_at) VALUES (?, ?, ?, ?)`
      )
      .run('테스트', '체크인', createdAt, createdAt);
  }

  async function addTaskWithTag(tag, source, createdAt) {
    const res = await request(app).post('/api/tasks').send({ title: `할일-${tag}-${source}` });
    const taskId = res.body.task.id;
    rawDb
      .prepare(`INSERT INTO task_tags (task_id, tag, source, created_at) VALUES (?, ?, ?, ?)`)
      .run(taskId, tag, source, createdAt);
    return taskId;
  }

  async function addKeyResult() {
    const obj = await request(app).post('/api/okr/objectives').send({ title: '목표', period: '2026' });
    const kr = await request(app)
      .post('/api/okr/key-results')
      .send({ objective_id: obj.body.objective.id, title: 'KR', target: 10 });
    return kr.body.keyResult.id;
  }

  it('TC-KNOW-01: 기본 호출 — 200·window.weeks=8·points 8개·오름차순', () => {
    const body = knowledge.getKnowledgeTrend(NOW, {});
    assert.equal(body.window.weeks, 8);
    assert.equal(body.checkins.points.length, 8);
    assert.equal(body.window.from, '2026-04-27');
    assert.equal(body.window.to, '2026-06-21');
    const weeks = body.checkins.points.map((p) => p.week);
    assert.deepEqual(weeks, [...weeks].sort());
    assert.equal(weeks[weeks.length - 1], '2026-06-15');
  });

  it('TC-KNOW-02: 데이터 0건 — 200·모든 배열 존재·count 전부 0 (에러 아님)', async () => {
    const res = await request(app).get('/api/knowledge-trend');
    assert.equal(res.status, 200);
    assert.equal(res.body.checkins.points.every((p) => p.count === 0), true);
    assert.equal(res.body.checkins.total, 0);
    assert.deepEqual(res.body.okr.points, []);
    assert.equal(res.body.okr.latestPct, 0);
    assert.deepEqual(res.body.tags.items, []);
    assert.equal(res.body.tags.total, 0);
    assert.equal(res.body.summary.checkinWeeks, 0);
    assert.equal(res.body.summary.topTag, null);
  });

  it('TC-KNOW-03: ?weeks=4 — points.length=4·window.from 이 4주 전 월요일', () => {
    const body = knowledge.getKnowledgeTrend(NOW, { weeks: 4 });
    assert.equal(body.checkins.points.length, 4);
    assert.equal(body.window.from, '2026-05-25');
  });

  it('TC-KNOW-04: weeks 검증 — 0·27·abc 모두 400', async () => {
    for (const bad of ['0', '27', 'abc']) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).get(`/api/knowledge-trend?weeks=${bad}`);
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'weeks 는 1~26 사이 정수여야 합니다.');
    }
  });

  it('TC-KNOW-05: 체크인 3건을 서로 다른 주에 삽입 — 해당 주 count 반영, 빈 주는 0', () => {
    insertCheckin(isoAt(2026, 4, 28)); // 첫 주(창 시작 주)
    insertCheckin(isoAt(2026, 5, 20)); // 중간 주
    insertCheckin(isoAt(2026, 6, 17)); // 이번 주 (NOW 당일)

    const body = knowledge.getKnowledgeTrend(NOW, { weeks: 8 });
    assert.equal(body.checkins.total, 3);
    const byWeek = Object.fromEntries(body.checkins.points.map((p) => [p.week, p.count]));
    assert.equal(byWeek['2026-04-27'], 1);
    assert.equal(byWeek['2026-05-18'], 1);
    assert.equal(byWeek['2026-06-15'], 1);
    assert.equal(body.summary.checkinWeeks, 3);
    // 빈 주는 0
    assert.equal(byWeek['2026-05-04'], 0);
  });

  it('TC-KNOW-06: kr_snapshots — round3 평균·month 오름차순·창 밖 달 제외', async () => {
    const krId = await addKeyResult();
    const dbLayer = require('../src/db');
    dbLayer.upsertKrSnapshot(krId, '2026-03', 0.1); // 창 밖 (fromMonth=2026-04)
    dbLayer.upsertKrSnapshot(krId, '2026-04', 0.301);
    dbLayer.upsertKrSnapshot(krId, '2026-05', 0.5);
    dbLayer.upsertKrSnapshot(krId, '2026-06', 0.9);

    const body = knowledge.getKnowledgeTrend(NOW, { weeks: 8 });
    const months = body.okr.points.map((p) => p.month);
    assert.deepEqual(months, ['2026-04', '2026-05', '2026-06']);
    assert.equal(body.okr.points[0].krAvgPct, 0.301);
    assert.equal(body.okr.latestPct, 0.9);
  });

  it('TC-KNOW-07: task_tags — source 무관 합산·count DESC,tag ASC·12개 초과는 otherCount', async () => {
    const now = isoAt(2026, 6, 17);
    await addTaskWithTag('t01', 'user', now);
    await addTaskWithTag('t01', 'agent', now); // t01 count=2
    for (let i = 2; i <= 13; i += 1) {
      const tag = `t${String(i).padStart(2, '0')}`;
      // eslint-disable-next-line no-await-in-loop
      await addTaskWithTag(tag, i % 2 === 0 ? 'user' : 'agent', now);
    }

    const body = knowledge.getKnowledgeTrend(NOW, { weeks: 8 });
    assert.equal(body.tags.distinct, 13);
    assert.equal(body.tags.total, 14);
    assert.equal(body.tags.items.length, 12);
    assert.equal(body.tags.items[0].tag, 't01');
    assert.equal(body.tags.items[0].count, 2);
    assert.equal(body.tags.items[1].tag, 't02');
    assert.equal(body.tags.otherCount, 1);
    assert.equal(body.summary.topTag, 't01');
  });

  it('TC-KNOW-08: 호출 후 kr_snapshots 행 수가 증가하지 않는다 (스냅샷 미적재)', async () => {
    await addKeyResult();
    const countRows = () => rawDb.prepare('SELECT COUNT(*) AS n FROM kr_snapshots').get().n;
    const before = countRows();
    const res = await request(app).get('/api/knowledge-trend');
    assert.equal(res.status, 200);
    assert.equal(countRows(), before);
  });
});
