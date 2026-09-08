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

// 스키마 마이그레이션 버전 (PRAGMA user_version 과 비교). forward-only, down 없음 — ADR-0018.
const SCHEMA_VERSION = 1;

// 마이그레이션 직전 1회 백업한다.
// ':memory:' · 신규 파일(부팅 시 새로 만들어진 빈 DB, isNew)은 스킵.
// WAL 모드에서는 아직 체크포인트 안 된 커밋이 -wal 사이드카에 있으므로,
// copyFileSync 직전에 wal_checkpoint(TRUNCATE) 로 WAL 을 메인 파일로 밀어넣는다.
function backupIfNeeded(db, dbPath, isNew) {
  try {
    if (dbPath === ':memory:') return;
    if (isNew) return;
    if (!fs.existsSync(dbPath)) return;
    // WAL → 메인 파일 반영 (백업본 누락 방지)
    db.pragma('wal_checkpoint(TRUNCATE)');
    const dest = `${dbPath}.bak-${Date.now()}`;
    fs.copyFileSync(dbPath, dest);
  } catch (err) {
    // 백업 실패는 마이그레이션을 막지 않는다 (로그만).
    console.error('마이그레이션 백업 실패:', err.message);
  }
}

// PRAGMA user_version 기반 최소 마이그레이션 러너 (ADR-0018).
// 별도 러너 모듈·migrations/ 디렉터리 없이 여기 인라인으로 둔다. forward-only.
// 신규 테이블은 schema.sql 로 충분(P6 task_tags 선례). 버전 상향은 기존 테이블 변경 시에만.
function applyMigrations(db, dbPath, isNew) {
  const cur = db.pragma('user_version', { simple: true });
  if (cur >= SCHEMA_VERSION) return;

  backupIfNeeded(db, dbPath, isNew);

  // v1: sync_logs CHECK 에 'classify' 추가 (기존 파일 DB 용). 신규 DB 는 schema.sql 이 이미 반영.
  db.exec(`
    BEGIN;
    CREATE TABLE sync_logs_v1 (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      service       TEXT NOT NULL CHECK (service IN ('gmail','calendar','notion','supabase','classify')),
      status        TEXT NOT NULL CHECK (status IN ('success','failed')),
      last_sync     TEXT NOT NULL,
      error_message TEXT
    );
    INSERT INTO sync_logs_v1 (id, service, status, last_sync, error_message)
      SELECT id, service, status, last_sync, error_message FROM sync_logs;
    DROP TABLE sync_logs;
    ALTER TABLE sync_logs_v1 RENAME TO sync_logs;
    CREATE INDEX IF NOT EXISTS idx_sync_service ON sync_logs(service, last_sync);
    COMMIT;
  `);
  db.pragma(`user_version = ${SCHEMA_VERSION}`);
}

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

  // new Database() 가 파일을 만들기 전에 신규 여부를 판정한다 (사후 판정 금지).
  const isNew = dbPath !== ':memory:' && !fs.existsSync(dbPath);

  const db = new Database(dbPath);

  try {
    // PRAGMA 는 커넥션 직후 순서대로 (':memory:' 는 journal_mode 가 'memory' 로 응답 — 오류 아님)
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.pragma('foreign_keys = ON');

    // 스키마 적용 (단일 원천: backend/db/schema.sql, 복사 금지)
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema);

    // 스키마 적용 직후 마이그레이션 (forward-only, ADR-0018).
    applyMigrations(db, dbPath, isNew);
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

// WAL 체크포인트 후 커넥션 종료 — 프로세스 안전 종료(src/lifecycle.js) 전용.
// 열린 커넥션이 없으면 no-op. 각 단계 예외는 로그 후 무시한다 (':memory:' 포함).
function checkpointAndClose() {
  if (!conn) return;
  try {
    conn.pragma('wal_checkpoint(TRUNCATE)');
  } catch (err) {
    console.error('WAL 체크포인트 실패:', err.message);
  }
  try {
    conn.close();
  } catch (err) {
    console.error('DB 커넥션 종료 실패:', err.message);
  }
  conn = null;
}

module.exports = { getDb, closeDatabase, resolveDbPath, checkpointAndClose };
