// 일일 브리핑 API 테스트 (TC-BRIEF-01~06) — GET /api/brief/today
// - briefs 는 에이전트가 소유하는 테이블이므로 테스트에서 직접 INSERT 로 심는다.
// - 빈 결과는 404 가 아니라 200 + { brief: null } 이다 (ADR-0025).

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');

function todayLocal() {
  const n = new Date();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${n.getFullYear()}-${m}-${d}`;
}

function seedBrief({ date, content = '오늘의 우선순위 TOP 3', notion_url = 'https://notion.so/x', created_at = '2026-09-07T07:30:00.000Z' }) {
  const { getDb } = require('../db');
  getDb()
    .prepare('INSERT INTO briefs (date, content, notion_url, created_at) VALUES (?, ?, ?, ?)')
    .run(date, content, notion_url, created_at);
}

describe('일일 브리핑 API', () => {
  let app;
  beforeEach(() => {
    app = createTestApp();
  });

  it('TC-BRIEF-01: 오늘 brief 1행 → 200 { brief: {5키} }', async () => {
    seedBrief({ date: todayLocal() });
    const res = await request(app).get('/api/brief/today');
    assert.equal(res.status, 200);
    for (const key of ['id', 'date', 'content', 'notion_url', 'created_at']) {
      assert.ok(key in res.body.brief, `키 누락: ${key}`);
    }
  });

  it('TC-BRIEF-02: briefs 비어있음 → 200 { brief: null }', async () => {
    const res = await request(app).get('/api/brief/today');
    assert.equal(res.status, 200);
    assert.equal(res.body.brief, null);
  });

  it('TC-BRIEF-03: 어제 행만 있음 → 200 { brief: null }', async () => {
    const y = new Date(Date.now() - 86400000);
    const date = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    seedBrief({ date });
    const res = await request(app).get('/api/brief/today');
    assert.equal(res.status, 200);
    assert.equal(res.body.brief, null);
  });

  it('TC-BRIEF-04: notion_url NULL 행 → 200, brief.notion_url === null', async () => {
    seedBrief({ date: todayLocal(), notion_url: null });
    const res = await request(app).get('/api/brief/today');
    assert.equal(res.status, 200);
    assert.equal(res.body.brief.notion_url, null);
  });

  it('TC-BRIEF-05: services/brief.js todayString() 은 로컬 자정 기준', () => {
    const { todayString } = require('../src/services/brief');
    // 로컬 2026-01-02 00:30 → UTC 로는 전날일 수 있지만 로컬 기준 날짜를 써야 한다
    const injected = new Date(2026, 0, 2, 0, 30, 0);
    assert.equal(todayString(injected), '2026-01-02');
  });

  it('TC-BRIEF-06: POST/PUT/DELETE /api/brief/today → 404', async () => {
    for (const m of ['post', 'put', 'delete']) {
      const res = await request(app)[m]('/api/brief/today');
      assert.equal(res.status, 404);
    }
  });
});
