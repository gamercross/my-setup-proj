// 동기화(sync) 라우트 (모두 /api/sync 하위)
// - 현재는 외부 연결 진단만 제공한다 (ADR-0008 후속, Phase E 선행). 동기화 로직은 E2 예정.
// - GET /logs 는 동기화 이력 조회 (D2-a, FR-SYNC-03 / NFR-OBS-03). 읽기 전용.

const router = require('express').Router();
const supabase = require('../supabase');
const db = require('../db');

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

// GET /api/sync/logs?service=&limit= - 동기화 이력 (최신 순). 읽기 전용.
router.get('/logs', (req, res) => {
  try {
    const { service, limit } = req.query;

    if (service !== undefined && !db.SYNC_SERVICES.includes(service)) {
      return res
        .status(400)
        .json({ error: `service 는 ${db.SYNC_SERVICES.join('|')} 중 하나여야 합니다.` });
    }

    let lim = 50;
    if (limit !== undefined) {
      lim = Number(limit);
      if (!Number.isInteger(lim) || lim <= 0) {
        return res.status(400).json({ error: 'limit 은 1 이상의 정수여야 합니다.' });
      }
    }

    res.json({ logs: db.getSyncLogs({ service, limit: lim }) });
  } catch (err) {
    console.error('sync/logs 조회 실패:', err);
    res.status(500).json({ error: '동기화 이력을 불러오지 못했습니다.' });
  }
});

module.exports = router;
