// 위젯 레지스트리·기본 레이아웃 정합성 테스트 (TC-BRIEF-07)
// - registry.js 는 JSX view 를 import 하므로 node --test 에서 로드 불가.
//   대신 순수 메타(widgetMeta.js)와 defaultLayout.js 를 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';

import { WIDGET_META } from '../src/widgets/widgetMeta.js';
import { DEFAULT_LAYOUTS } from '../src/widgets/defaultLayout.js';

// P4.5(ADR-0032) 전 단일 기본 레이아웃 → overview 주제 레이아웃으로 이관.
const DEFAULT_INSTANCES = DEFAULT_LAYOUTS.overview;

test('TC-BRIEF-07: brief 위젯이 메타에 존재하고 showMeta 스키마를 가진다', () => {
  const brief = WIDGET_META.brief;
  assert.ok(brief, 'brief 메타 누락');
  assert.equal(brief.type, 'brief');
  assert.equal(brief.configSchema.showMeta.type, 'bool');
  assert.equal(brief.configSchema.showMeta.default, true);
  // config 는 showMeta 하나만
  assert.deepEqual(Object.keys(brief.configSchema), ['showMeta']);
});

test('TC-BRIEF-07: defaultLayout 의 모든 type 이 메타에 등록돼 있다', () => {
  for (const inst of DEFAULT_INSTANCES) {
    assert.ok(WIDGET_META[inst.type], `미등록 타입: ${inst.type}`);
  }
});

test('TC-BRIEF-07: defaultLayout 크기가 w≤12 이고 minSize 이상이다', () => {
  for (const inst of DEFAULT_INSTANCES) {
    const meta = WIDGET_META[inst.type];
    assert.ok(inst.w <= 12, `${inst.id} w>12`);
    assert.ok(inst.w >= meta.minSize.w, `${inst.id} w < minSize.w`);
    assert.ok(inst.h >= meta.minSize.h, `${inst.id} h < minSize.h`);
  }
});

test('TC-P8-REG-01: okr·weekly 위젯 메타가 등록돼 있다', () => {
  const okr = WIDGET_META.okr;
  assert.ok(okr);
  assert.equal(okr.configSchema.showTrend.type, 'bool');
  assert.equal(okr.configSchema.showTrend.default, true);
  assert.equal(okr.configSchema.includeArchived.default, false);

  const weekly = WIDGET_META.weekly;
  assert.ok(weekly);
  assert.equal(weekly.configSchema.maxItems.type, 'number');
  assert.equal(weekly.configSchema.maxItems.default, 20);
  assert.equal(weekly.configSchema.hideCompleted.default, false);
});

test('TC-P8-REG-02: PLAN 주제 기본 레이아웃이 okr·weekly 전용 위젯을 쓴다', () => {
  assert.deepEqual(DEFAULT_LAYOUTS.okr.map((i) => i.type), ['okr']);
  assert.deepEqual(DEFAULT_LAYOUTS.weekly.map((i) => i.type), ['weekly']);
  for (const key of ['okr', 'weekly']) {
    for (const inst of DEFAULT_LAYOUTS[key]) {
      const meta = WIDGET_META[inst.type];
      assert.ok(inst.w >= meta.minSize.w && inst.h >= meta.minSize.h);
    }
  }
});
