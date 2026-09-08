// 문서 본문 조회 라우트 (모두 /api/docs 하위)
// - 읽기 전용 (P9, ADR-0031). GET 만 정의한다 (쓰기·삭제 없음).
// - 데이터·검증은 services/docs.js.

const router = require('express').Router();
const docsService = require('../services/docs');

// GET /api/docs - 경로 없음
router.get('/', (req, res) => {
  res.status(400).json({ error: '문서 경로가 필요합니다.' });
});

// GET /api/docs/<허용 루트 안의 상대경로> - 토큰 배열
// Express 4 와일드카드: req.params[0] 에 경로가 담기며 라우터가 이미 1회 percent-decode 했다.
// 여기서 decodeURIComponent 를 다시 부르지 않는다 (%252e%252e 이중 인코딩 우회 방지 — TC-DOCS-07).
router.get('/*', (req, res) => {
  const rel = req.params[0] || '';
  const resolved = docsService.resolveDocPath(rel);
  if (!resolved.ok) {
    return res.status(resolved.code).json({ error: resolved.message });
  }
  try {
    res.json(docsService.readDocTokens(resolved.full, rel));
  } catch (err) {
    console.error('문서 조회 실패:', err);
    res.status(500).json({ error: '문서를 불러오지 못했습니다.' });
  }
});

module.exports = router;
