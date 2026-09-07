// 이메일(mail) 조회 라우트 (모두 /api/mail 하위)
// - 읽기 전용. emails 는 에이전트가 채운다 (ADR-0011).
// - 빈 결과는 200 + { emails: [] } (ADR-0025 와 같은 일관성).

const router = require('express').Router();
const mailService = require('../services/mail');

// GET /api/mail/unread - 미읽음 메일 목록 (선택 쿼리 limit)
router.get('/unread', (req, res) => {
  try {
    let limit;
    if (req.query.limit !== undefined) {
      limit = Number(req.query.limit);
      if (!Number.isInteger(limit) || limit <= 0) {
        return res.status(400).json({ error: 'limit 은 1 이상의 정수여야 합니다.' });
      }
    }
    res.json({ emails: mailService.listUnread({ limit }) });
  } catch (err) {
    console.error('메일 조회 실패:', err);
    res.status(500).json({ error: '메일을 불러오지 못했습니다.' });
  }
});

module.exports = router;
