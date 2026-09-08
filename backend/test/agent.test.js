// 에이전트 활동 API·서비스 테스트 (TC-ACT-01~09) — P7, FR-AGENT-08

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');

// sync_logs 에 행을 심는다 (에이전트 소유 테이블 — 테스트에서 직접 INSERT).
function seedLogs(rows) {
  const { getDb } = require('../db');
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO sync_logs (service, status, last_sync, error_message) VALUES (?, ?, ?, ?)'
  );
  for (const r of rows) stmt.run(r.service, r.status, r.last_sync, r.error_message ?? null);
}

// 매 테스트마다 격리된 임시 agent 루트를 만든다 (실제 저장소에 플래그 파일을 쓰지 않기 위함).
let tmpRoot;
function makeAgentRoot() {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-test-'));
  process.env.AGENT_PATH = tmpRoot;
}

describe('에이전트 활동 API', () => {
  let app;

  beforeEach(() => {
    makeAgentRoot();
    delete process.env.DAILY_BRIEF_HOUR;
    delete process.env.DAILY_BRIEF_MINUTE;
    app = createTestApp();
  });

  afterEach(() => {
    delete process.env.AGENT_PATH;
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      /* 무시 */
    }
  });

  it('TC-ACT-01: GET /api/agent/activity 는 200 + 스키마(logs·health·nextRun·runNow·checkedAt)', async () => {
    seedLogs([
      { service: 'gmail', status: 'success', last_sync: '2026-09-07T22:30:00.000Z' },
      { service: 'notion', status: 'failed', last_sync: '2026-09-07T22:30:05.000Z', error_message: '401 Unauthorized' },
    ]);

    const res = await request(app).get('/api/agent/activity');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.logs));
    assert.equal(res.body.logs.length, 2);
    for (const key of ['id', 'service', 'status', 'last_sync', 'error_message']) {
      assert.ok(key in res.body.logs[0], `logs 키 누락: ${key}`);
    }
    assert.ok('supabase' in res.body.health && 'detail' in res.body.health && 'host' in res.body.health);
    assert.ok('at' in res.body.nextRun && res.body.nextRun.source === 'schedule');
    assert.equal(res.body.nextRun.hour, 7);
    assert.equal(res.body.nextRun.minute, 30);
    assert.ok('pending' in res.body.runNow && 'available' in res.body.runNow);
    assert.equal(res.body.runNow.available, true);
    assert.ok(typeof res.body.checkedAt === 'string');
  });

  it('TC-ACT-02: limit 검증 — 비정수·0 이하는 400, 50 초과는 잘림', async () => {
    seedLogs(Array.from({ length: 60 }, (_, i) => ({
      service: 'gmail',
      status: 'success',
      last_sync: `2026-09-07T00:00:${String(i % 60).padStart(2, '0')}.000Z`,
    })));

    const bad = await request(app).get('/api/agent/activity?limit=abc');
    assert.equal(bad.status, 400);
    assert.match(bad.body.error, /정수/);

    const zero = await request(app).get('/api/agent/activity?limit=0');
    assert.equal(zero.status, 400);

    const capped = await request(app).get('/api/agent/activity?limit=999');
    assert.equal(capped.status, 200);
    assert.equal(capped.body.logs.length, 50);
  });

  it('TC-ACT-05: POST /api/agent/run-now 는 플래그를 만들고 pending:true 를 반환', async () => {
    const res = await request(app).post('/api/agent/run-now').send({});
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.pending, true);
    assert.equal(res.body.alreadyPending, false);
    assert.ok(typeof res.body.requestedAt === 'string');
    assert.match(res.body.note, /다음 감지/);
    assert.ok(fs.existsSync(path.join(tmpRoot, '.triggers', 'run-now')));

    // activity 에서도 대기 상태로 보인다
    const act = await request(app).get('/api/agent/activity');
    assert.equal(act.body.runNow.pending, true);
    assert.ok(act.body.runNow.requestedAt);
  });

  it('TC-ACT-06: POST /api/agent/run-now 는 멱등 — 두 번째는 alreadyPending:true + 같은 requestedAt', async () => {
    const first = await request(app).post('/api/agent/run-now').send({});
    const second = await request(app).post('/api/agent/run-now').send({});
    assert.equal(second.status, 200);
    assert.equal(second.body.alreadyPending, true);
    assert.equal(second.body.requestedAt, first.body.requestedAt);
  });

  it('TC-ACT-09: health 확인(Supabase)이 실패해도 activity 는 200 + health.supabase:error + logs 정상 (AC-5)', async () => {
    seedLogs([
      { service: 'gmail', status: 'success', last_sync: '2026-09-07T22:30:00.000Z' },
    ]);

    const supabase = require('../src/supabase');
    const original = supabase.checkConnection;
    supabase.checkConnection = async () => {
      throw new Error('연결 실패(테스트)');
    };
    try {
      const res = await request(app).get('/api/agent/activity');
      assert.equal(res.status, 200);
      assert.equal(res.body.health.supabase, 'error');
      assert.equal(res.body.logs.length, 1);
      assert.equal(res.body.logs[0].service, 'gmail');
    } finally {
      supabase.checkConnection = original;
    }
  });

  it('TC-ACT-08: agent 루트가 없으면 run-now 는 503, activity 는 200(available:false)', async () => {
    process.env.AGENT_PATH = path.join(tmpRoot, 'does-not-exist');
    const app2 = createTestApp();

    const run = await request(app2).post('/api/agent/run-now').send({});
    assert.equal(run.status, 503);
    assert.match(run.body.error, /에이전트 폴더/);

    const act = await request(app2).get('/api/agent/activity');
    assert.equal(act.status, 200);
    assert.equal(act.body.runNow.available, false);
    assert.equal(act.body.runNow.pending, false);
  });
});

describe('에이전트 서비스 순수 로직', () => {
  afterEach(() => {
    delete process.env.DAILY_BRIEF_HOUR;
    delete process.env.DAILY_BRIEF_MINUTE;
    delete process.env.AGENT_PATH;
  });

  it('TC-ACT-03: computeNextRun 은 시각이 지났으면 다음날, 안 지났으면 당일', () => {
    const agent = require('../src/services/agent');
    const now = new Date(2026, 8, 8, 9, 0, 0); // 09:00

    const later = agent.computeNextRun(now, 18, 0);
    assert.equal(later.getDate(), 8);
    assert.equal(later.getHours(), 18);

    const passed = agent.computeNextRun(now, 7, 30);
    assert.equal(passed.getDate(), 9);
    assert.equal(passed.getHours(), 7);
    assert.equal(passed.getMinutes(), 30);
  });

  it('TC-ACT-04: getScheduleTime 은 .env 를 읽고, 범위 밖·비정수면 기본값(7:30)', () => {
    const agent = require('../src/services/agent');

    process.env.DAILY_BRIEF_HOUR = '9';
    process.env.DAILY_BRIEF_MINUTE = '15';
    assert.deepEqual(agent.getScheduleTime(), { hour: 9, minute: 15 });

    process.env.DAILY_BRIEF_HOUR = '25';
    process.env.DAILY_BRIEF_MINUTE = 'x';
    assert.deepEqual(agent.getScheduleTime(), { hour: 7, minute: 30 });
  });

  it('TC-ACT-07: 라우트·서비스 소스에 child_process/spawn/exec 문자열이 없다 (ADR-0011)', () => {
    const routeSrc = fs.readFileSync(path.join(__dirname, '../src/routes/agent.js'), 'utf8');
    const svcSrc = fs.readFileSync(path.join(__dirname, '../src/services/agent.js'), 'utf8');
    for (const src of [routeSrc, svcSrc]) {
      assert.ok(!/child_process/.test(src), 'child_process 참조 금지');
      assert.ok(!/\bspawn\s*\(/.test(src), 'spawn() 호출 금지');
      assert.ok(!/\bexec(File)?\s*\(/.test(src), 'exec()/execFile() 호출 금지');
    }
  });
});
