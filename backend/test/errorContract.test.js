// REST 오류 응답 계약 테스트 (TC-ERR-01~07) — ADR-0017
// 봉투 형식({ type, title, status, detail, errors?, request_id }) 과
// PROBLEM_TYPES 표 고정을 검증한다 (TC-ERR-06 은 표 자체를 assert — 오타/누락 방지).

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');

describe('REST 오류 응답 계약 (ADR-0017)', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  it('TC-ERR-01: 400 검증 오류 — type=validation_error + status 일치', async () => {
    const res = await request(app).post('/api/tasks').send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.type, 'validation_error');
    assert.equal(res.body.status, 400);
    assert.equal(res.body.title, '입력이 올바르지 않습니다');
    assert.ok(res.body.detail);
    assert.ok(res.body.request_id);
  });

  it('TC-ERR-02: 404 — type=not_found + status 일치', async () => {
    const res = await request(app).get('/api/tasks/99999');
    assert.equal(res.status, 404);
    assert.equal(res.body.type, 'not_found');
    assert.equal(res.body.status, 404);
    assert.equal(res.body.title, '요청한 리소스를 찾을 수 없습니다');
  });

  it('TC-ERR-03: 500 — detail 에 스택·영문·SQLite 원문이 없다', async () => {
    const { errorHandler } = require('../src/middleware/errorHandler');
    let payload;
    const res = {
      headersSent: false,
      statusCode: 200,
      req: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      type() {
        return this;
      },
      json(body) {
        payload = body;
        return this;
      },
    };
    const { mock } = require('node:test');
    const errMock = mock.method(console, 'error', () => {});
    try {
      errorHandler(new Error('SQLITE_CONSTRAINT: something at /home/x/secret/path.js:12'), {}, res, () => {});
    } finally {
      errMock.mock.restore();
    }
    assert.equal(res.statusCode, 500);
    assert.equal(payload.type, 'internal_error');
    assert.doesNotMatch(payload.detail, /SQLITE|at \/|\.js:\d+/);
    assert.equal(payload.detail, '서버 내부 오류가 발생했습니다.');
  });

  it('TC-ERR-04: Content-Type=application/problem+json, X-Request-Id 헤더가 본문 request_id 와 같다', async () => {
    const res = await request(app).get('/api/tasks/99999');
    assert.match(res.headers['content-type'], /^application\/problem\+json/);
    assert.equal(res.headers['x-request-id'], res.body.request_id);
  });

  it('TC-ERR-05: 클라이언트가 보낸 X-Request-Id 는 형식이 맞으면 에코, 부적합하면 무시하고 새로 발급', async () => {
    const good = await request(app).get('/api/tasks/99999').set('X-Request-Id', 'my-custom-id-123');
    assert.equal(good.headers['x-request-id'], 'my-custom-id-123');
    assert.equal(good.body.request_id, 'my-custom-id-123');

    const bad = await request(app).get('/api/tasks/99999').set('X-Request-Id', '../evil header with spaces');
    assert.notEqual(bad.headers['x-request-id'], '../evil header with spaces');
    assert.match(bad.headers['x-request-id'], /^r-\d{8}-[0-9a-f]{8}$/);
  });

  it('TC-ERR-06: errors[] 필드 — 필드명을 아는 지점에서만 채운다', async () => {
    const res = await request(app).get('/api/tasks?project_id=abc');
    assert.equal(res.status, 400);
    assert.ok(Array.isArray(res.body.errors));
    assert.equal(res.body.errors[0].field, 'project_id');
  });

  it('TC-ERR-07: agent no-root → upstream_unavailable/503', async () => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-err-'));
    process.env.AGENT_PATH = path.join(tmpRoot, 'does-not-exist');
    try {
      const app2 = createTestApp();
      const res = await request(app2).post('/api/agent/run-now').send({});
      assert.equal(res.status, 503);
      assert.equal(res.body.type, 'upstream_unavailable');
      assert.equal(res.body.title, '일시적으로 요청을 처리할 수 없습니다');
    } finally {
      delete process.env.AGENT_PATH;
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('PROBLEM_TYPES 표는 6종 · type→status 1:1 고정 (오타/누락 방지)', () => {
    const { PROBLEM_TYPES } = require('../src/problem');
    assert.deepEqual(Object.keys(PROBLEM_TYPES).sort(), [
      'conflict',
      'internal_error',
      'not_found',
      'payload_too_large',
      'upstream_unavailable',
      'validation_error',
    ]);
    assert.equal(PROBLEM_TYPES.validation_error.status, 400);
    assert.equal(PROBLEM_TYPES.not_found.status, 404);
    assert.equal(PROBLEM_TYPES.conflict.status, 409);
    assert.equal(PROBLEM_TYPES.payload_too_large.status, 413);
    assert.equal(PROBLEM_TYPES.upstream_unavailable.status, 503);
    assert.equal(PROBLEM_TYPES.internal_error.status, 500);
    // status 값 중복 없음 (1:1 불변식)
    const statuses = Object.values(PROBLEM_TYPES).map((v) => v.status);
    assert.equal(new Set(statuses).size, statuses.length);
  });
});
