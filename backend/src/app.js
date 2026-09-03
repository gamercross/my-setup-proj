// Express 앱 조립 모듈
// 리슨(app.listen)과 앱 조립을 분리한다: 테스트에서는 포트를 열지 않고 앱만 필요하다.
// requestLogger 를 최상단에 둬 preflight·파싱 실패 요청까지 관측한다 (DESIGN §5 갱신 예정).
// 순서: requestLogger → cors → express.json → 라우트 → 404 → errorHandler.

const express = require('express');
const apiRouter = require('./routes/api');
const { corsMiddleware } = require('./middleware/cors');
const { requestLogger } = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// 미들웨어/라우트/에러 핸들러를 조립한 Express 앱을 만든다 (에러 핸들러가 항상 마지막).
function createApp() {
  const app = express();

  // 요청 로깅 (test 환경에서는 비활성) — preflight·파싱 실패까지 남기려고 맨 앞에 둔다
  app.use(requestLogger);

  // CORS (로컬 오리진만 허용, preflight 처리)
  app.use(corsMiddleware);

  // JSON 요청 본문 파싱
  app.use(express.json());

  // 헬스 체크 엔드포인트
  app.get('/', (req, res) => {
    res.json({
      service: 'ai-computer-os-backend',
      status: 'ok',
      time: new Date().toISOString(),
    });
  });

  // API 라우트
  app.use('/api', apiRouter);

  // 404 처리
  app.use(notFoundHandler);

  // 공통 에러 핸들러
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
