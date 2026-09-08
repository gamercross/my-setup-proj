// useOkrStore 테스트 (TC-P8-STORE-01~04) — P8, FR-OKR-06 AC-3
// - 스토어는 로드 시 client.js(→ fetch/window) 를 참조하므로 먼저 심는다.

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
  const mod = await import(`../src/store/useOkrStore.js?t=${n++}`);
  return mod.useOkrStore;
}

const DASH = {
  objectives: [
    {
      id: 1,
      title: '건강',
      period: '2026-Q3',
      status: 'active',
      pct: 0.5,
      keyResults: [{ id: 10, title: '운동', target: 10, current: 5, unit: '회', pct: 0.5, project_id: null }],
    },
  ],
  summary: { krAvgPct: 0.5, objectiveCount: 1, keyResultCount: 1, bucket: { high: 0, mid: 1, low: 0 } },
};

test('TC-P8-STORE-01: fetchOkr 성공 시 objectives·summary 설정, error null', async () => {
  fetchImpl = (url) => {
    assert.match(url, /\/okr$/);
    return jsonRes(DASH);
  };
  const store = await freshStore();
  await store.getState().fetchOkr();
  const s = store.getState();
  assert.equal(s.loaded, true);
  assert.equal(s.error, null);
  assert.equal(s.objectives.length, 1);
  assert.equal(s.summary.keyResultCount, 1);
});

test('TC-P8-STORE-02: fetchOkr 실패 시 error 문자열, 기존 데이터 보존', async () => {
  fetchImpl = () => jsonRes(DASH);
  const store = await freshStore();
  await store.getState().fetchOkr();

  fetchImpl = () => jsonRes({ error: '서버 오류' }, false, 500);
  await store.getState().fetchOkr();
  const s = store.getState();
  assert.equal(s.error, '서버 오류');
  assert.equal(s.objectives.length, 1, '기존 objectives 보존');
});

test('TC-P8-STORE-03: updateKeyResult 낙관적 갱신 + summary 재계산', async () => {
  fetchImpl = () => jsonRes(DASH);
  const store = await freshStore();
  await store.getState().fetchOkr();

  // 서버 응답은 느리게: 먼저 낙관적 상태 확인
  let resolveFn;
  fetchImpl = () =>
    new Promise((r) => {
      resolveFn = () => r({ ok: true, status: 200, json: async () => ({ keyResult: { id: 10, current: 10 } }) });
    });
  const p = store.getState().updateKeyResult(10, { current: 10 });
  // 낙관적으로 pct=1, summary.bucket.high=1
  let s = store.getState();
  assert.equal(s.objectives[0].keyResults[0].pct, 1);
  assert.equal(s.summary.bucket.high, 1);
  resolveFn();
  await p;
  s = store.getState();
  assert.equal(s.objectives[0].keyResults[0].current, 10);
});

test('TC-P8-STORE-04: updateKeyResult 실패 시 롤백', async () => {
  fetchImpl = () => jsonRes(DASH);
  const store = await freshStore();
  await store.getState().fetchOkr();

  fetchImpl = () => jsonRes({ error: '수정 실패' }, false, 400);
  await store.getState().updateKeyResult(10, { current: 10 });
  const s = store.getState();
  assert.equal(s.objectives[0].keyResults[0].current, 5, '롤백됨');
  assert.equal(s.objectives[0].keyResults[0].pct, 0.5);
  assert.equal(s.error, '수정 실패');
});
