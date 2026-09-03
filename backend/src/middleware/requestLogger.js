// 요청 로깅 미들웨어 (morgan/winston 미사용)
// 한 줄 형식: "POST /api/tasks 201 3ms"
// 본문·헤더·쿼리값은 로깅하지 않는다 (위협 모델: 민감 데이터 로그 유출 방지).

function requestLogger(req, res, next) {
  if (process.env.NODE_ENV === 'test') return next();

  const startedAt = Date.now();

  res.on('finish', () => {
    try {
      const ms = Date.now() - startedAt;
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    } catch (err) {
      console.error('요청 로깅 오류:', err);
    }
  });

  next();
}

module.exports = { requestLogger };
