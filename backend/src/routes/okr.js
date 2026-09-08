// OKR CRUD·대시보드 라우트 (모두 /api/okr 하위) — P8, FR-OKR-01~04
// 얇은 계층: 입력을 서비스로 넘기고 결과를 직렬화한다. 도메인 규칙은 services/okr.js.

const router = require('express').Router();
const okr = require('../services/okr');
const { isValidationError, isNotFoundError, toClientMessage } = require('../errors');

// 서비스 오류 → 상태코드 (404 우선 → 400 → 500). routes/tasks.js 와 동일 패턴.
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

// GET /api/okr - 대시보드 (objectives + summary). ?includeArchived=1|true 면 보관 목표 포함.
router.get('/', (req, res) => {
  try {
    const raw = req.query.includeArchived;
    const includeArchived = raw === '1' || raw === 'true';
    res.json(okr.getDashboard({ includeArchived }));
  } catch (err) {
    handleError(err, res, { logPrefix: 'OKR 조회 실패:', failMessage: 'OKR 을 불러오지 못했습니다.' });
  }
});

// GET /api/okr/trend - 월별 KR 평균 달성률 추이.
// 진입 시 이번 달 스냅샷을 UPSERT 한다 (FR-OKR-04 AC-3, 적재 주체 = 백엔드).
// 스냅샷 실패는 조회를 막지 않는다 (실패해도 200).
router.get('/trend', (req, res) => {
  try {
    try {
      okr.snapshotCurrentMonth();
    } catch (snapErr) {
      console.error('월별 KR 스냅샷 적재 실패:', snapErr.message);
    }
    res.json(okr.getTrend());
  } catch (err) {
    handleError(err, res, { logPrefix: 'OKR 추이 조회 실패:', failMessage: '추이를 불러오지 못했습니다.' });
  }
});

// POST /api/okr/objectives
router.post('/objectives', (req, res) => {
  try {
    res.status(201).json({ objective: okr.createObjective(req.body || {}) });
  } catch (err) {
    handleError(err, res, { logPrefix: '목표 생성 실패:', failMessage: '목표를 생성하지 못했습니다.' });
  }
});

// PUT /api/okr/objectives/:id
router.put('/objectives/:id', (req, res) => {
  try {
    res.json({ objective: okr.updateObjective(req.params.id, req.body || {}) });
  } catch (err) {
    handleError(err, res, { logPrefix: '목표 수정 실패:', failMessage: '목표를 수정하지 못했습니다.' });
  }
});

// DELETE /api/okr/objectives/:id (하위 KR·스냅샷 CASCADE)
router.delete('/objectives/:id', (req, res) => {
  try {
    okr.deleteObjective(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    handleError(err, res, { logPrefix: '목표 삭제 실패:', failMessage: '목표를 삭제하지 못했습니다.' });
  }
});

// POST /api/okr/key-results
router.post('/key-results', (req, res) => {
  try {
    res.status(201).json({ keyResult: okr.createKeyResult(req.body || {}) });
  } catch (err) {
    handleError(err, res, { logPrefix: '핵심 결과 생성 실패:', failMessage: '핵심 결과를 생성하지 못했습니다.' });
  }
});

// PUT /api/okr/key-results/:id
router.put('/key-results/:id', (req, res) => {
  try {
    res.json({ keyResult: okr.updateKeyResult(req.params.id, req.body || {}) });
  } catch (err) {
    handleError(err, res, { logPrefix: '핵심 결과 수정 실패:', failMessage: '핵심 결과를 수정하지 못했습니다.' });
  }
});

// DELETE /api/okr/key-results/:id (하위 스냅샷 CASCADE)
router.delete('/key-results/:id', (req, res) => {
  try {
    okr.deleteKeyResult(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    handleError(err, res, { logPrefix: '핵심 결과 삭제 실패:', failMessage: '핵심 결과를 삭제하지 못했습니다.' });
  }
});

module.exports = router;
