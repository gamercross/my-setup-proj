// 기대정렬 체크인 API 테스트 (TC-CHK-01~09) — 개인 OS P10, ADR-0035

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');

const ISO8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('기대정렬 체크인 API', () => {
  let app;
  beforeEach(() => {
    app = createTestApp();
  });

  it('TC-CHK-01: POST 정상 — 201·7필드 왕복·ISO8601·미지정 null', async () => {
    const res = await request(app)
      .post('/api/checkins')
      .send({ period: '1주차', what: '위젯 셸을 만들었다.', status: '동작은 한다.' });
    assert.equal(res.status, 201);
    const c = res.body.checkin;
    assert.equal(c.period, '1주차');
    assert.equal(c.what, '위젯 셸을 만들었다.');
    assert.equal(c.status, '동작은 한다.');
    for (const key of ['why', 'until', 'goal', 'strategy', 'action']) {
      assert.equal(c[key], null);
    }
    assert.equal(c.project_id, null);
    assert.equal(c.objective_id, null);
    assert.match(c.created_at, ISO8601);
    assert.match(c.updated_at, ISO8601);
    assert.deepEqual(
      Object.keys(c).sort(),
      [
        'id', 'period', 'what', 'why', 'until', 'goal', 'strategy', 'action', 'status',
        'project_id', 'objective_id', 'created_at', 'updated_at',
      ].sort()
    );
  });

  it('TC-CHK-02: 7필드 전부 공백 → 400, 미저장', async () => {
    const res = await request(app)
      .post('/api/checkins')
      .send({ period: '1주차', what: '  ', why: '', status: null });
    assert.equal(res.status, 400);
    assert.equal(res.body.detail, '최소 한 개 질문에는 답해야 합니다.');
    assert.equal(res.body.type, 'validation_error');

    const list = await request(app).get('/api/checkins');
    assert.equal(list.body.checkins.length, 0);
  });

  it('TC-CHK-03: period 미지정/공백 → 201·period null', async () => {
    const res = await request(app).post('/api/checkins').send({ what: '뭔가 했다.' });
    assert.equal(res.status, 201);
    assert.equal(res.body.checkin.period, null);

    const res2 = await request(app).post('/api/checkins').send({ period: '   ', what: '뭔가 했다.' });
    assert.equal(res2.status, 201);
    assert.equal(res2.body.checkin.period, null);
  });

  it('TC-CHK-04: 없는 project_id/objective_id → 각각 400', async () => {
    const badProject = await request(app)
      .post('/api/checkins')
      .send({ what: 'x', project_id: 9999 });
    assert.equal(badProject.status, 400);
    assert.equal(badProject.body.detail, '연결할 프로젝트를 찾을 수 없습니다.');
    assert.equal(badProject.body.type, 'validation_error');

    const badObjective = await request(app)
      .post('/api/checkins')
      .send({ what: 'x', objective_id: 9999 });
    assert.equal(badObjective.status, 400);
    assert.equal(badObjective.body.detail, '연결할 목표를 찾을 수 없습니다.');
    assert.equal(badObjective.body.type, 'validation_error');
  });

  it('TC-CHK-05: GET 목록 — 최신순·필드셋·limit', async () => {
    for (let i = 1; i <= 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app).post('/api/checkins').send({ what: `체크인 ${i}` });
    }
    const res = await request(app).get('/api/checkins');
    assert.equal(res.status, 200);
    assert.equal(res.body.checkins.length, 3);
    assert.equal(res.body.checkins[0].what, '체크인 3');
    assert.equal(res.body.checkins[2].what, '체크인 1');

    const limited = await request(app).get('/api/checkins?limit=2');
    assert.equal(limited.body.checkins.length, 2);
  });

  it('TC-CHK-06: GET 필터 — project_id/objective_id 필터, 잘못된 값 400', async () => {
    const proj = await request(app).post('/api/projects').send({ name: 'p' });
    const projectId = proj.body.project.id;
    const obj = await request(app).post('/api/okr/objectives').send({ title: 'o', period: '2026' });
    const objectiveId = obj.body.objective.id;

    await request(app).post('/api/checkins').send({ what: 'with project', project_id: projectId });
    await request(app).post('/api/checkins').send({ what: 'with objective', objective_id: objectiveId });
    await request(app).post('/api/checkins').send({ what: 'no links' });

    const byProject = await request(app).get(`/api/checkins?project_id=${projectId}`);
    assert.equal(byProject.body.checkins.length, 1);
    assert.equal(byProject.body.checkins[0].what, 'with project');

    const noneProject = await request(app).get('/api/checkins?project_id=none');
    assert.equal(noneProject.body.checkins.length, 2);

    const byObjective = await request(app).get(`/api/checkins?objective_id=${objectiveId}`);
    assert.equal(byObjective.body.checkins.length, 1);
    assert.equal(byObjective.body.checkins[0].what, 'with objective');

    const bad = await request(app).get('/api/checkins?project_id=abc');
    assert.equal(bad.status, 400);
    assert.equal(bad.body.detail, 'project_id 는 양의 정수이거나 "none" 이어야 합니다.');
    assert.equal(bad.body.type, 'validation_error');

    const badObj = await request(app).get('/api/checkins?objective_id=-1');
    assert.equal(badObj.status, 400);
    assert.equal(badObj.body.detail, 'objective_id 는 양의 정수이거나 "none" 이어야 합니다.');
    assert.equal(badObj.body.type, 'validation_error');
  });

  it('TC-CHK-07: PUT 부분수정 — 보낸 필드만 병합·updated_at 변경·없는 id 404', async () => {
    const created = await request(app).post('/api/checkins').send({ what: '원래 답변', why: '원래 이유' });
    const id = created.body.checkin.id;

    const res = await request(app).put(`/api/checkins/${id}`).send({ what: '수정된 답변' });
    assert.equal(res.status, 200);
    assert.equal(res.body.checkin.what, '수정된 답변');
    assert.equal(res.body.checkin.why, '원래 이유');
    assert.notEqual(res.body.checkin.updated_at, created.body.checkin.created_at);

    const missing = await request(app).put('/api/checkins/9999').send({ what: 'x' });
    assert.equal(missing.status, 404);
    assert.equal(missing.body.detail, '체크인을 찾을 수 없습니다.');
    assert.equal(missing.body.type, 'not_found');
  });

  it('TC-CHK-08: PUT으로 전부 지움 → 400·기존 행 불변', async () => {
    const created = await request(app).post('/api/checkins').send({ what: '유일한 답변' });
    const id = created.body.checkin.id;

    const res = await request(app).put(`/api/checkins/${id}`).send({ what: '' });
    assert.equal(res.status, 400);
    assert.equal(res.body.detail, '최소 한 개 질문에는 답해야 합니다.');
    assert.equal(res.body.type, 'validation_error');

    const check = await request(app).get('/api/checkins');
    assert.equal(check.body.checkins[0].what, '유일한 답변');
  });

  it('TC-CHK-09: DELETE — 200 ok·재삭제 404', async () => {
    const created = await request(app).post('/api/checkins').send({ what: '삭제될 답변' });
    const id = created.body.checkin.id;

    const res = await request(app).delete(`/api/checkins/${id}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });

    const again = await request(app).delete(`/api/checkins/${id}`);
    assert.equal(again.status, 404);
    assert.equal(again.body.detail, '체크인을 찾을 수 없습니다.');
    assert.equal(again.body.type, 'not_found');
  });
});
