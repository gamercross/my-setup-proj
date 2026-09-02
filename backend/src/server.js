// Express API 서버 (Week 1 최소 구현)
// - 포트 3000에서 실행
// - GET / 로 상태 확인
// - /api 라우트 연결
// - 앱 조립은 app.js 에서 담당한다

const { createApp } = require('./app');

const app = createApp();
const PORT = process.env.PORT || 3000;

// 서버 시작
const server = app.listen(PORT, () => {
  console.log(`✅ 백엔드 서버 실행 중: http://localhost:${PORT}`);
});

// 예기치 못한 오류로부터 서버를 보호한다
process.on('unhandledRejection', (reason) => {
  console.error('처리되지 않은 Promise 거부:', reason);
});

module.exports = server;
