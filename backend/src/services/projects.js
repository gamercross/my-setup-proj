// 프로젝트(projects) 서비스 계층 (C2) — HTTP 를 모른다. req/res 참조 금지.
// 검증 실패는 ValidationError(400), 리소스 없음은 NotFoundError(404) 로 던진다.

const db = require('../db');
const { ValidationError, NotFoundError } = require('../errors');

// 진행도 값 검증 (0~100)
function assertProgress(v) {
  if (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 100) {
    throw new ValidationError('progress 는 0~100 사이 숫자여야 합니다.');
  }
}

// 프로젝트 목록 조회 (생성 순서)
function listProjects() {
  return db.getProjects();
}

// 프로젝트 단건 조회 (없으면 undefined — 라우트가 404 처리)
function getProject(id) {
  return db.getProject(id);
}

// 프로젝트 생성
function createProject(input) {
  if (!input || !input.name) {
    throw new ValidationError('name 은 필수입니다.');
  }
  if (input.progress !== undefined) {
    assertProgress(input.progress);
  }
  return db.addProject(input);
}

// 프로젝트 수정 — 존재 확인(404) → progress 검증(400) 순서 유지.
function updateProject(id, patch) {
  if (!db.getProject(id)) {
    throw new NotFoundError('프로젝트를 찾을 수 없습니다.');
  }
  if (patch && patch.progress !== undefined) {
    assertProgress(patch.progress);
  }
  const project = db.updateProject(id, patch || {});
  if (!project) {
    throw new NotFoundError('프로젝트를 찾을 수 없습니다.');
  }
  return project;
}

// 프로젝트 삭제 (성공 시 반환값 없음, 없으면 404)
function deleteProject(id) {
  if (!db.deleteProject(id)) {
    throw new NotFoundError('프로젝트를 찾을 수 없습니다.');
  }
}

module.exports = { listProjects, getProject, createProject, updateProject, deleteProject };
