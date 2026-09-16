// REST 오류 응답 계약 (RFC 9457 스타일, ADR-0017) — 단일 원천.
// 모든 4xx/5xx 응답은 { type, title, status, detail, errors?, request_id }
// + Content-Type: application/problem+json 형태로 나간다. { error: ... } 키는 쓰지 않는다.

const {
  isNotFoundError,
  isValidationError,
  isConflictError,
  isUpstreamError,
  toClientMessage,
} = require('./errors');

// type → { status, title } 매핑표 (6종). type ↔ status 는 1:1 불변식.
// 새 type 을 추가할 땐 이 표만 고치면 된다 — 라우트에 문자열 리터럴을 흩뿌리지 않는다.
const PROBLEM_TYPES = {
  validation_error: { status: 400, title: '입력이 올바르지 않습니다' },
  not_found: { status: 404, title: '요청한 리소스를 찾을 수 없습니다' },
  conflict: { status: 409, title: '요청이 현재 상태와 충돌합니다' },
  payload_too_large: { status: 413, title: '요청 본문이 너무 큽니다' },
  upstream_unavailable: { status: 503, title: '일시적으로 요청을 처리할 수 없습니다' },
  internal_error: { status: 500, title: '서버 내부 오류가 발생했습니다' },
};

// type 값에 대응하는 응답 본문을 만든다. status 를 넘기면 표 값 대신 그 값을 쓴다(현재 미사용, 확장 여지).
function buildProblem(res, type, { detail, errors, status } = {}) {
  const entry = PROBLEM_TYPES[type];
  // 표에 없는 type 은 내부 오타 — internal_error 로 강등하고 로그를 남긴다.
  if (!entry) {
    console.error('problem.js: 알 수 없는 type 요청됨:', type);
    return buildProblem(res, 'internal_error', { detail });
  }
  const body = {
    type,
    title: entry.title,
    status: status || entry.status,
    detail: detail || entry.title,
    request_id: (res.req && res.req.requestId) || undefined,
  };
  if (errors && errors.length) body.errors = errors;
  return body;
}

// 상태코드 설정 + problem+json 헤더 + 응답 전송까지 한번에 한다.
function sendProblem(res, type, opts = {}) {
  const body = buildProblem(res, type, opts);
  return res.status(body.status).type('application/problem+json').json(body);
}

// 기존 7개 라우트에 복붙돼 있던 handleError 의 유일본.
// 404 → 409(충돌) → 503(업스트림) → 400(검증) → 500 순으로 판정한다.
function sendServiceError(err, res, { logPrefix, failMessage }) {
  if (isNotFoundError(err)) {
    return sendProblem(res, 'not_found', { detail: err.message });
  }
  if (isConflictError(err)) {
    return sendProblem(res, 'conflict', { detail: err.message });
  }
  if (isUpstreamError(err)) {
    return sendProblem(res, 'upstream_unavailable', { detail: err.message });
  }
  if (isValidationError(err)) {
    return sendProblem(res, 'validation_error', { detail: toClientMessage(err) });
  }
  console.error(logPrefix, err);
  return sendProblem(res, 'internal_error', { detail: failMessage });
}

module.exports = {
  PROBLEM_TYPES,
  buildProblem,
  sendProblem,
  sendServiceError,
};
