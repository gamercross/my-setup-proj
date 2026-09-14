// useCheckinStore 테스트 (TC-P10-STORE-01~04) — 개인 OS P10, ADR-0035
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
  const mod = await import(`../src/store/useCheckinStore.js?t=${n++}`);
  return mod.useCheckinStore;
}

const CHECKIN = {
  id: 1,
  period: '1주차',
  what: '뭔가 했다.',
  why: null,
  until: null,
  goal: null,
  strategy: null,
  action: null,
  status: null,
  project_id: null,
  objective_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

test('TC-P10-STORE-01: fetchCheckins 성공 시 checkins 설정, error null', async () => {
  fetchImpl = (url) => {
    assert.match(url, /\/checkins$/);
    return jsonRes({ checkins: [CHECKIN] });
  };
  const store = await freshStore();
  await store.getState().fetchCheckins();
  const s = store.getState();
  assert.equal(s.loaded, true);
  assert.equal(s.error, null);
  assert.equal(s.checkins.length, 1);
  assert.equal(s.checkins[0].what, '뭔가 했다.');
});

test('TC-P10-STORE-02: fetchCheckins 실패 시 error 문자열, 기존 데이터 보존', async () => {
  fetchImpl = () => jsonRes({ checkins: [CHECKIN] });
  const store = await freshStore();
  await store.getState().fetchCheckins();

  fetchImpl = () => jsonRes({ error: '서버 오류' }, false, 500);
  await store.getState().fetchCheckins();
  const s = store.getState();
  assert.equal(s.error, '서버 오류');
  assert.equal(s.checkins.length, 1, '기존 checkins 보존');
});

test('TC-P10-STORE-03: addCheckin 성공 시 맨 앞에 삽입, 실패 시 false·error 설정', async () => {
  fetchImpl = () => jsonRes({ checkins: [CHECKIN] });
  const store = await freshStore();
  await store.getState().fetchCheckins();

  const created = { ...CHECKIN, id: 2, what: '새 체크인' };
  fetchImpl = () => jsonRes({ checkin: created }, true, 201);
  const ok = await store.getState().addCheckin({ what: '새 체크인' });
  assert.equal(ok, true);
  let s = store.getState();
  assert.equal(s.checkins.length, 2);
  assert.equal(s.checkins[0].id, 2, '새 체크인이 맨 앞');
  assert.equal(s.error, null);

  fetchImpl = () => jsonRes({ error: '최소 한 개 질문에는 답해야 합니다.' }, false, 400);
  const fail = await store.getState().addCheckin({});
  assert.equal(fail, false);
  s = store.getState();
  assert.equal(s.error, '최소 한 개 질문에는 답해야 합니다.');
  assert.equal(s.checkins.length, 2, '실패 시 기존 데이터 보존');
});

test('TC-P10-STORE-04: updateCheckin/removeCheckin 낙관적 갱신 + 실패 롤백', async () => {
  fetchImpl = () => jsonRes({ checkins: [CHECKIN] });
  const store = await freshStore();
  await store.getState().fetchCheckins();

  // updateCheckin 낙관적 반영
  let resolveFn;
  fetchImpl = () =>
    new Promise((r) => {
      resolveFn = () => r({ ok: true, status: 200, json: async () => ({ checkin: { ...CHECKIN, what: '수정됨' } }) });
    });
  const p = store.getState().updateCheckin(1, { what: '수정됨' });
  assert.equal(store.getState().checkins[0].what, '수정됨', '낙관적 갱신 즉시 반영');
  resolveFn();
  await p;
  assert.equal(store.getState().checkins[0].what, '수정됨');

  // updateCheckin 실패 시 롤백
  fetchImpl = () => jsonRes({ error: '수정 실패' }, false, 400);
  await store.getState().updateCheckin(1, { what: '실패할 수정' });
  let s = store.getState();
  assert.equal(s.checkins[0].what, '수정됨', '롤백됨');
  assert.equal(s.error, '수정 실패');

  // removeCheckin 낙관적 반영 + 실패 롤백
  fetchImpl = () => jsonRes({ ok: true });
  const removed = await store.getState().removeCheckin(1);
  assert.equal(removed, true);
  assert.equal(store.getState().checkins.length, 0);

  fetchImpl = () => jsonRes({ checkins: [CHECKIN] });
  await store.getState().fetchCheckins();
  fetchImpl = () => jsonRes({ error: '삭제 실패' }, false, 400);
  const failRemove = await store.getState().removeCheckin(1);
  assert.equal(failRemove, false);
  s = store.getState();
  assert.equal(s.checkins.length, 1, '삭제 실패 시 롤백');
  assert.equal(s.error, '삭제 실패');
});
