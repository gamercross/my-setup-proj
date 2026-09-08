// 파일 트리 조회 라우트 (모두 /api/tree 하위)
// - 읽기 전용 (P9, ADR-0031). 데이터는 services/tree.js.

const router = require('express').Router();
const treeService = require('../services/tree');

// GET /api/tree - 허용 루트(docs/ + 루트 *.md)의 .md 트리
router.get('/', (req, res) => {
  try {
    res.json(treeService.listTree());
  } catch (err) {
    console.error('파일 트리 조회 실패:', err);
    res.status(500).json({ error: '파일 트리를 불러오지 못했습니다.' });
  }
});

module.exports = router;
