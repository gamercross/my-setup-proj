// 주제별 레이아웃 영속화 테스트 (TC-SHELL-01~05) — ADR-0032
// - layoutStorage.js 는 registry(JSX) 대신 widgetMeta 만 참조하므로 node --test 에서 직접 로드 가능.
// - window.localStorage 는 인메모리 스텁 주입.

import test from 'node:test';
import assert from 'node:assert/strict';
import { installFakeStorage } from './_fakeStorage.mjs';

import {
  STORAGE_KEY,
  LEGACY_KEY_V1,
  sanitizeInstances,
  loadAllTopics,
  loadTopicLayout,
  saveTopicLayout,
  _resetLayoutCache,
} from '../src/widgets/layoutStorage.js';

const V1_INSTANCES = [
  { id: 'tasks', type: 'tasks', x: 0, y: 0, w: 4, h: 6 },
  { id: 'brief', type: 'brief', x: 0, y: 6, w: 4, h: 6 },
];

function v1Payload(instances, version = 1) {
  return JSON.stringify({ version, instances });
}

test('TC-SHELL-01: v1 존재 → overview 로 마이그레이션 + v2 생성 + v1 삭제', () => {
  const fake = installFakeStorage({ [LEGACY_KEY_V1]: v1Payload(V1_INSTANCES) });
  _resetLayoutCache();

  const map = loadAllTopics();
  assert.deepEqual(map.overview, sanitizeInstances(V1_INSTANCES));
  assert.ok(fake.getItem(STORAGE_KEY), 'v2 키가 생성돼야 한다');
  assert.equal(fake.getItem(LEGACY_KEY_V1), null, 'v1 키는 삭제돼야 한다');
});

test('TC-SHELL-02: v1 손상/version:0/빈배열 → 마이그레이션 안 함, {} , 예외 없음, v1 유지', () => {
  for (const bad of ['{not json', v1Payload(V1_INSTANCES, 0), v1Payload([])]) {
    const fake = installFakeStorage({ [LEGACY_KEY_V1]: bad });
    _resetLayoutCache();
    const map = loadAllTopics();
    assert.deepEqual(map, {});
    assert.equal(fake.getItem(LEGACY_KEY_V1), bad, 'v1 원본은 보존돼야 한다');
  }
});

test('TC-SHELL-03: v2 존재 시 v1 은 무시된다', () => {
  const v2 = JSON.stringify({ version: 2, topics: { calendar: sanitizeInstances(V1_INSTANCES) } });
  const fake = installFakeStorage({
    [STORAGE_KEY]: v2,
    [LEGACY_KEY_V1]: v1Payload(V1_INSTANCES),
  });
  _resetLayoutCache();

  const map = loadAllTopics();
  assert.ok(map.calendar, 'v2 내용이 쓰여야 한다');
  assert.equal(map.overview, undefined, 'v1 은 마이그레이션되지 않아야 한다');
  assert.ok(fake.getItem(LEGACY_KEY_V1), 'v1 키는 그대로 남는다');
});

test('TC-SHELL-04: 한 주제 저장이 다른 주제 레이아웃에 영향 없다', () => {
  installFakeStorage();
  _resetLayoutCache();

  const overview = sanitizeInstances(V1_INSTANCES);
  saveTopicLayout('overview', overview);
  saveTopicLayout('tasks', [{ id: 'tasks', type: 'tasks', x: 0, y: 0, w: 8, h: 10, z: 1, minimized: false, config: {} }]);

  assert.deepEqual(loadTopicLayout('overview'), overview);
});

test('TC-SHELL-05: v2 손상 → {} + warn, 크래시 없음', () => {
  const fake = installFakeStorage({ [STORAGE_KEY]: '{broken' });
  _resetLayoutCache();

  const warnings = [];
  const origWarn = console.warn;
  console.warn = (...a) => warnings.push(a);
  try {
    const map = loadAllTopics();
    assert.deepEqual(map, {});
  } finally {
    console.warn = origWarn;
  }
  assert.ok(warnings.length > 0, 'warn 이 한 번 이상 호출돼야 한다');
  assert.ok(fake.getItem(STORAGE_KEY), '손상값을 임의로 지우지 않는다');
});

test('TC-SHELL: 미등록 topicId 키는 보존된다 (FR-WIDGET-08 정신)', () => {
  const v2 = JSON.stringify({
    version: 2,
    topics: { unknownTopic: [{ id: 'tasks', type: 'tasks', x: 0, y: 0, w: 4, h: 4 }] },
  });
  installFakeStorage({ [STORAGE_KEY]: v2 });
  _resetLayoutCache();
  assert.ok(loadAllTopics().unknownTopic, '낯선 주제 키를 파기하지 않는다');
});
