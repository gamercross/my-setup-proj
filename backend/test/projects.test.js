// 프로젝트 API 테스트 (TC-PROJ-01~06)

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');

describe('프로젝트 API', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  it('TC-PROJ-01: POST /api/projects 는 기본값과 함께 201 로 생성한다', async () => {
    const res = await request(app).post('/api/projects').send({ name: 'p' });
    assert.equal(res.status, 201);
    assert.equal(res.body.project.progress, 0);
    assert.equal(res.body.project.status, 'active');
    assert.equal(res.body.project.notion_id, null);
  });

  it('TC-PROJ-02: progress 범위를 벗어나면 400', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ name: 'p', progress: 200 });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'progress 는 0~100 사이 숫자여야 합니다.');
  });

  it('TC-PROJ-03: name 없으면 400', async () => {
    const res = await request(app).post('/api/projects').send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'name 은 필수입니다.');
  });

  it('TC-PROJ-04: 없는 프로젝트 PUT 은 progress 값과 무관하게 404 우선', async () => {
    const res = await request(app)
      .put('/api/projects/99999')
      .send({ progress: 200 });
    assert.equal(res.status, 404);
    assert.equal(res.body.error, '프로젝트를 찾을 수 없습니다.');
  });

  it('TC-PROJ-05: PUT 으로 progress 를 갱신한다', async () => {
    const created = await request(app).post('/api/projects').send({ name: 'p' });
    const id = created.body.project.id;

    const res = await request(app).put(`/api/projects/${id}`).send({ progress: 50 });
    assert.equal(res.status, 200);
    assert.equal(res.body.project.progress, 50);
  });

  it('TC-PROJ-07: 빈 상태 목록은 200 { projects: [] }', async () => {
    const res = await request(app).get('/api/projects');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { projects: [] });
  });

  it('TC-PROJ-10: 프로젝트 삭제 시 연결된 할일은 유지되고 project_id 가 null 이 된다', async () => {
    const proj = await request(app).post('/api/projects').send({ name: 'p' });
    const pid = proj.body.project.id;
    const task = await request(app).post('/api/tasks').send({ title: 'a', project_id: pid });
    const tid = task.body.task.id;

    const del = await request(app).delete(`/api/projects/${pid}`);
    assert.equal(del.status, 200);

    const res = await request(app).get(`/api/tasks/${tid}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.task.project_id, null);
  });

  it('TC-PROJ-11: PUT /api/projects/:id {status: "done"} 는 200 으로 상태를 갱신한다', async () => {
    const created = await request(app).post('/api/projects').send({ name: 'p' });
    const id = created.body.project.id;

    const res = await request(app).put(`/api/projects/${id}`).send({ status: 'done' });
    assert.equal(res.status, 200);
    assert.equal(res.body.project.status, 'done');
  });

  it('TC-DB-04b: PUT /api/projects/:id {status: "hold"} 는 400 (허용 밖 값)', async () => {
    const created = await request(app).post('/api/projects').send({ name: 'p' });
    const id = created.body.project.id;

    const res = await request(app).put(`/api/projects/${id}`).send({ status: 'hold' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, '입력값이 허용된 값 범위를 벗어났습니다.');
  });

  it('TC-PROJ-06: DELETE 후 단건 조회는 404', async () => {
    const created = await request(app).post('/api/projects').send({ name: 'p' });
    const id = created.body.project.id;

    const del = await request(app).delete(`/api/projects/${id}`);
    assert.equal(del.status, 200);
    assert.deepEqual(del.body, { ok: true });

    const res = await request(app).get(`/api/projects/${id}`);
    assert.equal(res.status, 404);
  });
});
