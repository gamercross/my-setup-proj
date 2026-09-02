// Express 앱 조립 모듈
// 리슨(app.listen)과 앱 조립을 분리한다: 테스트에서는 포트를 열지 않고 앱만 필요하다.

const express = require('express');
const apiRouter = require('./routes/api');

// 미들웨어/라우트/에러 핸들러를 조립한 Express 앱을 만든다 (에러 핸들러가 항상 마지막).
function createApp() {
  const app = express();

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
  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.originalUrl });
  });

  // 공통 에러 핸들러
  app.use((err, req, res, next) => {
    console.error('서버 오류:', err);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  });

  return app;
}

module.exports = { createApp };
