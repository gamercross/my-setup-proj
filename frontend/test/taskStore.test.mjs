// useTaskStore 정본 불변식 테스트 (TC-P5-09~11) — ADR-0028
// - 스토어는 모듈 로드 시 client.js(→ fetch/window) 를 참조하므로,
//   window.appInfo + globalThis.fetch 를 먼저 심고 ?t=n 으로 모듈 캐시를 우회한다 (uiStore.test 선례).

import test from 'node:test';
import assert from 'node:assert/strict';

const BASE = 'http://x/api';

// 다음 fetch 호출들이 어떻게 응답할지 테스트가 지정한다.
let fetchImpl;

function jsonRes(body, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: async () => body });
}

globalThis.window = { appInfo: { apiBaseUrl: BASE } };
globalThis.fetch = (url, options) => fetchImpl(String(url), options || {});

let n = 0;
async function freshStore() {
  const mod = await import(`../src/store/useTaskStore.js?t=${n++}`);
  return mod.useTaskStore;
}

const SAMPLE = [
  { id: 1, title: 'a', status: 'todo', priority: 'high' },
  { id: 2, title: 'b', status: 'todo', priority: 'medium' },
  { id: 3, title: 'c', status: 'done', priority: 'low' },
];

test('TC-P5-09: fetch 후 tasks === order.map(id => byId[id])', async () => {
  fetchImpl = () => jsonRes({ tasks: SAMPLE });
  const store = await freshStore();
  await store.getState().fetchTasks();
  const s = store.getState();
  assert.deepEqual(s.order, [1, 2, 3]);
  assert.deepEqual(s.tasks, s.order.map((id) => s.byId[id]));
  assert.ok(Array.isArray(s.tasks));
});

test('TC-P5-10: 낙관적 토글은 동기적으로 반영되고 무관 항목은 같은 객체 참조', async () => {
  fetchImpl = () => jsonRes({ tasks: SAMPLE });
  const store = await freshStore();
  await store.getState().fetchTasks();
  const before2 = store.getState().byId[2];

  // PUT 은 잠깐 매달아 둔다 → 낙관적 상태만 관찰
  let resolvePut;
  fetchImpl = () => new Promise((r) => { resolvePut = () => r({ ok: true, status: 200, json: async () => ({ task: { id: 1, title: 'a', status: 'done', priority: 'high' } }) }); });

  const p = store.getState().toggleTask(1);
  assert.equal(store.getState().byId[1].status, 'done', '동기 낙관 반영');
  assert.equal(store.getState().byId[2], before2, '무관 항목 참조 유지');
  resolvePut();
  await p;
  assert.equal(store.getState().byId[1].status, 'done');
});

test('TC-P5-11: 실패하면 byId/order/tasks 3필드가 복원되고 error 가 채워지며 throw 하지 않는다', async () => {
  fetchImpl = () => jsonRes({ tasks: SAMPLE });
  const store = await freshStore();
  await store.getState().fetchTasks();
  const prev = store.getState();
  const prevById = prev.byId;
  const prevOrder = prev.order;
  const prevTasks = prev.tasks;

  fetchImpl = () => jsonRes({ error: '서버 오류' }, false, 500);
  await store.getState().removeTask(2); // 반드시 resolve (throw 없음)

  const s = store.getState();
  assert.equal(s.byId, prevById, 'byId 참조 복원(스냅샷)');
  assert.equal(s.order, prevOrder, 'order 참조 복원(스냅샷)');
  assert.deepEqual(s.tasks, prevTasks, 'tasks 파생 결과 복원');
  assert.equal(typeof s.error, 'string');
});

test('TC-P5-11b: fetch 실패해도 기존 tasks 는 보존 + error 문자열', async () => {
  fetchImpl = () => jsonRes({ tasks: SAMPLE });
  const store = await freshStore();
  await store.getState().fetchTasks();
  fetchImpl = () => Promise.reject(new Error('net'));
  await store.getState().fetchTasks();
  const s = store.getState();
  assert.equal(s.tasks.length, 3);
  assert.equal(typeof s.error, 'string');
  assert.equal(s.loading, false);
});
