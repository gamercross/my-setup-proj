// 테스트용 격리 픽스처
// src/db.js 는 커넥션 싱글턴을, db/index.js 도 커넥션 싱글턴을 들고 있어
// 테스트 간 상태가 누수된다. 프로덕션 코드에 reset 훅을 넣지 않고,
// require 캐시에서 src/ · db/ 하위만 비워 새 인스턴스를 만든다.

const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../../src');
const DB_DIR = path.resolve(__dirname, '../../db');

// src/ · db/ 하위 모듈을 캐시에서 제거한다 (node_modules 는 유지).
function clearModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(SRC_DIR + path.sep) || key.startsWith(DB_DIR + path.sep)) {
      delete require.cache[key];
    }
  }
}

// 새로 조립한 Express 앱을 반환한다.
// dbPath 미지정 시 인메모리 DB 로 강제 (테스트 격리).
function createTestApp(options = {}) {
  // 요청 로깅을 억제한다 (requestLogger 는 NODE_ENV==='test' 면 no-op).
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = options.dbPath || ':memory:';
  clearModuleCache();
  return require('../../src/app').createApp();
}

// src/db.js 모듈을 새 커넥션으로 로드해 반환한다 (앱 없이 데이터 계층만 테스트).
function loadDb(dbPath) {
  process.env.DATABASE_PATH = dbPath || ':memory:';
  clearModuleCache();
  return require('../../src/db');
}

// src/services/<name>.js 를 새 커넥션으로 로드해 반환한다 (앱 없이 서비스 계층만 테스트).
function loadService(name, dbPath) {
  process.env.DATABASE_PATH = dbPath || ':memory:';
  clearModuleCache();
  return require(`../../src/services/${name}`);
}

module.exports = { createTestApp, loadDb, loadService };
