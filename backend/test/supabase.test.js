// Supabase 부트스트랩 테스트 (TC-SYNC-01~05)
// 원칙: 실제 Supabase 네트워크 호출 0건. 미설정/더미 값만 사용한다.
// 개발자 셸에 SUPABASE_* 가 export 돼 있을 수 있으므로 beforeEach 에서 지우고 after 에서 원복한다.

const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');

const SAVED = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,
  SUPABASE_TIMEOUT_MS: process.env.SUPABASE_TIMEOUT_MS,
};

beforeEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_KEY;
  delete process.env.SUPABASE_TIMEOUT_MS;
});

after(() => {
  for (const [k, v] of Object.entries(SAVED)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe('Supabase 부트스트랩', () => {
  it('TC-SYNC-01: 미설정이어도 GET /api/tasks 는 200 (회귀)', async () => {
    const app = createTestApp();
    const res = await request(app).get('/api/tasks');
    assert.equal(res.status, 200);
  });

  it('TC-SYNC-02: 미설정 시 getSupabaseClient() === null, 예외 없음', () => {
    createTestApp(); // src/ 캐시 초기화
    const supabase = require('../src/supabase');
    assert.equal(supabase.getSupabaseClient(), null);
    assert.equal(supabase.isConfigured(), false);
  });

  it('TC-SYNC-03: 미설정 → GET /api/sync/health 200 { supabase: "unconfigured" } (네트워크 미접촉)', async () => {
    const app = createTestApp();
    const res = await request(app).get('/api/sync/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.supabase, 'unconfigured');
    assert.ok(res.body.checkedAt);
  });

  it('TC-SYNC-04: 더미 값 → getSupabaseClient() 객체, client.from 함수, 2회 호출 동일 인스턴스', () => {
    createTestApp();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_KEY = 'dummy';
    const supabase = require('../src/supabase');
    const c1 = supabase.getSupabaseClient();
    assert.ok(c1);
    assert.equal(typeof c1.from, 'function');
    assert.equal(supabase.getSupabaseClient(), c1);
  });

  it('TC-SYNC-05: 더미 키 + 짧은 타임아웃 → /api/sync/health 응답에 키 값("dummy") 미포함', async () => {
    // 라우팅 불가 IP → 소켓 연결이 매달리고 AbortSignal.timeout 이 100ms 에 끊는다.
    process.env.SUPABASE_URL = 'https://10.255.255.1';
    process.env.SUPABASE_KEY = 'dummy';
    process.env.SUPABASE_TIMEOUT_MS = '100';
    const app = createTestApp();
    const res = await request(app).get('/api/sync/health');
    assert.equal(res.status, 200);
    assert.ok(!JSON.stringify(res.body).includes('dummy'));
  });
});
