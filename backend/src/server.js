// Express API 서버 (Week 1 최소 구현)
// - 포트 3000에서 실행
// - GET / 로 상태 확인
// - /api 라우트 연결
// - 기본 에러 핸들링 포함

const express = require('express');
const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

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

// 서버 시작
const server = app.listen(PORT, () => {
  console.log(`✅ 백엔드 서버 실행 중: http://localhost:${PORT}`);
});

// 예기치 못한 오류로부터 서버를 보호한다
process.on('unhandledRejection', (reason) => {
  console.error('처리되지 않은 Promise 거부:', reason);
});

module.exports = server;
