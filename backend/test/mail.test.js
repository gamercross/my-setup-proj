// 이메일 조회 API 테스트 (TC-MAIL-B-01~05) — GET /api/mail/unread
// - emails 는 에이전트가 채우는 캐시. 테스트에서 직접 INSERT 로 심는다.

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');

function seedEmails(rows) {
  const { getDb } = require('../db');
  const ins = getDb().prepare(
    `INSERT INTO emails (email_id, from_address, subject, snippet, received_at, is_read, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  rows.forEach((r, i) =>
    ins.run(
      `m-${i}`,
      r.from_address || 'a@b.com',
      r.subject || '제목',
      r.snippet || '미리보기',
      r.received_at !== undefined ? r.received_at : `2026-09-0${i + 1}T08:00:00.000Z`,
      r.is_read ? 1 : 0,
      new Date().toISOString()
    )
  );
}

describe('이메일 조회 API', () => {
  let app;
  beforeEach(() => {
    app = createTestApp();
  });

  it('TC-MAIL-B-01: 미읽음 메일만 200 { emails: [7키] } 로 반환', async () => {
    seedEmails([
      { subject: '안 읽음 1', is_read: 0 },
      { subject: '읽음', is_read: 1 },
      { subject: '안 읽음 2', is_read: 0 },
    ]);
    const res = await request(app).get('/api/mail/unread');
    assert.equal(res.status, 200);
    assert.equal(res.body.emails.length, 2);
    for (const key of ['id', 'email_id', 'from_address', 'subject', 'snippet', 'received_at', 'is_read']) {
      assert.ok(key in res.body.emails[0], `키 누락: ${key}`);
    }
    assert.ok(res.body.emails.every((e) => e.is_read === 0));
  });

  it('TC-MAIL-B-02: 캐시가 비어 있으면 200 + { emails: [] }', async () => {
    const res = await request(app).get('/api/mail/unread');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.emails, []);
  });

  it('TC-MAIL-B-03: received_at 내림차순(최신 먼저)', async () => {
    seedEmails([
      { subject: '오래됨', received_at: '2026-09-01T08:00:00.000Z' },
      { subject: '최신', received_at: '2026-09-05T08:00:00.000Z' },
      { subject: '중간', received_at: '2026-09-03T08:00:00.000Z' },
    ]);
    const res = await request(app).get('/api/mail/unread');
    assert.deepEqual(
      res.body.emails.map((e) => e.subject),
      ['최신', '중간', '오래됨']
    );
  });

  it('TC-MAIL-B-04: ?limit= 로 개수 제한', async () => {
    seedEmails(Array.from({ length: 5 }, (_, i) => ({ subject: `메일 ${i}` })));
    const res = await request(app).get('/api/mail/unread?limit=2');
    assert.equal(res.status, 200);
    assert.equal(res.body.emails.length, 2);
  });

  it('TC-MAIL-B-05: 잘못된 limit 은 400', async () => {
    for (const bad of ['0', '-1', 'abc']) {
      const res = await request(app).get(`/api/mail/unread?limit=${bad}`);
      assert.equal(res.status, 400);
    }
  });
});
