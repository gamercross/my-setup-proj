// 셸 UI 스토어 테스트 (TC-SHELL-09) — ADR-0032
// - useUiStore 는 모듈 로드 시 window.localStorage 를 읽으므로, 시나리오마다
//   스텁을 먼저 심고 쿼리스트링으로 모듈 캐시를 우회해 다시 import 한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import { installFakeStorage } from './_fakeStorage.mjs';

const KEY = 'dashboard.ui.v1';
let n = 0;
async function freshStore(stored) {
  installFakeStorage(stored ? { [KEY]: stored } : {});
  const mod = await import(`../src/store/useUiStore.js?t=${n++}`);
  return mod.useUiStore;
}

test('TC-SHELL-09: 저장된 activeTopic 이 유효하면 복원한다', async () => {
  const useUiStore = await freshStore(JSON.stringify({ version: 1, activeTopic: 'projects' }));
  assert.equal(useUiStore.getState().activeTopic, 'projects');
});

test('TC-SHELL-09: 저장값이 없으면 overview', async () => {
  const useUiStore = await freshStore(null);
  assert.equal(useUiStore.getState().activeTopic, 'overview');
});

test('TC-SHELL-09: 미등록/손상 값이면 overview 로 폴백', async () => {
  for (const bad of [
    JSON.stringify({ version: 1, activeTopic: 'ghost' }),
    '{broken',
    JSON.stringify({ version: 1 }),
  ]) {
    const useUiStore = await freshStore(bad);
    assert.equal(useUiStore.getState().activeTopic, 'overview');
  }
});

test('TC-SHELL-09: setActiveTopic 은 유효 id 만 반영하고 localStorage 에 영속한다', async () => {
  const useUiStore = await freshStore(null);
  useUiStore.getState().setActiveTopic('calendar');
  assert.equal(useUiStore.getState().activeTopic, 'calendar');
  assert.match(window.localStorage.getItem(KEY), /calendar/);

  useUiStore.getState().setActiveTopic('nonsense');
  assert.equal(useUiStore.getState().activeTopic, 'calendar', '무효 id 는 무시');
});

test('TC-SHELL: togglePicker / setPickerOpen (세션 전용)', async () => {
  const useUiStore = await freshStore(null);
  assert.equal(useUiStore.getState().pickerOpen, false);
  useUiStore.getState().togglePicker();
  assert.equal(useUiStore.getState().pickerOpen, true);
  useUiStore.getState().togglePicker(false);
  assert.equal(useUiStore.getState().pickerOpen, false);
  useUiStore.getState().setPickerOpen(true);
  assert.equal(useUiStore.getState().pickerOpen, true);
});
