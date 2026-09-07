// 캘린더 API 테스트 (TC-CAL-01~07) — 이제 calendar_events 캐시에서 읽는다 (FR-CAL-01).
// - calendar_events 는 에이전트가 채우는 테이블이므로 테스트에서 직접 INSERT 로 심는다.

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');

// 로컬 자정 기준 상대 시각
function at(days, h, m) {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate() + days, h, m);
}

function seedEvents(rows) {
  const { getDb } = require('../db');
  const ins = getDb().prepare(
    `INSERT INTO calendar_events (event_id, title, start_time, end_time, location, synced_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  rows.forEach((r, i) => {
    ins.run(
      r.event_id || `t-${i}@local`,
      r.title || '일정',
      r.start_time !== undefined ? r.start_time : at(0, 10, 0).toISOString(),
      r.end_time !== undefined ? r.end_time : null,
      r.location !== undefined ? r.location : null,
      new Date().toISOString()
    );
  });
}

function seedDefault() {
  seedEvents([
    { title: '오전 스탠드업', start_time: at(0, 9, 30).toISOString(), location: '회의실 A' },
    { title: '설계 리뷰', start_time: at(0, 14, 0).toISOString() },
    { title: '치과 예약', start_time: at(1, 11, 0).toISOString(), location: '치과' },
    { title: '친구 저녁', start_time: at(4, 19, 0).toISOString(), location: '강남' },
    { title: '이사 준비 (조율 중)', start_time: null },
  ]);
}

describe('캘린더 API', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  it('TC-CAL-01: GET /api/calendar/events 는 200 { events: [...] } 를 반환한다', async () => {
    seedDefault();
    const res = await request(app).get('/api/calendar/events');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.events));
    assert.ok(res.body.events.length > 0);
    const first = res.body.events[0];
    for (const key of ['id', 'event_id', 'title', 'start_time', 'end_time', 'location', 'synced_at']) {
      assert.ok(key in first, `키 누락: ${key}`);
    }
  });

  it('TC-CAL-01b: 캐시가 비어 있으면 200 + { events: [] }', async () => {
    const res = await request(app).get('/api/calendar/events');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.events, []);
  });

  it('TC-CAL-02: start_time 이 있는 항목은 오름차순, null 은 맨 뒤', async () => {
    seedDefault();
    const res = await request(app).get('/api/calendar/events');
    const times = res.body.events.map((e) => e.start_time);

    const firstNull = times.findIndex((t) => t == null);
    if (firstNull !== -1) {
      assert.ok(times.slice(firstNull).every((t) => t == null));
    }
    const withTime = times.filter((t) => t != null).map((t) => Date.parse(t));
    for (let i = 1; i < withTime.length; i += 1) {
      assert.ok(withTime[i - 1] <= withTime[i], '오름차순 위반');
    }
  });

  it('TC-CAL-03: from/to 로 오늘 구간을 주면 그 구간 일정만 반환한다', async () => {
    seedDefault();
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const res = await request(app).get(`/api/calendar/events?from=${from}&to=${to}`);
    assert.equal(res.status, 200);
    const withTime = res.body.events.filter((e) => e.start_time != null);
    assert.ok(withTime.length >= 1);
    for (const e of withTime) {
      const ms = Date.parse(e.start_time);
      assert.ok(ms >= Date.parse(from) && ms <= Date.parse(to));
    }
  });

  it('TC-CAL-04: 먼 미래 from 은 200, 유효 start_time 일정은 0건 (시간 미정 항목만 남음)', async () => {
    seedDefault();
    const far = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app).get(`/api/calendar/events?from=${far}`);
    assert.equal(res.status, 200);
    const withTime = res.body.events.filter((e) => e.start_time != null);
    assert.equal(withTime.length, 0);
    assert.ok(res.body.events.every((e) => e.start_time == null));
  });

  it('TC-CAL-07: from > to 는 400 이 아니라 200, 유효 일정은 0건', async () => {
    seedDefault();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0).toISOString();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0, 0).toISOString();
    const res = await request(app).get(`/api/calendar/events?from=${today}&to=${yesterday}`);
    assert.equal(res.status, 200);
    const withTime = res.body.events.filter((e) => e.start_time != null);
    assert.equal(withTime.length, 0);
  });

  it('TC-CAL-05: 파싱 불가한 from 은 400', async () => {
    const res = await request(app).get('/api/calendar/events?from=notadate');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'from 은 ISO8601 형식이어야 합니다.');
  });

  it('TC-CAL-06: 파싱 불가한 to 는 400', async () => {
    const res = await request(app).get('/api/calendar/events?to=abc');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'to 는 ISO8601 형식이어야 합니다.');
  });
});
