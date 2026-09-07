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

  it('TC-PROJ-08: POST /api/tasks {title, project_id} 는 201 로 연결 생성', async () => {
    const proj = await request(app).post('/api/projects').send({ name: 'p' });
    const pid = proj.body.project.id;

    const res = await request(app).post('/api/tasks').send({ title: 'a', project_id: pid });
    assert.equal(res.status, 201);
    assert.equal(res.body.task.project_id, pid);
  });

  it('TC-PROJ-09: 없는 project_id 로 생성하면 400, 목록 불변', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'a', project_id: 99999 });
    assert.equal(res.status, 400);

    const list = await request(app).get('/api/tasks');
    assert.equal(list.body.tasks.length, 0);
  });

  it('TC-PROJ-09c: PUT {project_id: 9999} (없는 프로젝트) 는 400', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'a' });
    const id = created.body.task.id;
    const res = await request(app).put(`/api/tasks/${id}`).send({ project_id: 9999 });
    assert.equal(res.status, 400);
  });

  it('TC-PROJ-09d: PUT {project_id: "1"} (문자열) 는 400', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'a' });
    const id = created.body.task.id;
    const res = await request(app).put(`/api/tasks/${id}`).send({ project_id: '1' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'project_id 는 프로젝트 id(정수) 또는 null 이어야 합니다.');
  });

  it('TC-PROJ-09b: PUT {project_id: null} 은 200, 연결 해제', async () => {
    const proj = await request(app).post('/api/projects').send({ name: 'p' });
    const pid = proj.body.project.id;
    const created = await request(app).post('/api/tasks').send({ title: 'a', project_id: pid });
    const id = created.body.task.id;

    const res = await request(app).put(`/api/tasks/${id}`).send({ project_id: null });
    assert.equal(res.status, 200);
    assert.equal(res.body.task.project_id, null);
  });

  it('TC-DB-04a: 잘못된 priority 로 생성하면 500 이 아니라 400', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'a', priority: 'urgent' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, '입력값이 허용된 값 범위를 벗어났습니다.');
  });

  // FR-TASK-06 — GET /api/tasks?project_id=
  it('TC-TASK-12: ?project_id=<id> 는 그 프로젝트의 할일만 반환', async () => {
    const p1 = (await request(app).post('/api/projects').send({ name: 'p1' })).body.project.id;
    const p2 = (await request(app).post('/api/projects').send({ name: 'p2' })).body.project.id;
    await request(app).post('/api/tasks').send({ title: 'p1-a', project_id: p1 });
    await request(app).post('/api/tasks').send({ title: 'p1-b', project_id: p1 });
    await request(app).post('/api/tasks').send({ title: 'p2-a', project_id: p2 });
    await request(app).post('/api/tasks').send({ title: '단독' });

    const res = await request(app).get(`/api/tasks?project_id=${p1}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.tasks.map((t) => t.title), ['p1-a', 'p1-b']);
  });

  it('TC-TASK-12b: ?project_id=none 은 단독 할일(project_id NULL)만 반환', async () => {
    const p1 = (await request(app).post('/api/projects').send({ name: 'p1' })).body.project.id;
    await request(app).post('/api/tasks').send({ title: 'p1-a', project_id: p1 });
    await request(app).post('/api/tasks').send({ title: '단독1' });
    await request(app).post('/api/tasks').send({ title: '단독2' });

    const res = await request(app).get('/api/tasks?project_id=none');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.tasks.map((t) => t.title), ['단독1', '단독2']);
  });

  it('TC-TASK-12c: 없는 project_id 는 200 + 빈 목록, 잘못된 값은 400', async () => {
    const ok = await request(app).get('/api/tasks?project_id=99999');
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.body.tasks, []);

    for (const bad of ['abc', '0', '-3', '1.5']) {
      const res = await request(app).get(`/api/tasks?project_id=${bad}`);
      assert.equal(res.status, 400, `bad=${bad}`);
    }
  });
});
