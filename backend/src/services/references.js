// 레퍼런스 자료 서비스 계층 (개인 OS P12 — ADR-0037). HTTP 를 모른다.
// 검증 실패는 ValidationError(400), 리소스 없음은 NotFoundError(404).
// 요약 진행도(%) 같은 파생값은 서버가 계산·저장하지 않는다 (ADR-0035 선례, DotProgress 는 프런트 전용).

const db = require('../db');
const { ValidationError, NotFoundError } = require('../errors');
const { assertProjectId } = require('./tasks');

const REFERENCE_STATUSES = ['todo', 'reading', 'summarizing', 'done'];
const DUE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 자유 텍스트 정규화. 트림 후 '' → null, max 초과 시 400.
function normalizeText(raw, { max, message }) {
  if (raw === undefined || raw === null) return null;
  const text = String(raw).trim();
  if (text.length === 0) return null;
  if (text.length > max) throw new ValidationError(message);
  return text;
}

// title: 필수, 트림 후 1~200자.
function normalizeTitle(raw) {
  const title = String(raw ?? '').trim();
  if (title.length === 0) throw new ValidationError('title 은 필수입니다.');
  if (title.length > 200) throw new ValidationError('title 은 200자 이하여야 합니다.');
  return title;
}

// due_date: 선택, 트림 후 '' → null, 'YYYY-MM-DD' 형식만 허용 (마감 정렬이 계약의 일부 — ADR-0037).
function normalizeDueDate(raw) {
  if (raw === undefined || raw === null) return null;
  const text = String(raw).trim();
  if (text.length === 0) return null;
  if (!DUE_DATE_RE.test(text)) {
    throw new ValidationError('due_date 는 YYYY-MM-DD 형식이어야 합니다.');
  }
  return text;
}

// status: 기본 todo, 4값 밖이면 400.
function assertStatus(raw) {
  if (raw === undefined) return 'todo';
  if (!REFERENCE_STATUSES.includes(raw)) {
    throw new ValidationError('status 는 todo·reading·summarizing·done 중 하나여야 합니다.');
  }
  return raw;
}

// GET /api/references — filter: { category, status, projectId, limit }.
function listReferences(filter = {}) {
  return db.getReferences(filter);
}

// 레퍼런스 생성.
function createReference(input) {
  const body = input || {};
  const row = {
    title: normalizeTitle(body.title),
    category: normalizeText(body.category, { max: 40, message: '카테고리는 40자 이하여야 합니다.' }),
    location: normalizeText(body.location, { max: 500, message: '자료 위치는 500자 이하여야 합니다.' }),
    due_date: normalizeDueDate(body.due_date),
    status: assertStatus(body.status),
  };
  if ('project_id' in body) assertProjectId(body.project_id);
  row.project_id = body.project_id ?? null;

  return db.addReference(row);
}

// 레퍼런스 수정 — 존재 확인(404) → 검증(400) → 병합.
function updateReference(id, patch) {
  const existing = db.getReference(id);
  if (!existing) throw new NotFoundError('레퍼런스를 찾을 수 없습니다.');

  const body = patch || {};
  const next = {};
  if (body.title !== undefined) next.title = normalizeTitle(body.title);
  if (body.category !== undefined) {
    next.category = normalizeText(body.category, { max: 40, message: '카테고리는 40자 이하여야 합니다.' });
  }
  if (body.location !== undefined) {
    next.location = normalizeText(body.location, { max: 500, message: '자료 위치는 500자 이하여야 합니다.' });
  }
  if (body.due_date !== undefined) next.due_date = normalizeDueDate(body.due_date);
  if (body.status !== undefined) next.status = assertStatus(body.status);
  if ('project_id' in body) {
    assertProjectId(body.project_id);
    next.project_id = body.project_id;
  }

  return db.updateReference(id, next);
}

function deleteReference(id) {
  if (!db.deleteReference(id)) throw new NotFoundError('레퍼런스를 찾을 수 없습니다.');
}

// note: 필수, 트림 후 1~2000자.
function normalizeStepNote(raw) {
  const note = String(raw ?? '').trim();
  if (note.length === 0) throw new ValidationError('요약 단계 내용을 입력해 주세요.');
  if (note.length > 2000) throw new ValidationError('요약 단계는 2000자 이하여야 합니다.');
  return note;
}

// 요약 단계 추가 — 존재 확인(404) → 검증(400) → 저장. 갱신된 부모 행 반환.
function addStep(id, note) {
  if (!db.getReference(id)) throw new NotFoundError('레퍼런스를 찾을 수 없습니다.');
  const clean = normalizeStepNote(note);
  return db.addReferenceStep(id, clean);
}

// 요약 단계 삭제 — 레퍼런스 존재(404) → 단계 존재(404) → 삭제. 갱신된 부모 행 반환.
function removeStep(id, stepId) {
  const reference = db.getReference(id);
  if (!reference) throw new NotFoundError('레퍼런스를 찾을 수 없습니다.');
  const nStepId = Number(stepId);
  const found = reference.steps.some((s) => s.id === nStepId);
  if (!found) throw new NotFoundError('요약 단계를 찾을 수 없습니다.');
  return db.removeReferenceStep(id, stepId);
}

module.exports = {
  REFERENCE_STATUSES,
  listReferences,
  createReference,
  updateReference,
  deleteReference,
  addStep,
  removeStep,
};
