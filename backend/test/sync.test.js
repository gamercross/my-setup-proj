// 동기화 이력 API 테스트 (TC-SYNC-08,09,10) — GET /api/sync/logs

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');

// sync_logs 에 행을 심는다 (에이전트가 소유하는 테이블이므로 테스트에서 직접 INSERT).
function seedLogs(rows) {
  const { getDb } = require('../db');
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO sync_logs (service, status, last_sync, error_message) VALUES (?, ?, ?, ?)'
  );
  for (const r of rows) {
    stmt.run(r.service, r.status, r.last_sync, r.error_message ?? null);
  }
}

describe('동기화 이력 API', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  it('TC-SYNC-08: GET /api/sync/logs 는 200 { logs: [...] }, 각 행 5개 필드', async () => {
    seedLogs([
      { service: 'gmail', status: 'success', last_sync: '2026-09-06T08:00:00.000Z' },
      { service: 'calendar', status: 'failed', last_sync: '2026-09-06T08:00:03.000Z', error_message: '401' },
    ]);

    const res = await request(app).get('/api/sync/logs');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.logs));
    assert.equal(res.body.logs.length, 2);
    for (const key of ['id', 'service', 'status', 'last_sync', 'error_message']) {
      assert.ok(key in res.body.logs[0], `키 누락: ${key}`);
    }
    // 최신 순 (id DESC)
    assert.equal(res.body.logs[0].service, 'calendar');
  });

  it('TC-SYNC-09: ?service=gmail 필터, ?service=bogus 는 400 한국어', async () => {
    seedLogs([
      { service: 'gmail', status: 'success', last_sync: '2026-09-06T08:00:00.000Z' },
      { service: 'calendar', status: 'success', last_sync: '2026-09-06T08:00:01.000Z' },
    ]);

    const ok = await request(app).get('/api/sync/logs?service=gmail');
    assert.equal(ok.status, 200);
    assert.equal(ok.body.logs.length, 1);
    assert.equal(ok.body.logs[0].service, 'gmail');

    const bad = await request(app).get('/api/sync/logs?service=bogus');
    assert.equal(bad.status, 400);
    assert.match(bad.body.error, /gmail\|calendar\|notion\|supabase/);
  });

  it('TC-SYNC-10: ?limit=1 준수, limit 비정수는 400', async () => {
    seedLogs([
      { service: 'gmail', status: 'success', last_sync: '2026-09-06T08:00:00.000Z' },
      { service: 'gmail', status: 'failed', last_sync: '2026-09-06T08:00:05.000Z', error_message: 'x' },
    ]);

    const res = await request(app).get('/api/sync/logs?limit=1');
    assert.equal(res.status, 200);
    assert.equal(res.body.logs.length, 1);

    const bad = await request(app).get('/api/sync/logs?limit=abc');
    assert.equal(bad.status, 400);
    assert.match(bad.body.error, /정수/);
  });
});
