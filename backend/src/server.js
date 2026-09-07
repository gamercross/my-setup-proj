// Express API 서버 (Week 1 최소 구현)
// - 포트 3000에서 실행
// - GET / 로 상태 확인
// - /api 라우트 연결
// - 앱 조립은 app.js 에서 담당한다

const { createApp } = require('./app');
const { registerProcessHandlers } = require('./lifecycle');

const app = createApp();
const PORT = process.env.PORT || 3000;

// 서버 시작
const server = app.listen(PORT, () => {
  console.log(`✅ 백엔드 서버 실행 중: http://localhost:${PORT}`);
});

// 프로세스 수명주기 핸들러 등록 (lifecycle.js):
//  - uncaughtException → 로그 후 안전 종료(exit 1)
//  - SIGTERM/SIGINT → WAL 체크포인트 후 graceful shutdown(exit 0)
//  - unhandledRejection → 로그만 (기존 동작 유지)
registerProcessHandlers({ server });

module.exports = server;
