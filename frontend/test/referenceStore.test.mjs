// useReferenceStore 테스트 (TC-P12-STORE-01~05) — 개인 OS P12, ADR-0037
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
  const mod = await import(`../src/store/useReferenceStore.js?t=${n++}`);
  return mod.useReferenceStore;
}

const REFERENCE = {
  id: 1,
  title: '강의자료',
  category: '강의',
  location: null,
  due_date: null,
  status: 'todo',
  project_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  steps: [],
};

test('TC-P12-STORE-01: fetchReferences 성공 시 references 설정, error null', async () => {
  fetchImpl = (url) => {
    assert.match(url, /\/references$/);
    return jsonRes({ references: [REFERENCE] });
  };
  const store = await freshStore();
  await store.getState().fetchReferences();
  const s = store.getState();
  assert.equal(s.loaded, true);
  assert.equal(s.error, null);
  assert.equal(s.references.length, 1);
  assert.equal(s.references[0].title, '강의자료');
});

test('TC-P12-STORE-02: fetchReferences 실패 시 error 문자열, 기존 데이터 보존', async () => {
  fetchImpl = () => jsonRes({ references: [REFERENCE] });
  const store = await freshStore();
  await store.getState().fetchReferences();

  fetchImpl = () => jsonRes({ type: 'internal_error', title: '서버 내부 오류가 발생했습니다', detail: '서버 오류' }, false, 500);
  await store.getState().fetchReferences();
  const s = store.getState();
  assert.equal(s.error, '서버 오류');
  assert.equal(s.references.length, 1, '기존 references 보존');
});

test('TC-P12-STORE-03: addReference 성공 시 끝에 추가, 실패 시 false·error 설정', async () => {
  fetchImpl = () => jsonRes({ references: [REFERENCE] });
  const store = await freshStore();
  await store.getState().fetchReferences();

  const created = { ...REFERENCE, id: 2, title: '새 자료' };
  fetchImpl = () => jsonRes({ reference: created }, true, 201);
  const ok = await store.getState().addReference({ title: '새 자료' });
  assert.equal(ok, true);
  let s = store.getState();
  assert.equal(s.references.length, 2);
  assert.equal(s.references[1].id, 2, '새 레퍼런스가 끝에 추가');
  assert.equal(s.error, null);

  fetchImpl = () => jsonRes({ type: 'validation_error', title: '입력이 올바르지 않습니다', detail: 'title 은 필수입니다.' }, false, 400);
  const fail = await store.getState().addReference({});
  assert.equal(fail, false);
  s = store.getState();
  assert.equal(s.error, 'title 은 필수입니다.');
  assert.equal(s.references.length, 2, '실패 시 기존 데이터 보존');
});

test('TC-P12-STORE-04: updateReference/removeReference 낙관적 갱신 + 실패 롤백', async () => {
  fetchImpl = () => jsonRes({ references: [REFERENCE] });
  const store = await freshStore();
  await store.getState().fetchReferences();

  // updateReference 낙관적 반영
  let resolveFn;
  fetchImpl = () =>
    new Promise((r) => {
      resolveFn = () => r({ ok: true, status: 200, json: async () => ({ reference: { ...REFERENCE, title: '수정됨' } }) });
    });
  const p = store.getState().updateReference(1, { title: '수정됨' });
  assert.equal(store.getState().references[0].title, '수정됨', '낙관적 갱신 즉시 반영');
  resolveFn();
  await p;
  assert.equal(store.getState().references[0].title, '수정됨');

  // removeReference 실패 시 롤백
  fetchImpl = () => jsonRes({ type: 'not_found', title: '요청한 리소스를 찾을 수 없습니다', detail: '레퍼런스를 찾을 수 없습니다.' }, false, 404);
  const ok = await store.getState().removeReference(1);
  assert.equal(ok, false);
  const s = store.getState();
  assert.equal(s.references.length, 1, '실패 시 롤백');
  assert.equal(s.error, '레퍼런스를 찾을 수 없습니다.');
});

test('TC-P12-STORE-05: addStep/removeStep — 서버가 반환한 부모 행 전체로 치환', async () => {
  fetchImpl = () => jsonRes({ references: [REFERENCE] });
  const store = await freshStore();
  await store.getState().fetchReferences();

  const withStep = { ...REFERENCE, steps: [{ id: 1, reference_id: 1, step_order: 1, note: '훑기', created_at: '2026-01-01T00:00:00.000Z' }] };
  fetchImpl = () => jsonRes({ reference: withStep }, true, 201);
  const ok = await store.getState().addStep(1, '훑기');
  assert.equal(ok, true);
  let s = store.getState();
  assert.equal(s.references[0].steps.length, 1);
  assert.equal(s.references[0].steps[0].note, '훑기');

  const withoutStep = { ...REFERENCE, steps: [] };
  fetchImpl = () => jsonRes({ reference: withoutStep }, true, 200);
  const ok2 = await store.getState().removeStep(1, 1);
  assert.equal(ok2, true);
  s = store.getState();
  assert.equal(s.references[0].steps.length, 0);

  fetchImpl = () => jsonRes({ type: 'not_found', title: '요청한 리소스를 찾을 수 없습니다', detail: '요약 단계를 찾을 수 없습니다.' }, false, 404);
  const fail = await store.getState().removeStep(1, 999);
  assert.equal(fail, false);
  assert.equal(store.getState().error, '요약 단계를 찾을 수 없습니다.');
});
