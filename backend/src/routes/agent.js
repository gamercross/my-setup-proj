// 에이전트(agent) 라우트 (모두 /api/agent 하위) — P7, FR-AGENT-08
// - 입력 검증·HTTP 상태 매핑만 한다. 조립·파일 IO 는 services/agent.js.
// - 외부 프로세스 실행 API 를 절대 import·호출하지 않는다 (ADR-0011 — 백엔드는 파이썬을 띄우지 않는다).
//   플래그 파일만 쓰고, launchd 가 그 변경을 감지해 에이전트를 깨운다.

const router = require('express').Router();
const agent = require('../services/agent');

// GET /api/agent/activity?limit= - 활동 위젯 데이터. logs 조회 실패만 500, 나머지는 실패해도 200.
router.get('/activity', async (req, res) => {
  const { limit } = req.query;

  let lim = 10;
  if (limit !== undefined) {
    lim = Number(limit);
    if (!Number.isInteger(lim) || lim <= 0) {
      return res.status(400).json({ error: 'limit 은 1 이상의 정수여야 합니다.' });
    }
    if (lim > 50) lim = 50;
  }

  try {
    const data = await agent.getActivity({ limit: lim });
    res.json(data);
  } catch (err) {
    console.error('agent/activity 조회 실패:', err);
    res.status(500).json({ error: '에이전트 활동을 불러오지 못했습니다.' });
  }
});

// POST /api/agent/run-now - "지금 실행" 요청. 본문은 무시한다.
// 멱등: 이미 대기 중이면 기존 요청 시각을 그대로 돌려준다.
router.post('/run-now', (req, res) => {
  try {
    const result = agent.requestRun();

    if (!result.ok && result.reason === 'no-root') {
      return res
        .status(503)
        .json({ error: '에이전트 폴더를 찾을 수 없어 실행을 요청할 수 없습니다.' });
    }
    if (!result.ok) {
      return res.status(500).json({ error: '지금 실행 요청을 저장하지 못했습니다.' });
    }

    res.json({
      ok: true,
      pending: true,
      requestedAt: result.requestedAt,
      alreadyPending: result.alreadyPending,
      note: '에이전트가 다음 감지 시 실행합니다.',
    });
  } catch (err) {
    console.error('agent/run-now 처리 실패:', err);
    res.status(500).json({ error: '지금 실행 요청을 저장하지 못했습니다.' });
  }
});

module.exports = router;
