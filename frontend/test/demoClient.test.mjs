// 웹 데모 요청 핸들러 테스트 (TC-DEMO-01~06) — ADR-0026
// demoClient.js 는 브라우저 API 에 의존하지 않으므로 node --test 에서 직접 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';

import { demoRequest, _resetDemoStore } from '../src/api/demoClient.js';

test.beforeEach(() => _resetDemoStore());

test('TC-DEMO-01: GET /health 는 { status: "ok", demo: true }', async () => {
  assert.deepEqual(await demoRequest('GET', '/health'), { status: 'ok', demo: true });
});

test('TC-DEMO-02: GET /tasks 는 샘플 8건, /brief/today 는 오늘 브리핑', async () => {
  const { tasks } = await demoRequest('GET', '/tasks');
  assert.equal(tasks.length, 8);
  const { brief } = await demoRequest('GET', '/brief/today');
  assert.ok(brief && brief.content.includes('오늘의 우선순위'));
});

test('TC-DEMO-03: ?project_id 필터 — 정수/none/잘못된 값', async () => {
  const p1 = (await demoRequest('GET', '/tasks?project_id=1')).tasks;
  assert.ok(p1.length > 0 && p1.every((t) => t.project_id === 1));
  const none = (await demoRequest('GET', '/tasks?project_id=none')).tasks;
  assert.ok(none.every((t) => t.project_id == null));
  await assert.rejects(() => demoRequest('GET', '/tasks?project_id=abc'), /project_id/);
});

test('TC-DEMO-04: POST /tasks 로 추가되고 목록에 반영, title 없으면 400', async () => {
  const before = (await demoRequest('GET', '/tasks')).tasks.length;
  const { task } = await demoRequest('POST', '/tasks', { title: '새 할일' });
  assert.equal(task.title, '새 할일');
  assert.equal((await demoRequest('GET', '/tasks')).tasks.length, before + 1);
  await assert.rejects(() => demoRequest('POST', '/tasks', {}), (e) => e.status === 400);
});

test('TC-DEMO-05: PUT/DELETE /tasks/:id', async () => {
  const { task } = await demoRequest('POST', '/tasks', { title: 'x' });
  const upd = await demoRequest('PUT', `/tasks/${task.id}`, { status: 'done' });
  assert.equal(upd.task.status, 'done');
  await demoRequest('DELETE', `/tasks/${task.id}`);
  assert.ok(!(await demoRequest('GET', '/tasks')).tasks.some((t) => t.id === task.id));
});

test('TC-DEMO-06: GET /calendar/events 정렬 + from/to 검증', async () => {
  const { events } = await demoRequest('GET', '/calendar/events');
  assert.equal(events.length, 6);
  // null start_time 은 맨 뒤
  assert.equal(events[events.length - 1].start_time, null);
  await assert.rejects(() => demoRequest('GET', '/calendar/events?from=nope'), /ISO8601/);
});

test('TC-DEMO-07: 매핑 없는 경로는 404', async () => {
  await assert.rejects(() => demoRequest('GET', '/unknown'), (e) => e.status === 404);
});
