// 지식 축적 추세 라우트 (모두 /api/knowledge-trend 하위) — 개인 OS P11, FR-KNOW-01, ADR-0036
// 읽기 전용. 순수 SQL 집계, Claude 호출 없음. routes/planner.js·routes/okr.js 와 같은 얇은 계층.

const router = require('express').Router();
const knowledge = require('../services/knowledgeTrend');
const { sendServiceError } = require('../problem');

// GET /api/knowledge-trend - 주차별 체크인 빈도 + 월별 OKR 평균 달성률 + 태그 분포.
// 주의: 여기서 kr_snapshots 를 적재하지 않는다 — 적재 주체는 GET /api/okr/trend 뿐이다
// (FR-OKR-04 AC-3 불변식, TC-KNOW-08).
router.get('/', (req, res) => {
  try {
    const weeks = knowledge.assertWeeks(req.query.weeks);
    res.json(knowledge.getKnowledgeTrend(new Date(), { weeks }));
  } catch (err) {
    sendServiceError(err, res, {
      logPrefix: '지식 추세 조회 실패:',
      failMessage: '지식 추세를 불러오지 못했습니다.',
    });
  }
});

module.exports = router;
