// 일일 브리핑(brief) 조회 라우트 (모두 /api/brief 하위)
// - 읽기 전용. briefs 는 에이전트가 채운다 (ADR-0011).
// - 빈 결과는 404 가 아니라 200 + { brief: null } 이다 (ADR-0025).

const router = require('express').Router();
const briefService = require('../services/brief');

// GET /api/brief/today - 오늘 브리핑 (없으면 { brief: null })
router.get('/today', (req, res) => {
  try {
    res.json({ brief: briefService.getTodayBrief() });
  } catch (err) {
    console.error('브리핑 조회 실패:', err);
    res.status(500).json({ error: '브리핑을 불러오지 못했습니다.' });
  }
});

module.exports = router;
