// 다이어그램(diagrams) 조회 라우트 (모두 /api/diagrams 하위)
// - 읽기 전용 (C4, ADR-0014). 데이터는 services/diagrams.js 가 docs/**/*.md 파싱.

const router = require('express').Router();
const diagramsService = require('../services/diagrams');

// GET /api/diagrams?doc= - 다이어그램 목록. doc 은 선택(문서 basename, 대소문자 무시).
router.get('/', (req, res) => {
  try {
    // doc 이 문자열이 아니면(배열 등) 무시하고 전체를 반환한다.
    const doc = typeof req.query.doc === 'string' ? req.query.doc : undefined;
    res.json({ diagrams: diagramsService.listDiagrams({ doc }) });
  } catch (err) {
    console.error('다이어그램 조회 실패:', err);
    res.status(500).json({ error: '다이어그램을 불러오지 못했습니다.' });
  }
});

module.exports = router;
