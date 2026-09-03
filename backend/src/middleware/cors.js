// CORS 미들웨어 (직접 구현 — cors npm 패키지 미사용)
// 허용 오리진은 하드코딩한다: 프런트엔드 Vite 는 strictPort:true 로 5173 포트가 고정이다.

const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

// 허용 오리진이면 CORS 헤더를 붙이고, preflight(OPTIONS)는 여기서 204 로 끝낸다.
function corsMiddleware(req, res, next) {
  try {
    const origin = req.headers.origin;

    // ① Origin 헤더 없음 → curl/supertest/서버-서버 호출. CORS 무관, 그대로 통과.
    if (!origin) {
      return next();
    }

    let allowedEcho = null;

    // ② Origin: 'null' (문자열) → 허용.
    //    prod Electron 은 file:// 에서 렌더러를 로드하므로 fetch 가 Origin: null 을 보낸다.
    if (origin === 'null') {
      allowedEcho = 'null';
    } else if (ALLOWED_ORIGINS.includes(origin)) {
      // ③ 화이트리스트 오리진 → 그대로 에코.
      allowedEcho = origin;
    }

    // ④ 그 외 오리진 → 헤더를 붙이지 않는다. 403 으로 막지 않고 통과시킨다.
    //    (preflight 도 CORS 헤더 부재로 브라우저에서 자연 실패한다.)
    if (!allowedEcho) {
      return next();
    }

    res.setHeader('Access-Control-Allow-Origin', allowedEcho);
    res.vary('Origin');

    // preflight 요청은 라우트까지 보내지 않고 여기서 종료한다.
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Max-Age', '600');
      return res.sendStatus(204);
    }

    return next();
  } catch (err) {
    // CORS 처리 실패가 요청 자체를 막지는 않도록 한다.
    console.error('CORS 미들웨어 오류:', err);
    return next();
  }
}

module.exports = { corsMiddleware, ALLOWED_ORIGINS };
