// 미들웨어 테스트 (TC-MW-01 ~ TC-MW-08)

const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');

describe('CORS / 로깅 / 에러 미들웨어', () => {
  it('TC-MW-01: 허용 오리진은 그대로 에코하고 Vary: Origin 을 붙인다', async () => {
    const app = createTestApp();
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.match(res.headers['vary'] || '', /Origin/);
  });

  it('TC-MW-02: 허용되지 않은 오리진은 CORS 헤더가 없다', async () => {
    const app = createTestApp();
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example');
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });

  it('TC-MW-03: preflight(OPTIONS)는 204 로 끝나고 메서드/헤더를 알린다', async () => {
    const app = createTestApp();
    const res = await request(app)
      .options('/api/tasks')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'PUT')
      .set('Access-Control-Request-Headers', 'content-type');
    assert.equal(res.status, 204);
    assert.match(res.headers['access-control-allow-methods'], /PUT/);
    assert.match(res.headers['access-control-allow-methods'], /DELETE/);
    assert.match(res.headers['access-control-allow-headers'], /Content-Type/);
  });

  it('TC-MW-04: Origin: null 은 APP_ENV=packaged 일 때만 허용한다', async () => {
    const prev = process.env.APP_ENV;
    process.env.APP_ENV = 'packaged';
    try {
      const app = createTestApp();
      const res = await request(app).get('/api/health').set('Origin', 'null');
      assert.equal(res.status, 200);
      assert.equal(res.headers['access-control-allow-origin'], 'null');
    } finally {
      process.env.APP_ENV = prev;
    }
  });

  it('TC-MW-05: 없는 경로는 404 + RFC 9457 오류 봉투 (ADR-0017)', async () => {
    const app = createTestApp();
    const res = await request(app).get('/api/does-not-exist');
    assert.equal(res.status, 404);
    // request_id 는 요청마다 랜덤이라 deepEqual 대신 키별로 assert 한다.
    assert.equal(res.body.type, 'not_found');
    assert.equal(res.body.title, '요청한 리소스를 찾을 수 없습니다');
    assert.equal(res.body.status, 404);
    assert.equal(res.body.detail, '요청한 경로를 찾을 수 없습니다.');
    assert.match(res.body.request_id, /^r-\d{8}-[0-9a-f]{8}$/);
    assert.equal(res.headers['content-type'], 'application/problem+json; charset=utf-8');
    assert.equal(res.headers['x-request-id'], res.body.request_id);
  });

  it('TC-MW-06: 깨진 JSON 본문은 400 (500 아님)', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/tasks')
      .type('json')
      .send('{');
    assert.equal(res.status, 400);
    assert.equal(res.body.type, 'validation_error');
    assert.ok(res.body.detail);
  });

  it('TC-MW-09: 너무 큰 본문은 413 + 한국어 봉투 (영어 내부 메시지 아님)', async () => {
    const app = createTestApp();
    const big = JSON.stringify({ t: 'x'.repeat(200 * 1024) });
    const res = await request(app)
      .post('/api/tasks')
      .type('json')
      .send(big);
    assert.equal(res.status, 413);
    assert.equal(res.body.type, 'payload_too_large');
    assert.equal(res.body.detail, '요청 본문이 너무 큽니다.');
    assert.doesNotMatch(res.body.detail, /entity|large/i);
    assert.equal(res.headers['content-type'], 'application/problem+json; charset=utf-8');
  });

  it('TC-MW-07: errorHandler 를 직접 호출하면 500 봉투를 반환한다', () => {
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
    const errMock = mock.method(console, 'error', () => {});
    try {
      errorHandler(new Error('boom'), {}, res, () => {});
    } finally {
      errMock.mock.restore();
    }
    assert.equal(res.statusCode, 500);
    assert.equal(payload.type, 'internal_error');
    assert.equal(payload.detail, '서버 내부 오류가 발생했습니다.');
  });

  it('TC-MW-08: requestLogger 는 finish 시 한 줄 로그를 남긴다', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const logMock = mock.method(console, 'log', () => {});
    try {
      const { requestLogger } = require('../src/middleware/requestLogger');
      const res = new EventEmitter();
      res.statusCode = 201;
      let nextCalled = false;
      requestLogger(
        { method: 'POST', originalUrl: '/api/tasks' },
        res,
        () => {
          nextCalled = true;
        }
      );
      assert.ok(nextCalled);
      res.emit('finish');
      assert.equal(logMock.mock.callCount(), 1);
      assert.match(logMock.mock.calls[0].arguments[0], /\w+ \S+ \d+ \d+ms/);
    } finally {
      logMock.mock.restore();
      process.env.NODE_ENV = prev;
    }
  });

  it('TC-MW-10: APP_ENV 미설정이면 Origin: null 도 CORS 헤더가 없다', async () => {
    const prev = process.env.APP_ENV;
    delete process.env.APP_ENV;
    try {
      const app = createTestApp();
      const res = await request(app).get('/api/health').set('Origin', 'null');
      assert.equal(res.status, 200);
      assert.equal(res.headers['access-control-allow-origin'], undefined);
    } finally {
      if (prev === undefined) {
        delete process.env.APP_ENV;
      } else {
        process.env.APP_ENV = prev;
      }
    }
  });
});
