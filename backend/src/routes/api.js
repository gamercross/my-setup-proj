// API 라우트 (Week 3: tasks / projects CRUD 연결)

const express = require('express');
const router = express.Router();

// GET /api/health - API 동작 확인
router.get('/health', (req, res) => {
  res.json({ ok: true });
});

// 도메인별 라우터 연결
router.use('/tasks', require('./tasks'));
router.use('/projects', require('./projects'));
router.use('/calendar', require('./calendar'));
router.use('/mail', require('./mail'));
router.use('/brief', require('./brief'));
router.use('/diagrams', require('./diagrams'));
router.use('/sync', require('./sync'));
router.use('/agent', require('./agent'));

module.exports = router;
