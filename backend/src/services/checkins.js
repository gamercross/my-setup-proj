// 기대정렬 체크인 서비스 계층 (개인 OS P10 — ADR-0035). HTTP 를 모른다.
// 검증 실패는 ValidationError(400), 리소스 없음은 NotFoundError(404).
// 7개 질문(what~status)은 전부 자유 서술 TEXT — 최소 1개는 채워야 한다.

const db = require('../db');
const { ValidationError, NotFoundError } = require('../errors');
const { assertProjectId } = require('./tasks');

const ANSWER_FIELDS = ['what', 'why', 'until', 'goal', 'strategy', 'action', 'status'];

// 자유 서술 텍스트 정규화. 트림 후 '' → null, max 초과 시 400.
function normalizeText(raw, { max }) {
  if (raw === undefined || raw === null) return null;
  const text = String(raw).trim();
  if (text.length === 0) return null;
  if (text.length > max) throw new ValidationError('답변은 2000자 이하여야 합니다.');
  return text;
}

// period: 선택, 트림 후 '' → null, 40자 이하.
function normalizePeriod(raw) {
  if (raw === undefined || raw === null) return null;
  const period = String(raw).trim();
  if (period.length === 0) return null;
  if (period.length > 40) throw new ValidationError('period 는 40자 이하여야 합니다.');
  return period;
}

// objective_id 입력값을 검증한다 (assertProjectId 와 동일한 관례).
// - undefined: 미지정(통과)   - null: 연결 해제(통과)
// - 존재하는 objective 정수: 통과   - 그 외: ValidationError
function assertObjectiveId(value) {
  if (value === undefined || value === null) return;
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ValidationError('연결할 목표를 찾을 수 없습니다.');
  }
  if (!db.getObjective(value)) {
    throw new ValidationError('연결할 목표를 찾을 수 없습니다.');
  }
}

// 7개 답변이 병합 결과 기준으로 전부 비었는지 확인한다.
function assertAtLeastOneAnswer(row) {
  const hasAny = ANSWER_FIELDS.some((key) => row[key] !== null && row[key] !== undefined);
  if (!hasAny) {
    throw new ValidationError('최소 한 개 질문에는 답해야 합니다.');
  }
}

// GET /api/checkins — 최신순 목록. filter: { projectId, objectiveId, limit }.
function listCheckins(filter = {}) {
  return db.getCheckins(filter);
}

function getCheckin(id) {
  return db.getCheckin(id);
}

// 체크인 생성 — 7개 답변 정규화 → 최소 1개 확인 → project/objective 검증.
function createCheckin(input) {
  const body = input || {};
  const row = { period: normalizePeriod(body.period) };
  for (const key of ANSWER_FIELDS) {
    row[key] = normalizeText(body[key], { max: 2000 });
  }
  assertAtLeastOneAnswer(row);

  if ('project_id' in body) assertProjectId(body.project_id);
  if ('objective_id' in body) assertObjectiveId(body.objective_id);
  row.project_id = body.project_id ?? null;
  row.objective_id = body.objective_id ?? null;

  return db.addCheckin(row);
}

// 체크인 수정 — 보낸 필드만 병합, 병합 결과가 전부 비면 400.
function updateCheckin(id, patch) {
  const existing = db.getCheckin(id);
  if (!existing) throw new NotFoundError('체크인을 찾을 수 없습니다.');

  const body = patch || {};
  const next = {};
  if (body.period !== undefined) next.period = normalizePeriod(body.period);
  for (const key of ANSWER_FIELDS) {
    if (body[key] !== undefined) next[key] = normalizeText(body[key], { max: 2000 });
  }
  if ('project_id' in body) {
    assertProjectId(body.project_id);
    next.project_id = body.project_id;
  }
  if ('objective_id' in body) {
    assertObjectiveId(body.objective_id);
    next.objective_id = body.objective_id;
  }

  const merged = { ...existing, ...next };
  assertAtLeastOneAnswer(merged);

  return db.updateCheckin(id, next);
}

function deleteCheckin(id) {
  if (!db.deleteCheckin(id)) throw new NotFoundError('체크인을 찾을 수 없습니다.');
}

module.exports = {
  ANSWER_FIELDS,
  normalizeText,
  normalizePeriod,
  assertObjectiveId,
  listCheckins,
  getCheckin,
  createCheckin,
  updateCheckin,
  deleteCheckin,
};
