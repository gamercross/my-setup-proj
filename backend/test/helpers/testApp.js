// 테스트용 격리 픽스처
// db.js 는 모듈 스코프 배열 + 시퀀스 싱글턴이라 테스트 간 상태가 누수된다.
// 프로덕션 코드에 reset 훅을 넣지 않고, require 캐시에서 src/ 하위만 비워 새 인스턴스를 만든다.

const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../../src');

// 새로 조립한 Express 앱을 반환한다.
function createTestApp(options = {}) {
  // ADR-0009 대비: 파일 DB 전환 시 경로 주입 지점 (현재는 미사용).
  if (options.dbPath) {
    process.env.DATABASE_PATH = options.dbPath;
  }

  // src/ 하위 모듈만 캐시에서 제거한다 (node_modules 는 유지).
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(SRC_DIR + path.sep)) {
      delete require.cache[key];
    }
  }

  return require('../../src/app').createApp();
}

module.exports = { createTestApp };
