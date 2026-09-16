// useKnowledgeStore 테스트 (TC-P11-STORE-01~03) — 개인 OS P11, ADR-0036
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
  const mod = await import(`../src/store/useKnowledgeStore.js?t=${n++}`);
  return mod.useKnowledgeStore;
}

const TREND = {
  window: { weeks: 8, from: '2026-04-27', to: '2026-06-21' },
  checkins: { total: 3, points: [{ week: '2026-04-27', label: '04-27', count: 1 }] },
  okr: { points: [{ month: '2026-06', krAvgPct: 0.5 }], latestPct: 0.5 },
  tags: { total: 2, distinct: 2, otherCount: 0, items: [{ tag: '학습', count: 2 }] },
  summary: { checkinWeeks: 1, activeWeeks: 8, topTag: '학습' },
};

test('TC-P11-STORE-01: fetchTrend 성공 시 trend 설정, error null', async () => {
  fetchImpl = (url) => {
    assert.match(url, /\/knowledge-trend/);
    return jsonRes(TREND);
  };
  const store = await freshStore();
  await store.getState().fetchTrend();
  const s = store.getState();
  assert.equal(s.loaded, true);
  assert.equal(s.error, null);
  assert.deepEqual(s.trend, TREND);
});

test('TC-P11-STORE-02: fetchTrend 실패 시 error 문자열, 기존 trend 보존', async () => {
  fetchImpl = () => jsonRes(TREND);
  const store = await freshStore();
  await store.getState().fetchTrend();

  fetchImpl = () => jsonRes({ type: 'internal_error', title: '서버 내부 오류가 발생했습니다', detail: '서버 오류' }, false, 500);
  await store.getState().fetchTrend();
  const s = store.getState();
  assert.equal(s.error, '서버 오류');
  assert.deepEqual(s.trend, TREND, '기존 trend 보존');
});

test('TC-P11-STORE-03: fetchTrend 는 weeks 쿼리를 전달한다', async () => {
  let calledUrl;
  fetchImpl = (url) => {
    calledUrl = url;
    return jsonRes(TREND);
  };
  const store = await freshStore();
  await store.getState().fetchTrend({ weeks: 4 });
  assert.match(calledUrl, /\/knowledge-trend\?weeks=4$/);

  await store.getState().fetchTrend();
  assert.match(calledUrl, /\/knowledge-trend$/);
});
