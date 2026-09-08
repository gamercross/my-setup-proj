// 할일(tasks) 서비스 계층 (C2) — HTTP 를 모른다. req/res 참조 금지.
// 검증 실패는 ValidationError(400), 리소스 없음은 NotFoundError(404) 로 던진다.
// SQLite CHECK/FK 예외는 삼키지 않고 그대로 전파한다 (라우트가 isValidationError 로 400).

const db = require('../db');
const { ValidationError, NotFoundError } = require('../errors');

// project_id 입력값을 검증한다 (ADR-0012).
// - undefined: 미지정(통과)   - null: 연결 해제(통과)
// - 존재하는 프로젝트 정수: 통과   - 그 외: ValidationError
function assertProjectId(value) {
  if (value === undefined || value === null) return;
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ValidationError('project_id 는 프로젝트 id(정수) 또는 null 이어야 합니다.');
  }
  if (!db.getProject(value)) {
    throw new ValidationError('연결할 프로젝트를 찾을 수 없습니다.');
  }
}

// 할일 목록 조회 (생성 순서). filter.projectId (FR-TASK-06):
// - undefined: 전체   - 정수: 그 프로젝트   - null: 단독 할일(project_id 없음)
// 존재하지 않는 프로젝트 id 는 빈 목록으로 돌려준다 (404 아님 — 필터는 조회 편의).
function listTasks(filter = {}) {
  return db.getTasks(filter);
}

// 할일 단건 조회 (없으면 undefined — 라우트가 404 처리)
function getTask(id) {
  return db.getTask(id);
}

// 할일 생성
function createTask(input) {
  if (!input || !input.title) {
    throw new ValidationError('title 은 필수입니다.');
  }
  if ('project_id' in input) {
    assertProjectId(input.project_id);
  }
  return db.addTask(input);
}

// 할일 수정 — 존재 확인(404) → project_id 검증(400) 순서 유지.
// patch 는 그대로 db 에 전달한다 (null=연결 해제 vs 미지정 구분).
function updateTask(id, patch) {
  if (!db.getTask(id)) {
    throw new NotFoundError('할일을 찾을 수 없습니다.');
  }
  if (patch && 'project_id' in patch) {
    assertProjectId(patch.project_id);
  }
  const task = db.updateTask(id, patch || {});
  if (!task) {
    throw new NotFoundError('할일을 찾을 수 없습니다.');
  }
  return task;
}

// 할일 삭제 (성공 시 반환값 없음, 없으면 404)
function deleteTask(id) {
  if (!db.deleteTask(id)) {
    throw new NotFoundError('할일을 찾을 수 없습니다.');
  }
}

// ── 태그(task_tags) — T2 자동 분류 (FR-TASK-08) ──────────

// 태그 문자열 정규화. 트림 후 1~20자가 아니거나 개행·콤마가 있으면 ValidationError.
// 소문자화는 하지 않는다 (한글·대소문자 원형 유지).
function normalizeTag(raw) {
  const tag = String(raw ?? '').trim();
  if (tag.length < 1 || tag.length > 20 || /[\n\r,]/.test(tag)) {
    throw new ValidationError('태그는 1~20자여야 합니다.');
  }
  return tag;
}

// 태그 추가 — 존재 확인(404) → 정규화(400) → 저장. 멱등(이미 있으면 그대로).
function addTag(id, tag) {
  if (!db.getTask(id)) {
    throw new NotFoundError('할일을 찾을 수 없습니다.');
  }
  const clean = normalizeTag(tag);
  db.addTaskTag(id, clean);
  return db.getTask(id);
}

// 태그 삭제 — 존재 확인(404) → 삭제. 없던 태그도 성공으로 본다(멱등).
function removeTag(id, tag) {
  if (!db.getTask(id)) {
    throw new NotFoundError('할일을 찾을 수 없습니다.');
  }
  db.removeTaskTag(id, String(tag ?? ''));
  return db.getTask(id);
}

module.exports = {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  assertProjectId,
  normalizeTag,
  addTag,
  removeTag,
};
