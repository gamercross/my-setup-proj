// 캘린더(calendar) 조회 라우트 (모두 /api/calendar 하위)
// - 읽기 전용 (C3). 데이터는 services/calendar.js 의 더미 (ADR-0011).

const router = require('express').Router();
const calendarService = require('../services/calendar');

// GET /api/calendar/events - 일정 목록 (선택 쿼리 from/to, ISO8601)
router.get('/events', (req, res) => {
  try {
    const { from, to } = req.query;

    if (from !== undefined && Number.isNaN(Date.parse(from))) {
      return res.status(400).json({ error: 'from 은 ISO8601 형식이어야 합니다.' });
    }
    if (to !== undefined && Number.isNaN(Date.parse(to))) {
      return res.status(400).json({ error: 'to 는 ISO8601 형식이어야 합니다.' });
    }

    res.json({ events: calendarService.listEvents({ from, to }) });
  } catch (err) {
    console.error('일정 조회 실패:', err);
    res.status(500).json({ error: '일정을 불러오지 못했습니다.' });
  }
});

module.exports = router;
