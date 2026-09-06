// 동기화(sync) 라우트 (모두 /api/sync 하위)
// - 현재는 외부 연결 진단만 제공한다 (ADR-0008 후속, Phase E 선행). 동기화 로직은 E2 예정.
// - GET /logs 는 D2 예정 (FR-SYNC-03).

const router = require('express').Router();
const supabase = require('../supabase');

// GET /api/sync/health - Supabase 외부 연결 진단. 항상 200 (실패도 200, 비밀값 미포함).
router.get('/health', async (req, res) => {
  try {
    const result = await supabase.checkConnection();
    res.json({
      supabase: result.status,
      detail: result.detail,
      host: result.host || null,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('sync/health 확인 실패:', err);
    res.json({ supabase: 'error', detail: '연결 확인 중 오류', host: null, checkedAt: new Date().toISOString() });
  }
});

module.exports = router;
