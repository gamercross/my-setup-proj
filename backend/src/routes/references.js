// 레퍼런스 자료 CRUD + 요약 단계 라우트 (모두 /api/references 하위) — 개인 OS P12, ADR-0037
// 얇은 계층: 입력을 서비스로 넘기고 결과를 직렬화한다. 도메인 규칙은 services/references.js.

const router = require('express').Router();
const referencesService = require('../services/references');
const { isValidationError, isNotFoundError, toClientMessage } = require('../errors');

// 서비스 오류 → 상태코드 (404 우선 → 400 → 500). routes/checkins.js 와 동일 패턴.
function handleError(err, res, { logPrefix, failMessage }) {
  if (isNotFoundError(err)) {
    return res.status(404).json({ error: err.message });
  }
  if (isValidationError(err)) {
    return res.status(400).json({ error: toClientMessage(err) });
  }
  console.error(logPrefix, err);
  res.status(500).json({ error: failMessage });
}

// project_id 쿼리 파라미터를 필터값으로 파싱한다. routes/checkins.js 의 parseIdFilter 와 동일.
function parseIdFilter(raw, label) {
  if (raw === undefined) return { ok: true, value: undefined };
  if (raw === 'none' || raw === 'null') return { ok: true, value: null };
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    return { ok: false, error: `${label} 는 양의 정수이거나 "none" 이어야 합니다.` };
  }
  return { ok: true, value: n };
}

// GET /api/references - 목록. ?category= · ?status= · ?project_id=<int|none> · ?limit=
router.get('/', (req, res) => {
  try {
    const filter = {};

    if (req.query.category !== undefined) filter.category = req.query.category;
    if (req.query.status !== undefined) filter.status = req.query.status;

    const project = parseIdFilter(req.query.project_id, 'project_id');
    if (!project.ok) return res.status(400).json({ error: project.error });
    if (project.value !== undefined) filter.projectId = project.value;

    if (req.query.limit !== undefined) {
      const lim = Number(req.query.limit);
      if (Number.isInteger(lim) && lim > 0) filter.limit = lim;
    }

    res.json({ references: referencesService.listReferences(filter) });
  } catch (err) {
    handleError(err, res, { logPrefix: '레퍼런스 조회 실패:', failMessage: '레퍼런스를 불러오지 못했습니다.' });
  }
});

// POST /api/references - 레퍼런스 생성
router.post('/', (req, res) => {
  try {
    const reference = referencesService.createReference(req.body || {});
    res.status(201).json({ reference });
  } catch (err) {
    handleError(err, res, { logPrefix: '레퍼런스 생성 실패:', failMessage: '레퍼런스를 생성하지 못했습니다.' });
  }
});

// POST /api/references/:id/steps - 요약 단계 추가 (steps 하위 경로는 :id 단일 라우트보다 먼저 등록)
router.post('/:id/steps', (req, res) => {
  try {
    const reference = referencesService.addStep(req.params.id, (req.body || {}).note);
    res.status(201).json({ reference });
  } catch (err) {
    handleError(err, res, { logPrefix: '요약 단계 추가 실패:', failMessage: '요약 단계를 추가하지 못했습니다.' });
  }
});

// DELETE /api/references/:id/steps/:stepId - 요약 단계 삭제
router.delete('/:id/steps/:stepId', (req, res) => {
  try {
    const reference = referencesService.removeStep(req.params.id, req.params.stepId);
    res.json({ reference });
  } catch (err) {
    handleError(err, res, { logPrefix: '요약 단계 삭제 실패:', failMessage: '요약 단계를 삭제하지 못했습니다.' });
  }
});

// PUT /api/references/:id - 레퍼런스 수정
router.put('/:id', (req, res) => {
  try {
    const reference = referencesService.updateReference(req.params.id, req.body || {});
    res.json({ reference });
  } catch (err) {
    handleError(err, res, { logPrefix: '레퍼런스 수정 실패:', failMessage: '레퍼런스를 수정하지 못했습니다.' });
  }
});

// DELETE /api/references/:id - 레퍼런스 삭제 (steps 는 CASCADE)
router.delete('/:id', (req, res) => {
  try {
    referencesService.deleteReference(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    handleError(err, res, { logPrefix: '레퍼런스 삭제 실패:', failMessage: '레퍼런스를 삭제하지 못했습니다.' });
  }
});

module.exports = router;
