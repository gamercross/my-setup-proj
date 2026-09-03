// 404 / 공통 에러 핸들러
// 오류 응답 봉투는 단일 형식: { error: "한국어 메시지" }. 스택은 절대 응답 본문에 넣지 않는다.

// 매칭되는 라우트가 없을 때.
// 요청 로깅은 requestLogger 가 1줄로 남기므로 여기서 따로 warn 하지 않는다.
function notFoundHandler(req, res) {
  res.status(404).json({ error: '요청한 경로를 찾을 수 없습니다.' });
}

// 공통 에러 핸들러.
// Express 는 인자 개수(4개)로 에러 핸들러를 식별하므로 next 를 사용하지 않아도 제거하면 안 된다.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  try {
    // 이미 응답이 시작됐으면 Express 기본 처리에 위임한다.
    if (res.headersSent) {
      return next(err);
    }

    // body-parser 내부 에러만 명시 매핑한다 (영어 내부 메시지가 그대로 나가지 않도록).
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: '요청 본문이 너무 큽니다.' });
    }
    if (
      err.type === 'entity.parse.failed' ||
      (err instanceof SyntaxError && err.status === 400)
    ) {
      return res
        .status(400)
        .json({ error: '요청 본문(JSON) 형식이 올바르지 않습니다.' });
    }

    // 그 외는 전부 500 (내부 메시지·스택 미노출).
    console.error('서버 오류:', err);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  } catch (handlerErr) {
    console.error('에러 핸들러 자체 오류:', handlerErr);
    if (!res.headersSent) {
      res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
    }
  }
}

module.exports = { notFoundHandler, errorHandler };
