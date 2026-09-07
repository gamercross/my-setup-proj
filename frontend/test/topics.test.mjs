// 주제 정의·기본 레이아웃 정합성 테스트 (TC-SHELL-06~08, 10) — ADR-0032

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TOPICS,
  TOPIC_GROUPS,
  DEFAULT_TOPIC_ID,
  getTopic,
  isValidTopicId,
  getTopicsByGroup,
} from '../src/widgets/topics.js';
import { DEFAULT_LAYOUTS, cloneDefaultInstances } from '../src/widgets/defaultLayout.js';
import { WIDGET_META } from '../src/widgets/widgetMeta.js';

test('TC-SHELL-06: TOPICS 는 11개, id 유일, group 유효, label/subtitle 비어있지 않음', () => {
  assert.equal(TOPICS.length, 11);
  const ids = new Set();
  const groups = new Set(TOPIC_GROUPS.map((g) => g.id));
  for (const t of TOPICS) {
    assert.ok(!ids.has(t.id), `중복 id: ${t.id}`);
    ids.add(t.id);
    assert.ok(groups.has(t.group), `알 수 없는 group: ${t.group}`);
    assert.ok(t.label && t.label.trim().length > 0, `${t.id} label 누락`);
    assert.ok(t.subtitle && t.subtitle.trim().length > 0, `${t.id} subtitle 누락`);
  }
  assert.ok(isValidTopicId(DEFAULT_TOPIC_ID));
  assert.equal(getTopic('nope'), null);
  assert.equal(getTopicsByGroup('command').length, 5);
});

test('TC-SHELL-07: 모든 주제가 DEFAULT_LAYOUTS 항목을 가지고, 각 인스턴스 type 이 등록돼 있다', () => {
  for (const t of TOPICS) {
    const layout = DEFAULT_LAYOUTS[t.id];
    assert.ok(Array.isArray(layout) && layout.length > 0, `${t.id} 기본 레이아웃 누락`);
    for (const inst of layout) {
      assert.ok(WIDGET_META[inst.type], `${t.id}: 미등록 타입 ${inst.type}`);
    }
  }
});

test('TC-SHELL-08: 각 기본 인스턴스는 minSize 이상, x+w≤12, 주제 내 type 중복 없음', () => {
  for (const t of TOPICS) {
    const seen = new Set();
    for (const inst of cloneDefaultInstances(t.id)) {
      const meta = WIDGET_META[inst.type];
      assert.ok(inst.w >= meta.minSize.w, `${t.id}/${inst.type} w < minSize`);
      assert.ok(inst.h >= meta.minSize.h, `${t.id}/${inst.type} h < minSize`);
      assert.ok(inst.x + inst.w <= 12, `${t.id}/${inst.type} x+w > 12`);
      assert.ok(!seen.has(inst.type), `${t.id}: type 중복 ${inst.type}`);
      seen.add(inst.type);
    }
  }
});

test('TC-SHELL-08: 미정의 주제 id 는 placeholder 1개로 폴백', () => {
  const list = cloneDefaultInstances('does-not-exist');
  assert.equal(list.length, 1);
  assert.equal(list[0].type, 'placeholder');
});

test('TC-SHELL-10: placeholder 메타는 hidden:true 이고 피커 목록에서 제외된다', () => {
  assert.equal(WIDGET_META.placeholder.hidden, true);
  const pickerList = Object.values(WIDGET_META).filter((m) => !m.hidden);
  assert.ok(!pickerList.some((m) => m.type === 'placeholder'));
  // 다른 메타엔 hidden 을 넣지 않는다
  for (const [type, meta] of Object.entries(WIDGET_META)) {
    if (type !== 'placeholder') assert.equal(meta.hidden, undefined);
  }
});
