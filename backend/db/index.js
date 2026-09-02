// DB 커넥션 모듈 (better-sqlite3) — ADR-0002, ADR-0009, ADR-0011
//
// 역할:
//  - DATABASE_PATH 해석 (환경변수 우선, 없으면 backend/data/app.db)
//  - 커넥션 싱글턴 지연 초기화 + PRAGMA 설정
//  - schema.sql 을 런타임에 읽어 멱등 적용 (IF NOT EXISTS)
//
// 주의: 이 모듈은 backend/db/index.js 다.
//  - 라우트가 require('../db') 하면 backend/src/db.js (데이터 접근 계층)
//  - src/db.js 가 require('../db') 하면 이 파일 (커넥션 계층)

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// 커넥션 싱글턴
let conn = null;

// DATABASE_PATH 해석. 트림 후 비어있지 않으면 그 값을 그대로 사용(':memory:' 도 통과).
function resolveDbPath() {
  const raw = (process.env.DATABASE_PATH || '').trim();
  if (raw) return raw;
  return path.resolve(__dirname, '../data/app.db');
}

// 커넥션 생성 + PRAGMA + 스키마 적용
function openDatabase() {
  const dbPath = resolveDbPath();

  // 파일 DB 면 상위 디렉터리를 보장한다 (':memory:' 는 건너뜀).
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath);

  try {
    // PRAGMA 는 커넥션 직후 순서대로 (':memory:' 는 journal_mode 가 'memory' 로 응답 — 오류 아님)
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.pragma('foreign_keys = ON');

    // 스키마 적용 (단일 원천: backend/db/schema.sql, 복사 금지)
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema);
  } catch (err) {
    console.error('DB 초기화 실패:', err);
    try {
      db.close();
    } catch (_) {
      // 정리 실패는 무시하고 원래 오류를 재던진다
    }
    throw err;
  }

  return db;
}

// 커넥션 싱글턴 반환 (첫 호출 시 초기화)
function getDb() {
  if (!conn) {
    conn = openDatabase();
  }
  return conn;
}

// 커넥션 종료 — 테스트 전용. 프로덕션 코드에서는 호출하지 않는다.
function closeDatabase() {
  if (conn) {
    conn.close();
    conn = null;
  }
}

module.exports = { getDb, closeDatabase, resolveDbPath };
