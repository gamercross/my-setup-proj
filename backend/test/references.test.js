// 레퍼런스 자료 API 테스트 (TC-REF-01~12) — 개인 OS P12, ADR-0037

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');

const ISO8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('레퍼런스 자료 API', () => {
  let app;
  beforeEach(() => {
    app = createTestApp();
  });

  it('TC-REF-01: POST 정상 — 201·필드 왕복·status 기본 todo·steps 빈 배열', async () => {
    const res = await request(app).post('/api/references').send({ title: '강의자료 3주차' });
    assert.equal(res.status, 201);
    const r = res.body.reference;
    assert.equal(r.title, '강의자료 3주차');
    assert.equal(r.category, null);
    assert.equal(r.location, null);
    assert.equal(r.due_date, null);
    assert.equal(r.status, 'todo');
    assert.equal(r.project_id, null);
    assert.deepEqual(r.steps, []);
    assert.match(r.created_at, ISO8601);
    assert.match(r.updated_at, ISO8601);
    assert.deepEqual(
      Object.keys(r).sort(),
      ['id', 'title', 'category', 'location', 'due_date', 'status', 'project_id', 'created_at', 'updated_at', 'steps'].sort()
    );
  });

  it('TC-REF-02: title 누락/공백/초과 → 400', async () => {
    const empty = await request(app).post('/api/references').send({});
    assert.equal(empty.status, 400);
    assert.equal(empty.body.detail, 'title 은 필수입니다.');
    assert.equal(empty.body.type, 'validation_error');

    const blank = await request(app).post('/api/references').send({ title: '   ' });
    assert.equal(blank.status, 400);
    assert.equal(blank.body.detail, 'title 은 필수입니다.');
    assert.equal(blank.body.type, 'validation_error');

    const tooLong = await request(app).post('/api/references').send({ title: 'a'.repeat(201) });
    assert.equal(tooLong.status, 400);
    assert.equal(tooLong.body.detail, 'title 은 200자 이하여야 합니다.');
    assert.equal(tooLong.body.type, 'validation_error');
  });

  it('TC-REF-03: due_date 형식 오류 → 400, 올바른 형식 → 201', async () => {
    const bad = await request(app)
      .post('/api/references')
      .send({ title: 'x', due_date: '2026/09/20' });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.detail, 'due_date 는 YYYY-MM-DD 형식이어야 합니다.');
    assert.equal(bad.body.type, 'validation_error');

    const ok = await request(app).post('/api/references').send({ title: 'x', due_date: '2026-09-20' });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.reference.due_date, '2026-09-20');
  });

  it('TC-REF-04: status 잘못된 값 → 400', async () => {
    const res = await request(app).post('/api/references').send({ title: 'x', status: 'archived' });
    assert.equal(res.status, 400);
    assert.equal(res.body.detail, 'status 는 todo·reading·summarizing·done 중 하나여야 합니다.');
    assert.equal(res.body.type, 'validation_error');
  });

  it('TC-REF-05: 없는 project_id → 400', async () => {
    const res = await request(app).post('/api/references').send({ title: 'x', project_id: 9999 });
    assert.equal(res.status, 400);
    assert.equal(res.body.detail, '연결할 프로젝트를 찾을 수 없습니다.');
    assert.equal(res.body.type, 'validation_error');
  });

  it('TC-REF-06: GET 목록 — due_date 오름차순(NULL 맨 뒤)·필터·limit', async () => {
    await request(app).post('/api/references').send({ title: '마감없음' });
    await request(app).post('/api/references').send({ title: '늦은마감', due_date: '2026-12-01', category: '강의' });
    await request(app).post('/api/references').send({ title: '이른마감', due_date: '2026-09-20', category: '개발 문서', status: 'reading' });

    const res = await request(app).get('/api/references');
    assert.equal(res.status, 200);
    assert.equal(res.body.references.length, 3);
    assert.equal(res.body.references[0].title, '이른마감');
    assert.equal(res.body.references[1].title, '늦은마감');
    assert.equal(res.body.references[2].title, '마감없음');

    const byCategory = await request(app).get('/api/references?category=강의');
    assert.equal(byCategory.body.references.length, 1);
    assert.equal(byCategory.body.references[0].title, '늦은마감');

    const byStatus = await request(app).get('/api/references?status=reading');
    assert.equal(byStatus.body.references.length, 1);
    assert.equal(byStatus.body.references[0].title, '이른마감');

    const limited = await request(app).get('/api/references?limit=2');
    assert.equal(limited.body.references.length, 2);
  });

  it('TC-REF-07: GET project_id 필터 — none/id/잘못된 값', async () => {
    const proj = await request(app).post('/api/projects').send({ name: 'p' });
    const projectId = proj.body.project.id;
    await request(app).post('/api/references').send({ title: 'with project', project_id: projectId });
    await request(app).post('/api/references').send({ title: 'no project' });

    const byProject = await request(app).get(`/api/references?project_id=${projectId}`);
    assert.equal(byProject.body.references.length, 1);
    assert.equal(byProject.body.references[0].title, 'with project');

    const none = await request(app).get('/api/references?project_id=none');
    assert.equal(none.body.references.length, 1);
    assert.equal(none.body.references[0].title, 'no project');

    const bad = await request(app).get('/api/references?project_id=abc');
    assert.equal(bad.status, 400);
    assert.equal(bad.body.detail, 'project_id 는 양의 정수이거나 "none" 이어야 합니다.');
    assert.equal(bad.body.type, 'validation_error');
  });

  it('TC-REF-08: PUT 부분수정 — 보낸 필드만 병합·없는 id 404', async () => {
    const created = await request(app).post('/api/references').send({ title: '원래 제목', category: '강의' });
    const id = created.body.reference.id;

    const res = await request(app).put(`/api/references/${id}`).send({ title: '수정된 제목' });
    assert.equal(res.status, 200);
    assert.equal(res.body.reference.title, '수정된 제목');
    assert.equal(res.body.reference.category, '강의');

    const missing = await request(app).put('/api/references/9999').send({ title: 'x' });
    assert.equal(missing.status, 404);
    assert.equal(missing.body.detail, '레퍼런스를 찾을 수 없습니다.');
    assert.equal(missing.body.type, 'not_found');
  });

  it('TC-REF-09: DELETE — 200 ok·재삭제 404·steps CASCADE', async () => {
    const created = await request(app).post('/api/references').send({ title: '삭제될 자료' });
    const id = created.body.reference.id;
    await request(app).post(`/api/references/${id}/steps`).send({ note: '훑기' });

    const res = await request(app).delete(`/api/references/${id}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });

    const again = await request(app).delete(`/api/references/${id}`);
    assert.equal(again.status, 404);
    assert.equal(again.body.detail, '레퍼런스를 찾을 수 없습니다.');
    assert.equal(again.body.type, 'not_found');
  });

  it('TC-REF-10: 요약 단계 추가 — 순서 증가·부모 행 전체 반환·없는 레퍼런스 404·빈 note 400', async () => {
    const created = await request(app).post('/api/references').send({ title: '자료' });
    const id = created.body.reference.id;

    const first = await request(app).post(`/api/references/${id}/steps`).send({ note: '훑기' });
    assert.equal(first.status, 201);
    assert.equal(first.body.reference.steps.length, 1);
    assert.equal(first.body.reference.steps[0].step_order, 1);
    assert.equal(first.body.reference.steps[0].note, '훑기');

    const second = await request(app).post(`/api/references/${id}/steps`).send({ note: '핵심개념 추출' });
    assert.equal(second.status, 201);
    assert.equal(second.body.reference.steps.length, 2);
    assert.equal(second.body.reference.steps[1].step_order, 2);

    const missingRef = await request(app).post('/api/references/9999/steps').send({ note: 'x' });
    assert.equal(missingRef.status, 404);
    assert.equal(missingRef.body.detail, '레퍼런스를 찾을 수 없습니다.');
    assert.equal(missingRef.body.type, 'not_found');

    const blank = await request(app).post(`/api/references/${id}/steps`).send({ note: '  ' });
    assert.equal(blank.status, 400);
    assert.equal(blank.body.detail, '요약 단계 내용을 입력해 주세요.');
    assert.equal(blank.body.type, 'validation_error');
  });

  it('TC-REF-11: 요약 단계 삭제 — step_order 재번호 안 함·없는 step 404', async () => {
    const created = await request(app).post('/api/references').send({ title: '자료' });
    const id = created.body.reference.id;
    await request(app).post(`/api/references/${id}/steps`).send({ note: '1단계' });
    const step2 = await request(app).post(`/api/references/${id}/steps`).send({ note: '2단계' });
    const step2Id = step2.body.reference.steps[1].id;

    const res = await request(app).delete(`/api/references/${id}/steps/${step2Id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.reference.steps.length, 1);
    assert.equal(res.body.reference.steps[0].note, '1단계');

    const step3 = await request(app).post(`/api/references/${id}/steps`).send({ note: '3단계' });
    // 다음 순서는 남은 행의 MAX(step_order)+1 로 계산한다 — 삭제된 2번이 재사용될 수 있다.
    // "재번호 안 함" 은 남은 행의 step_order 를 되돌려 채우지 않는다는 뜻일 뿐, 새 삽입값의 유일성은 보장하지 않는다.
    assert.equal(step3.body.reference.steps[1].step_order, 2);

    const missingStep = await request(app).delete(`/api/references/${id}/steps/9999`);
    assert.equal(missingStep.status, 404);
    assert.equal(missingStep.body.detail, '요약 단계를 찾을 수 없습니다.');
    assert.equal(missingStep.body.type, 'not_found');
  });

  it('TC-REF-12: 카테고리/위치 길이 초과 → 400', async () => {
    const badCategory = await request(app)
      .post('/api/references')
      .send({ title: 'x', category: 'a'.repeat(41) });
    assert.equal(badCategory.status, 400);
    assert.equal(badCategory.body.detail, '카테고리는 40자 이하여야 합니다.');
    assert.equal(badCategory.body.type, 'validation_error');

    const badLocation = await request(app)
      .post('/api/references')
      .send({ title: 'x', location: 'a'.repeat(501) });
    assert.equal(badLocation.status, 400);
    assert.equal(badLocation.body.detail, '자료 위치는 500자 이하여야 합니다.');
    assert.equal(badLocation.body.type, 'validation_error');
  });
});
