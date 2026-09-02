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

module.exports = router;
