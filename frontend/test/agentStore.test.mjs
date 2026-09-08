// useAgentStore 테스트 (TC-P7-01~04) — P7, FR-AGENT-08
// - 스토어는 모듈 로드 시 client.js(→ fetch/window) 를 참조하므로 window.appInfo + fetch 를 먼저 심는다.

import test from 'node:test';
import assert from 'node:assert/strict';

const BASE = 'http://x/api';
let fetchImpl;

function jsonRes(body, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: async () => body });
}

globalThis.window = { appInfo: { apiBaseUrl: BASE } };
globalThis.fetch = (url, options) => fetchImpl(String(url), options || {});

let n = 0;
async function freshStore() {
  const mod = await import(`../src/store/useAgentStore.js?t=${n++}`);
  return mod.useAgentStore;
}

const ACTIVITY = {
  logs: [
    { id: 2, service: 'notion', status: 'failed', last_sync: '2026-09-08T00:10:00.000Z', error_message: '401' },
    { id: 1, service: 'gmail', status: 'success', last_sync: '2026-09-08T00:00:00.000Z', error_message: null },
  ],
  health: { supabase: 'ok', detail: '연결됨', host: 'db.example.co' },
  nextRun: { at: '2026-09-09T07:30:00.000Z', hour: 7, minute: 30, source: 'schedule' },
  runNow: { pending: false, requestedAt: null, available: true },
  checkedAt: '2026-09-08T01:00:00.000Z',
};

test('TC-P7-01: fetchActivity 성공 시 activity·loaded 설정, error null', async () => {
  fetchImpl = (url) => {
    assert.match(url, /\/agent\/activity\?limit=10/);
    return jsonRes(ACTIVITY);
  };
  const store = await freshStore();
  await store.getState().fetchActivity(10);
  const s = store.getState();
  assert.equal(s.loaded, true);
  assert.equal(s.error, null);
  assert.equal(s.activity.logs.length, 2);
});

test('TC-P7-02: fetchActivity 실패 시 error 문자열, 기존 activity 보존', async () => {
  fetchImpl = () => jsonRes(ACTIVITY);
  const store = await freshStore();
  await store.getState().fetchActivity();

  fetchImpl = () => jsonRes({ error: '서버 오류' }, false, 500);
  await store.getState().fetchActivity();
  const s = store.getState();
  assert.equal(s.error, '서버 오류');
  assert.ok(s.activity, '기존 activity 보존');
});

test('TC-P7-03: requestRun 성공 시 requestMessage 설정 + activity 재조회', async () => {
  let calls = 0;
  fetchImpl = (url, opt) => {
    calls += 1;
    if (opt.method === 'POST') {
      return jsonRes({ ok: true, pending: true, requestedAt: '2026-09-08T01:00:00.000Z', alreadyPending: false });
    }
    return jsonRes(ACTIVITY);
  };
  const store = await freshStore();
  await store.getState().fetchActivity();
  const before = calls;
  await store.getState().requestRun();
  const s = store.getState();
  assert.match(s.requestMessage, /요청/);
  assert.equal(s.requesting, false);
  assert.ok(calls > before + 1, 'POST + 재조회 GET');
});

test('TC-P7-03b: requestRun 재조회 시 마지막 limit 유지 (lastLimit 회귀)', async () => {
  const getUrls = [];
  fetchImpl = (url, opt) => {
    if (opt.method === 'POST') {
      return jsonRes({ ok: true, pending: true, requestedAt: '2026-09-08T01:00:00.000Z', alreadyPending: false });
    }
    getUrls.push(url);
    return jsonRes(ACTIVITY);
  };
  const store = await freshStore();
  await store.getState().fetchActivity(25);
  await store.getState().requestRun();
  // 재조회 GET URL 은 초기화에 쓴 limit=25 를 그대로 사용해야 한다 (10 으로 축소 금지).
  assert.match(getUrls[getUrls.length - 1], /\/agent\/activity\?limit=25/);
});

test('TC-P7-03c: 데모 응답의 note 가 requestMessage 로 노출', async () => {
  fetchImpl = (url, opt) => {
    if (opt.method === 'POST') {
      return jsonRes({ ok: true, pending: true, note: '데모 모드 — 즉시 실행됨' });
    }
    return jsonRes(ACTIVITY);
  };
  const store = await freshStore();
  await store.getState().fetchActivity();
  await store.getState().requestRun();
  assert.equal(store.getState().requestMessage, '데모 모드 — 즉시 실행됨');
});

test('TC-P7-04: requestRun 재진입 방어 — requesting 중이면 즉시 반환', async () => {
  fetchImpl = () => jsonRes(ACTIVITY);
  const store = await freshStore();
  store.setState({ requesting: true });
  const r = await store.getState().requestRun();
  assert.equal(r, undefined);
  // 여전히 requesting=true (아무 것도 안 함)
  assert.equal(store.getState().requesting, true);
});
