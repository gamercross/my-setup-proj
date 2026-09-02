// 할일 API 테스트 (TC-TASK-01,02,04,05,06,07,08,09,10)

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');

// ISO8601 (Date.toISOString 형식) 매칭
const ISO8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('할일 API', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  it('TC-TASK-01: POST /api/tasks 는 기본값과 함께 201 로 생성한다', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'a' });
    assert.equal(res.status, 201);
    assert.ok(res.body.task.id);
    assert.equal(res.body.task.priority, 'medium');
    assert.equal(res.body.task.status, 'todo');
    assert.equal(res.body.task.description, '');
    assert.equal(res.body.task.due_date, null);
    assert.match(res.body.task.created_at, ISO8601);
  });

  it('TC-TASK-02: title 없으면 400, 목록은 비어 있다', async () => {
    const res = await request(app).post('/api/tasks').send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'title 은 필수입니다.');

    const list = await request(app).get('/api/tasks');
    assert.equal(list.body.tasks.length, 0);
  });

  it('TC-TASK-04: 2건 생성 후 목록은 생성 순서를 유지한다', async () => {
    await request(app).post('/api/tasks').send({ title: '첫번째' });
    await request(app).post('/api/tasks').send({ title: '두번째' });

    const res = await request(app).get('/api/tasks');
    assert.equal(res.status, 200);
    assert.equal(res.body.tasks.length, 2);
    assert.equal(res.body.tasks[0].title, '첫번째');
    assert.equal(res.body.tasks[1].title, '두번째');
  });

  it('TC-TASK-05: 빈 상태 목록은 { tasks: [] }', async () => {
    const res = await request(app).get('/api/tasks');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { tasks: [] });
  });

  it('TC-TASK-06: PUT 으로 status 를 done 으로 바꾼다', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'a' });
    const id = created.body.task.id;
    await new Promise((r) => setTimeout(r, 10));

    const res = await request(app).put(`/api/tasks/${id}`).send({ status: 'done' });
    assert.equal(res.status, 200);
    assert.equal(res.body.task.status, 'done');
    assert.ok(Date.parse(res.body.task.updated_at) >= Date.parse(res.body.task.created_at));
  });

  it('TC-TASK-07: title 만 수정해도 다른 필드/ID 는 유지된다', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .send({ title: 'a', priority: 'high' });
    const id = created.body.task.id;

    const res = await request(app).put(`/api/tasks/${id}`).send({ title: 'b' });
    assert.equal(res.status, 200);
    assert.equal(res.body.task.title, 'b');
    assert.equal(res.body.task.priority, 'high');
    assert.equal(res.body.task.id, id);
  });

  it('TC-TASK-08: 없는 할일 PUT 은 404', async () => {
    const res = await request(app).put('/api/tasks/99999').send({ title: 'x' });
    assert.equal(res.status, 404);
    assert.equal(res.body.error, '할일을 찾을 수 없습니다.');
  });

  it('TC-TASK-09: DELETE 후 목록에서 사라진다', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'a' });
    const id = created.body.task.id;

    const del = await request(app).delete(`/api/tasks/${id}`);
    assert.equal(del.status, 200);
    assert.deepEqual(del.body, { ok: true });

    const list = await request(app).get('/api/tasks');
    assert.ok(!list.body.tasks.some((t) => t.id === id));
  });

  it('TC-TASK-10: 없는 할일 DELETE 은 404', async () => {
    const res = await request(app).delete('/api/tasks/99999');
    assert.equal(res.status, 404);
  });
});
