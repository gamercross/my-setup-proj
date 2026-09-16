// 기대정렬 체크인 CRUD 라우트 (모두 /api/checkins 하위) — 개인 OS P10, ADR-0035
// 얇은 계층: 입력을 서비스로 넘기고 결과를 직렬화한다. 도메인 규칙은 services/checkins.js.

const router = require('express').Router();
const checkinsService = require('../services/checkins');
const { sendProblem, sendServiceError } = require('../problem');

// 쿼리 파라미터 하나(project_id 또는 objective_id)를 필터값으로 파싱한다.
// 미지정 → undefined, 'none'|'null' → null, 그 외 양의 정수 → 그 값, 아니면 오류 메시지 반환.
function parseIdFilter(raw, label) {
  if (raw === undefined) return { ok: true, value: undefined };
  if (raw === 'none' || raw === 'null') return { ok: true, value: null };
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    return { ok: false, error: `${label} 는 양의 정수이거나 "none" 이어야 합니다.` };
  }
  return { ok: true, value: n };
}

// GET /api/checkins - 목록 (최신순). ?project_id=<int|none> · ?objective_id=<int|none> · ?limit=<int>
router.get('/', (req, res) => {
  try {
    const filter = {};

    const project = parseIdFilter(req.query.project_id, 'project_id');
    if (!project.ok) {
      return sendProblem(res, 'validation_error', {
        detail: project.error,
        errors: [{ field: 'project_id', message: project.error }],
      });
    }
    if (project.value !== undefined) filter.projectId = project.value;

    const objective = parseIdFilter(req.query.objective_id, 'objective_id');
    if (!objective.ok) {
      return sendProblem(res, 'validation_error', {
        detail: objective.error,
        errors: [{ field: 'objective_id', message: objective.error }],
      });
    }
    if (objective.value !== undefined) filter.objectiveId = objective.value;

    if (req.query.limit !== undefined) {
      const lim = Number(req.query.limit);
      if (Number.isInteger(lim) && lim > 0) filter.limit = lim;
    }

    res.json({ checkins: checkinsService.listCheckins(filter) });
  } catch (err) {
    sendServiceError(err, res, { logPrefix: '체크인 조회 실패:', failMessage: '체크인을 불러오지 못했습니다.' });
  }
});

// POST /api/checkins - 체크인 생성
router.post('/', (req, res) => {
  try {
    const checkin = checkinsService.createCheckin(req.body || {});
    res.status(201).json({ checkin });
  } catch (err) {
    sendServiceError(err, res, { logPrefix: '체크인 생성 실패:', failMessage: '체크인을 생성하지 못했습니다.' });
  }
});

// PUT /api/checkins/:id - 체크인 수정
router.put('/:id', (req, res) => {
  try {
    const checkin = checkinsService.updateCheckin(req.params.id, req.body || {});
    res.json({ checkin });
  } catch (err) {
    sendServiceError(err, res, { logPrefix: '체크인 수정 실패:', failMessage: '체크인을 수정하지 못했습니다.' });
  }
});

// DELETE /api/checkins/:id - 체크인 삭제
router.delete('/:id', (req, res) => {
  try {
    checkinsService.deleteCheckin(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    sendServiceError(err, res, { logPrefix: '체크인 삭제 실패:', failMessage: '체크인을 삭제하지 못했습니다.' });
  }
});

module.exports = router;
