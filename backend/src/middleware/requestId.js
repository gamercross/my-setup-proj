// 요청 ID 부여 미들웨어 (ADR-0017)
// - 클라이언트가 보낸 X-Request-Id 가 형식(영숫자·.·_·- 1~64자)에 맞으면 그대로 채택하고,
//   아니면(미전달·형식 위반) 새로 생성한다 — 헤더 인젝션 방지.
// - 형식: r-YYYYMMDD-<hex8> (새 의존성 없이 crypto.randomBytes 사용).
// - req.requestId 에 저장 + 응답 헤더 X-Request-Id 로 에코한다. 체인 최상단(requestLogger 보다 앞)에 둔다.

const crypto = require('node:crypto');

const CLIENT_ID_RE = /^[A-Za-z0-9._-]{1,64}$/;

function generateRequestId() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const hex = crypto.randomBytes(4).toString('hex');
  return `r-${y}${m}${d}-${hex}`;
}

function requestId(req, res, next) {
  try {
    const incoming = req.get('X-Request-Id');
    const id = incoming && CLIENT_ID_RE.test(incoming) ? incoming : generateRequestId();
    req.requestId = id;
    res.setHeader('X-Request-Id', id);
  } catch (err) {
    console.error('requestId 미들웨어 오류:', err);
  }
  next();
}

module.exports = { requestId, generateRequestId };
