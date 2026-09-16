// 주간 플래너 라우트 (모두 /api/planner 하위) — P8, FR-OKR-05
// 읽기 전용. 완료 토글은 PUT /api/tasks/:id 로 한다 (단일 캐시, FR-TASK-09).

const router = require('express').Router();
const planner = require('../services/planner');
const { sendServiceError } = require('../problem');

// GET /api/planner/weekly - 지난주/이번주/다음주 요약
router.get('/weekly', (req, res) => {
  try {
    res.json(planner.getWeekly());
  } catch (err) {
    sendServiceError(err, res, {
      logPrefix: '주간 플래너 조회 실패:',
      failMessage: '주간 플래너를 불러오지 못했습니다.',
    });
  }
});

module.exports = router;
