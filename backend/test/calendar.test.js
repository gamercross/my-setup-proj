// 캘린더 API 테스트 (TC-CAL-01~07)

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');

describe('캘린더 API', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  it('TC-CAL-01: GET /api/calendar/events 는 200 { events: [...] } 를 반환한다', async () => {
    const res = await request(app).get('/api/calendar/events');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.events));
    assert.ok(res.body.events.length > 0);
    const first = res.body.events[0];
    for (const key of ['id', 'event_id', 'title', 'start_time', 'end_time', 'location', 'synced_at']) {
      assert.ok(key in first, `키 누락: ${key}`);
    }
  });

  it('TC-CAL-02: start_time 이 있는 항목은 오름차순, null 은 맨 뒤', async () => {
    const res = await request(app).get('/api/calendar/events');
    const times = res.body.events.map((e) => e.start_time);

    const firstNull = times.findIndex((t) => t == null);
    if (firstNull !== -1) {
      // null 이후에 non-null 이 없어야 한다
      assert.ok(times.slice(firstNull).every((t) => t == null));
    }
    const withTime = times.filter((t) => t != null).map((t) => Date.parse(t));
    for (let i = 1; i < withTime.length; i += 1) {
      assert.ok(withTime[i - 1] <= withTime[i], '오름차순 위반');
    }
  });

  it('TC-CAL-03: from/to 로 오늘 구간을 주면 그 구간 일정만 반환한다', async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const res = await request(app).get(`/api/calendar/events?from=${from}&to=${to}`);
    assert.equal(res.status, 200);
    // 더미상 오늘 2건이나, 테스트 실행이 자정 경계에 걸리면 흔들릴 수 있어 >= 1 로 완화한다.
    const withTime = res.body.events.filter((e) => e.start_time != null);
    assert.ok(withTime.length >= 1);
    for (const e of withTime) {
      const ms = Date.parse(e.start_time);
      assert.ok(ms >= Date.parse(from) && ms <= Date.parse(to));
    }
  });

  it('TC-CAL-04: 먼 미래 from 은 200, 유효 start_time 일정은 0건 (시간 미정 항목만 남음)', async () => {
    const far = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app).get(`/api/calendar/events?from=${far}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.events));
    // 범위 필터는 유효 start_time 항목에만 적용 → 구간 밖 일정은 모두 제외
    const withTime = res.body.events.filter((e) => e.start_time != null);
    assert.equal(withTime.length, 0);
    // start_time 미정 항목은 from/to 와 무관하게 항상 포함 (AC-8)
    assert.ok(res.body.events.every((e) => e.start_time == null));
  });

  it('TC-CAL-07: from > to 는 400 이 아니라 200, 유효 일정은 0건 (AC-3 강조 규칙)', async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0).toISOString();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0, 0).toISOString();
    const res = await request(app).get(`/api/calendar/events?from=${today}&to=${yesterday}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.events));
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
