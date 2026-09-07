// 서비스 계층 테스트 (TC-MAINT-01~05) — 앱 없이 services/* 직접 호출, :memory: 격리.
// 오류 타입은 name/status 로 판정한다 (테스트 격리로 모듈 인스턴스가 갈릴 수 있어 instanceof 대신).

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { loadService } = require('./helpers/testApp');

const isValidation = (err) => err && err.name === 'ValidationError' && err.status === 400;
const isNotFound = (err) => err && err.name === 'NotFoundError' && err.status === 404;

describe('서비스 계층 (C2)', () => {
  let tasks;
  let projects;

  beforeEach(() => {
    tasks = loadService('tasks');
    projects = loadService('projects');
  });

  it('TC-MAINT-01: tasks.createTask({}) 는 ValidationError(title 은 필수입니다.)', () => {
    assert.throws(
      () => tasks.createTask({}),
      (err) => isValidation(err) && err.message === 'title 은 필수입니다.'
    );
  });

  it('TC-MAINT-02: tasks.updateTask(9999, {project_id:1}) 는 NotFoundError (404 우선)', () => {
    assert.throws(() => tasks.updateTask(9999, { project_id: 1 }), isNotFound);
  });

  it('TC-MAINT-03: tasks.assertProjectId("1") 은 ValidationError', () => {
    assert.throws(
      () => tasks.assertProjectId('1'),
      (err) =>
        isValidation(err) &&
        err.message === 'project_id 는 프로젝트 id(정수) 또는 null 이어야 합니다.'
    );
  });

  it('TC-MAINT-04: projects.updateProject(id, {progress:200}) 는 ValidationError(progress 는 0~100 …)', () => {
    const created = projects.createProject({ name: 'p' });
    assert.throws(
      () => projects.updateProject(created.id, { progress: 200 }),
      (err) => isValidation(err) && err.message === 'progress 는 0~100 사이 숫자여야 합니다.'
    );
  });

  it("TC-MAINT-05: routes/tasks.js·projects.js 원문에 require('../db') 미포함 (fitness)", () => {
    const routesDir = path.resolve(__dirname, '../src/routes');
    for (const file of ['tasks.js', 'projects.js']) {
      const src = fs.readFileSync(path.join(routesDir, file), 'utf8');
      assert.ok(
        !/require\(\s*['"]\.\.\/db['"]\s*\)/.test(src),
        `${file} 은 db 를 직접 require 하면 안 된다 (routes → services → db)`
      );
    }
  });
});
