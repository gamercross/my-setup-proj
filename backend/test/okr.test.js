// OKR API 테스트 (TC-OKR-01~12) — P8, FR-OKR-01~04

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createTestApp, loadService } = require('./helpers/testApp');

const ISO8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// objective 1개 + KR 여러 개를 만들어 반환한다.
async function seed(app, krs) {
  const o = await request(app)
    .post('/api/okr/objectives')
    .send({ title: '건강 회복', period: '2026-Q3' });
  const objId = o.body.objective.id;
  for (const kr of krs) {
    await request(app)
      .post('/api/okr/key-results')
      .send({ objective_id: objId, ...kr });
  }
  return objId;
}

describe('OKR API', () => {
  let app;
  beforeEach(() => {
    app = createTestApp();
  });

  it('TC-OKR-01: POST objectives 는 201·기본 status=active·타임스탬프', async () => {
    const res = await request(app)
      .post('/api/okr/objectives')
      .send({ title: '3분기 건강 회복', period: '2026-Q3' });
    assert.equal(res.status, 201);
    assert.ok(res.body.objective.id);
    assert.equal(res.body.objective.status, 'active');
    assert.match(res.body.objective.created_at, ISO8601);
    assert.match(res.body.objective.updated_at, ISO8601);
  });

  it('TC-OKR-02: title 빈값 → 400, period 형식 오류 → 400, status enum 오류 → 400', async () => {
    let res = await request(app).post('/api/okr/objectives').send({ title: '  ', period: '2026' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'title 은 필수입니다.');

    res = await request(app).post('/api/okr/objectives').send({ title: 'x', period: '26-Q1' });
    assert.equal(res.status, 400);

    res = await request(app)
      .post('/api/okr/objectives')
      .send({ title: 'x', period: '2026', status: 'paused' });
    assert.equal(res.status, 400);
  });

  it('TC-OKR-03: PUT objectives 는 보낸 필드만 병합, 없는 id 404', async () => {
    const c = await request(app).post('/api/okr/objectives').send({ title: 'a', period: '2026' });
    const id = c.body.objective.id;
    const res = await request(app).put(`/api/okr/objectives/${id}`).send({ status: 'done' });
    assert.equal(res.status, 200);
    assert.equal(res.body.objective.status, 'done');
    assert.equal(res.body.objective.title, 'a');

    const missing = await request(app).put('/api/okr/objectives/9999').send({ title: 'z' });
    assert.equal(missing.status, 404);
  });

  it('TC-OKR-04: DELETE objective 는 하위 KR·스냅샷을 CASCADE 삭제', async () => {
    const objId = await seed(app, [{ title: 'kr1', target: 10, current: 5 }]);
    const del = await request(app).delete(`/api/okr/objectives/${objId}`);
    assert.equal(del.status, 200);
    assert.deepEqual(del.body, { ok: true });

    const dash = await request(app).get('/api/okr');
    assert.equal(dash.body.objectives.length, 0);
    assert.equal(dash.body.summary.keyResultCount, 0);
  });

  it('TC-OKR-05: POST key-results 존재하는 objective 면 201·current 기본 0', async () => {
    const objId = await seed(app, []);
    const res = await request(app)
      .post('/api/okr/key-results')
      .send({ objective_id: objId, title: '주 3회 운동', target: 36 });
    assert.equal(res.status, 201);
    assert.equal(res.body.keyResult.current, 0);
    assert.equal(res.body.keyResult.unit, null);
  });

  it('TC-OKR-06: objective_id 미존재 → 400 (404 아님), target 음수 → 400', async () => {
    let res = await request(app)
      .post('/api/okr/key-results')
      .send({ objective_id: 9999, title: 'x', target: 1 });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, '목표(objective)를 찾을 수 없습니다.');

    const objId = await seed(app, []);
    res = await request(app)
      .post('/api/okr/key-results')
      .send({ objective_id: objId, title: 'x', target: -3 });
    assert.equal(res.status, 400);
  });

  it('TC-OKR-07: PUT key-results current 갱신 → 대시보드 pct 재계산, 없는 id 404', async () => {
    const objId = await seed(app, [{ title: 'kr', target: 10, current: 0 }]);
    const dash0 = await request(app).get('/api/okr');
    const krId = dash0.body.objectives[0].keyResults[0].id;

    const res = await request(app).put(`/api/okr/key-results/${krId}`).send({ current: 9 });
    assert.equal(res.status, 200);

    const dash = await request(app).get('/api/okr');
    assert.equal(dash.body.objectives[0].keyResults[0].pct, 0.9);
    assert.equal(dash.body.objectives[0].pct, 0.9);

    const missing = await request(app).put('/api/okr/key-results/9999').send({ current: 1 });
    assert.equal(missing.status, 404);
  });

  it('TC-OKR-08: GET /api/okr 구조 + summary.bucket 경계(0.9/0.4) + pct 3자리', async () => {
    // pct: 1.0(high) / 0.5(mid) / 0.1(low) / target 0 → 0(low)
    await seed(app, [
      { title: 'a', target: 10, current: 10 },
      { title: 'b', target: 10, current: 5 },
      { title: 'c', target: 10, current: 1 },
      { title: 'd', target: 0, current: 5 },
    ]);
    const res = await request(app).get('/api/okr');
    assert.equal(res.status, 200);
    const o = res.body.objectives[0];
    assert.deepEqual(Object.keys(o).sort(), ['id', 'keyResults', 'pct', 'period', 'status', 'title'].sort());
    assert.deepEqual(res.body.summary.bucket, { high: 1, mid: 1, low: 2 });
    assert.equal(res.body.summary.objectiveCount, 1);
    assert.equal(res.body.summary.keyResultCount, 4);
    // krAvgPct = (1 + 0.5 + 0.1 + 0) / 4 = 0.4
    assert.equal(res.body.summary.krAvgPct, 0.4);
    // pct 는 소수 셋째 자리
    const kr = res.body.objectives[0].keyResults.find((k) => k.title === 'c');
    assert.equal(kr.pct, 0.1);
  });

  it('TC-OKR-09: archived 목표는 기본 제외, includeArchived=1 이면 포함', async () => {
    const c = await request(app).post('/api/okr/objectives').send({ title: 'old', period: '2025' });
    await request(app).put(`/api/okr/objectives/${c.body.objective.id}`).send({ status: 'archived' });

    const def = await request(app).get('/api/okr');
    assert.equal(def.body.objectives.length, 0);

    const inc = await request(app).get('/api/okr?includeArchived=1');
    assert.equal(inc.body.objectives.length, 1);
  });

  it('TC-OKR-10: objective·KR 0건이면 200 + 빈 summary', async () => {
    const res = await request(app).get('/api/okr');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      objectives: [],
      summary: { krAvgPct: 0, objectiveCount: 0, keyResultCount: 0, bucket: { high: 0, mid: 0, low: 0 } },
    });
  });

  it('TC-OKR-11a: GET /api/okr/trend — 스냅샷 0건이면 { points: [] }', async () => {
    const empty = await request(app).get('/api/okr/trend');
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.body, { points: [] });
  });

  it('TC-OKR-11b: GET /api/okr/trend — 진입 시 이번 달 스냅샷을 적재한다', async () => {
    // seed 를 먼저 한 뒤 첫 trend 호출 (프로세스당 하루 1회 가드).
    await seed(app, [{ title: 'kr', target: 10, current: 5 }]);
    const res = await request(app).get('/api/okr/trend');
    assert.equal(res.status, 200);
    assert.equal(res.body.points.length, 1);
    assert.match(res.body.points[0].month, /^\d{4}-\d{2}$/);
    assert.equal(res.body.points[0].krAvgPct, 0.5);
  });

  it('TC-OKR-12: snapshotCurrentMonth 는 멱등 (같은 달 재실행은 덮어쓰기)', async () => {
    const okr = loadService('okr');
    okr.createObjective({ title: 'o', period: '2026' });
    // objective_id=1 로 KR 생성
    okr.createKeyResult({ objective_id: 1, title: 'kr', target: 10, current: 2 });

    const now = new Date(2026, 5, 15); // 6월
    const r1 = okr.snapshotCurrentMonth(now);
    assert.equal(r1.skipped, false);
    assert.equal(r1.count, 1);

    // 같은 날 재실행 → 프로세스 가드로 skip
    const r2 = okr.snapshotCurrentMonth(now);
    assert.equal(r2.skipped, true);

    const trend = okr.getTrend();
    const june = trend.points.filter((p) => p.month === '2026-06');
    assert.equal(june.length, 1);
    assert.equal(june[0].krAvgPct, 0.2);
  });

  it('TC-OKR-13: (FR-OKR-02 AC-6) 프로젝트 삭제 시 연결된 KR 은 생존하고 project_id 는 null 이 된다', async () => {
    const proj = await request(app).post('/api/projects').send({ name: 'p' });
    const projectId = proj.body.project.id;

    const objId = await seed(app, []);
    const kr = await request(app)
      .post('/api/okr/key-results')
      .send({ objective_id: objId, title: 'kr', target: 10, current: 3, project_id: projectId });
    assert.equal(kr.status, 201);
    assert.equal(kr.body.keyResult.project_id, projectId);

    const del = await request(app).delete(`/api/projects/${projectId}`);
    assert.equal(del.status, 200);

    // KR 은 그대로 남고 project_id 만 끊긴다 (SET NULL).
    const dash = await request(app).get('/api/okr');
    assert.equal(dash.body.objectives[0].keyResults.length, 1);
    assert.equal(dash.body.objectives[0].keyResults[0].project_id, null);
  });

  it('TC-OKR-14: (FR-OKR-02 AC-4) current > target 저장을 허용하고 pct 는 1 로 클램프된다', async () => {
    const objId = await seed(app, []);

    // 생성 시 current > target 이어도 201
    const create = await request(app)
      .post('/api/okr/key-results')
      .send({ objective_id: objId, title: 'kr', target: 10, current: 15 });
    assert.equal(create.status, 201);
    const krId = create.body.keyResult.id;

    // 수정으로 더 키워도 200
    const update = await request(app).put(`/api/okr/key-results/${krId}`).send({ current: 999 });
    assert.equal(update.status, 200);

    const dash = await request(app).get('/api/okr');
    const kr = dash.body.objectives[0].keyResults.find((k) => k.id === krId);
    assert.equal(kr.current, 999);
    assert.equal(kr.pct, 1);
  });
});
