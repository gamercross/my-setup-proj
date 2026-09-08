// 보드(칸반) 순수 로직 고정 테스트 (TC-P5-06~08, 12) — FR-TASK-09

import test from 'node:test';
import assert from 'node:assert/strict';

import { BOARD_COLUMNS, groupByPriority } from '../src/widgets/taskBoard.js';
import { WIDGET_META } from '../src/widgets/widgetMeta.js';
import { resolveDisplay } from '../src/widgets/displayConfig.js';

const T = (id, priority) => ({ id, title: `t${id}`, priority });

test('TC-P5-06: groupByPriority — 3열 배분 + 열 내부 입력 순서 보존', () => {
  const g = groupByPriority([T(1, 'high'), T(2, 'low'), T(3, 'high'), T(4, 'medium')]);
  assert.deepEqual(g.high.map((t) => t.id), [1, 3]);
  assert.deepEqual(g.medium.map((t) => t.id), [4]);
  assert.deepEqual(g.low.map((t) => t.id), [2]);
});

test('TC-P5-07: 미지/누락 priority → medium 열, 누락 0건', () => {
  const input = [T(1, undefined), T(2, 'weird'), T(3, null), T(4, 'high')];
  const g = groupByPriority(input);
  assert.deepEqual(g.medium.map((t) => t.id), [1, 2, 3]);
  const total = g.high.length + g.medium.length + g.low.length;
  assert.equal(total, input.length);
});

test('TC-P5-08: BOARD_COLUMNS 계약 (key/label, 순서 high→medium→low)', () => {
  assert.deepEqual(BOARD_COLUMNS.map((c) => c.key), ['high', 'medium', 'low']);
  assert.ok(BOARD_COLUMNS.every((c) => typeof c.label === 'string' && c.label));
  assert.deepEqual(groupByPriority([]), { high: [], medium: [], low: [] });
});

test('TC-P5-12: resolveDisplay(view:"kanban"/null/숫자) → list 폴백', () => {
  const schema = WIDGET_META.tasks.configSchema;
  for (const bad of ['kanban', null, 3, undefined]) {
    assert.equal(resolveDisplay(schema, { view: bad }).view, 'list');
  }
  assert.equal(resolveDisplay(schema, { view: 'board' }).view, 'board');
});

test('TC-P5-13: tasks 메타 규격 — view enum+default, minSize.w ≤ overview tasks w(4)', async () => {
  const view = WIDGET_META.tasks.configSchema.view;
  assert.equal(view.type, 'enum');
  assert.deepEqual(view.options, ['list', 'board']);
  assert.equal(view.default, 'list');
  const { DEFAULT_LAYOUTS } = await import('../src/widgets/defaultLayout.js');
  const overviewTasks = DEFAULT_LAYOUTS.overview.find((i) => i.type === 'tasks');
  assert.ok(WIDGET_META.tasks.minSize.w <= overviewTasks.w);
});
