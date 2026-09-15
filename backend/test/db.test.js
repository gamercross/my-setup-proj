// DB 계층 테스트 (TC-DB-01,02,03) — better-sqlite3 영속성/스키마/인터페이스

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

const { createTestApp, loadDb } = require('./helpers/testApp');

// ISO8601 (Date.toISOString 형식) 매칭
const ISO8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const TASK_KEYS = [
  'id',
  'title',
  'description',
  'due_date',
  'priority',
  'status',
  'project_id',
  'tags',
  'created_at',
  'updated_at',
];
const PROJECT_KEYS = ['id', 'name', 'progress', 'status', 'notion_id', 'created_at', 'updated_at'];

// 테스트용 임시 디렉터리 (파일 DB + WAL 사이드카 통째로 정리)
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setupproj-db-'));

after(() => {
  try {
    require('../db').closeDatabase();
  } catch (_) {
    // 이미 닫혔으면 무시
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('DB 계층', () => {
  it('TC-DB-01: 앱 재시작 후에도 파일 DB 에 데이터가 남는다', async () => {
    const dbPath = path.join(tmpDir, 'restart.db');

    const appA = createTestApp({ dbPath });
    await request(appA).post('/api/tasks').send({ title: '첫번째' });
    await request(appA).post('/api/tasks').send({ title: '두번째' });

    // 앱 A 커넥션 종료 (재시작 모사)
    require('../db').closeDatabase();

    const appB = createTestApp({ dbPath });
    const res = await request(appB).get('/api/tasks');
    assert.equal(res.status, 200);
    assert.equal(res.body.tasks.length, 2);
    assert.equal(res.body.tasks[0].title, '첫번째');
    assert.equal(res.body.tasks[1].title, '두번째');
  });

  it('TC-DB-02: 공개 API 형태가 인메모리 구현과 동일하다', () => {
    const db = loadDb(':memory:');

    const names = [
      'getTasks',
      'getTask',
      'addTask',
      'updateTask',
      'deleteTask',
      'getProjects',
      'getProject',
      'addProject',
      'updateProject',
      'deleteProject',
    ];
    for (const name of names) {
      assert.equal(typeof db[name], 'function', `${name} 은 함수여야 한다`);
    }

    assert.deepEqual(db.getTasks(), []);

    const task = db.addTask({ title: 'a' });
    assert.deepEqual(Object.keys(task).sort(), [...TASK_KEYS].sort());
    assert.equal(task.description, '');
    assert.equal(task.due_date, null);
    assert.equal(task.priority, 'medium');
    assert.equal(task.status, 'todo');
    assert.equal(task.project_id, null);
    assert.deepEqual(task.tags, []); // 신규 할일은 태그 없음 (FR-TASK-08)
    assert.match(task.created_at, ISO8601);
    assert.match(task.updated_at, ISO8601);

    assert.equal(db.getTask(9999), undefined);
    assert.equal(db.getTask('abc'), undefined);
    assert.equal(db.updateTask(9999, {}), undefined);
    assert.equal(db.deleteTask(9999), false);
    assert.equal(db.deleteTask(task.id), true);

    assert.throws(() => db.addTask({}), /^Error: title 은 필수입니다\.$/);
    assert.throws(
      () => db.addProject({ name: 'p', progress: 200 }),
      /^Error: progress 는 0~100 사이 숫자여야 합니다\.$/
    );
    assert.throws(() => db.addProject({}), /^Error: name 은 필수입니다\.$/);

    const project = db.addProject({ name: 'p' });
    assert.deepEqual(Object.keys(project).sort(), [...PROJECT_KEYS].sort());
    assert.equal(project.progress, 0);
    assert.equal(project.status, 'active');
    assert.equal(project.notion_id, null);
  });

  it('TC-DB-03: 스키마 멱등 + WAL + 재로드', () => {
    const dbPath = path.join(tmpDir, 'schema.db');

    let db = loadDb(dbPath);
    db.addTask({ title: '유지될 할일' });
    require('../db').closeDatabase();

    // 같은 경로 재로드 — 스키마 재적용 예외 없음 + 데이터 유지
    db = loadDb(dbPath);
    assert.equal(db.getTasks().length, 1);

    const conn = require('../db').getDb();
    const tables = conn
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((r) => r.name)
      .sort();
    assert.deepEqual(tables, [
      'briefs',
      'calendar_events',
      'emails',
      'expectation_checkins',
      'key_results',
      'kr_snapshots',
      'objectives',
      'projects',
      'reference_materials',
      'reference_summary_steps',
      'sync_logs',
      'task_tags',
      'tasks',
    ]);

    assert.equal(conn.pragma('journal_mode', { simple: true }), 'wal');
  });

  it('TC-DB-05: 기존 파일 DB 재오픈 시 마이그레이션이 sync_logs CHECK 를 확장한다', () => {
    const dbPath = path.join(tmpDir, 'migrate.db');

    // 1) 마이그레이션 전 상태를 흉내 낸다: user_version=0 + 옛 CHECK(classify 없음)
    const Database = require('better-sqlite3');
    const seed = new Database(dbPath);
    seed.exec(`
      CREATE TABLE sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service TEXT NOT NULL CHECK (service IN ('gmail','calendar','notion','supabase')),
        status  TEXT NOT NULL CHECK (status IN ('success','failed')),
        last_sync TEXT NOT NULL,
        error_message TEXT
      );
      INSERT INTO sync_logs (service, status, last_sync) VALUES ('gmail','success','2026-01-01T00:00:00Z');
    `);
    seed.close();

    // 2) 앱 커넥션으로 재오픈 → applyMigrations 가 CHECK 를 확장해야 한다
    const db = loadDb(dbPath);
    const conn = require('../db').getDb();
    // v1(sync_logs CHECK)·v2(key_results.kind) 를 순서대로 모두 적용 → SCHEMA_VERSION(2)
    assert.equal(conn.pragma('user_version', { simple: true }), 2);

    // 기존 행 보존
    const rows = conn.prepare('SELECT service, status FROM sync_logs').all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].service, 'gmail');

    // 이제 classify 를 넣을 수 있다
    conn
      .prepare("INSERT INTO sync_logs (service, status, last_sync) VALUES ('classify','success',?)")
      .run(new Date().toISOString());
    assert.ok(db.SYNC_SERVICES.includes('classify'));

    require('../db').closeDatabase();
  });

  it('TC-DB-05b: 마이그레이션 백업본이 WAL 사이드카의 행까지 온전히 담는다', () => {
    const dbPath = path.join(tmpDir, 'migrate-wal.db');
    const Database = require('better-sqlite3');

    // 구 CHECK 스키마 + 행을 WAL 에만 남긴다 (autocheckpoint 0, 커넥션 유지).
    const seed = new Database(dbPath);
    seed.pragma('journal_mode = WAL');
    seed.pragma('wal_autocheckpoint = 0');
    seed.exec(`
      CREATE TABLE sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service TEXT NOT NULL CHECK (service IN ('gmail','calendar','notion','supabase')),
        status  TEXT NOT NULL CHECK (status IN ('success','failed')),
        last_sync TEXT NOT NULL,
        error_message TEXT
      );
      INSERT INTO sync_logs (service, status, last_sync) VALUES ('gmail','success','2026-01-01T00:00:00Z');
    `);
    // 메인 파일이 아직 비어 있고 -wal 에 내용이 있음을 확인
    assert.ok(fs.existsSync(`${dbPath}-wal`), '-wal 사이드카가 있어야 한다');
    assert.ok(fs.statSync(`${dbPath}-wal`).size > 0, '-wal 에 아직 반영 안 된 프레임이 있어야 한다');

    try {
      // 앱 커넥션으로 재오픈 → applyMigrations 가 백업(체크포인트 포함) 후 DROP TABLE
      loadDb(dbPath);
      require('../db').closeDatabase();

      const baks = fs
        .readdirSync(tmpDir)
        .filter((f) => f.startsWith('migrate-wal.db.bak-'));
      assert.equal(baks.length, 1, '백업본이 정확히 1개 생겨야 한다');

      // 백업본을 열어 마이그레이션 전 행이 그대로 있는지 확인
      const backup = new Database(path.join(tmpDir, baks[0]), { readonly: true });
      const cnt = backup.prepare('SELECT count(*) AS c FROM sync_logs').get().c;
      backup.close();
      assert.equal(cnt, 1, 'WAL 에만 있던 sync_logs 행이 백업본에 담겨야 한다');
    } finally {
      seed.close();
    }
  });

  it('TC-DB-05c: 신규 파일 DB 는 백업본을 만들지 않는다', () => {
    const dbPath = path.join(tmpDir, 'brandnew.db');
    assert.ok(!fs.existsSync(dbPath), '사전 조건: 파일이 없어야 한다');

    loadDb(dbPath);
    require('../db').closeDatabase();

    const baks = fs.readdirSync(tmpDir).filter((f) => f.startsWith('brandnew.db.bak-'));
    assert.equal(baks.length, 0, '신규 DB 는 .bak-* 를 만들지 않는다');
  });

  it('TC-DB-06: 신규 파일 DB 재오픈 시 OKR 3테이블이 유지되고 user_version 이 2 로 상향된다', () => {
    const dbPath = path.join(tmpDir, 'okr-tables.db');

    // 1) 신규 파일 DB 를 만든다 (schema.sql 이 이미 OKR 3테이블·kind 컬럼을 포함).
    //    기존 v1 파일(kind 컬럼 없음)을 여는 마이그레이션 경로는 TC-DB-06b 가 담당한다.
    let db = loadDb(dbPath);
    db.addTask({ title: '기존 데이터' });
    let conn = require('../db').getDb();
    // v1(sync_logs CHECK)·v2(key_results.kind 컬럼 존재 가드) 가 모두 적용된다.
    assert.equal(conn.pragma('user_version', { simple: true }), 2);
    require('../db').closeDatabase();

    // 2) 재오픈 — schema.sql 의 CREATE TABLE IF NOT EXISTS 가 신규 테이블만 추가한다.
    db = loadDb(dbPath);
    conn = require('../db').getDb();
    const tables = conn
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((r) => r.name);
    for (const t of ['objectives', 'key_results', 'kr_snapshots']) {
      assert.ok(tables.includes(t), `${t} 테이블이 생성돼야 한다`);
    }
    // 이미 v2 이므로 재오픈해도 버전은 그대로 (멱등)
    assert.equal(conn.pragma('user_version', { simple: true }), 2);
    // 기존 데이터 보존
    assert.equal(db.getTasks().length, 1);

    // OKR 함수도 노출된다
    assert.equal(typeof db.getObjectives, 'function');
    assert.deepEqual(db.getObjectives(), []);

    // key_results.kind — prepared statement 왕복 + 기본값
    const objective = db.addObjective({ title: 'o', period: '2026' });
    const kr = db.addKeyResult({ objective_id: objective.id, title: 'kr', target: 10, current: 3 });
    assert.equal(kr.kind, 'committed', 'kind 미지정 시 기본값 committed');
    const krAspirational = db.addKeyResult({
      objective_id: objective.id,
      title: 'kr2',
      target: 10,
      current: 3,
      kind: 'aspirational',
    });
    assert.equal(krAspirational.kind, 'aspirational');
    const updated = db.updateKeyResult(krAspirational.id, { kind: 'committed' });
    assert.equal(updated.kind, 'committed');

    require('../db').closeDatabase();
  });

  it('TC-DB-06b: 기존 파일 DB(kind 컬럼 없음) 재오픈 시 ALTER TABLE 로 kind 가 추가된다 (duplicate column 가드)', () => {
    const dbPath = path.join(tmpDir, 'okr-kind-migration.db');

    // 1) kind 컬럼이 없는 v1 key_results 테이블을 수동으로 만든다.
    const Database = require('better-sqlite3');
    const seed = new Database(dbPath);
    seed.exec(`
      CREATE TABLE objectives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        period TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE key_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        objective_id INTEGER NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        target REAL NOT NULL,
        "current" REAL NOT NULL DEFAULT 0,
        unit TEXT,
        project_id INTEGER,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      PRAGMA user_version = 1;
    `);
    seed.close();

    // 2) 앱 커넥션으로 재오픈 → v2 마이그레이션이 kind 컬럼을 ALTER TABLE 로 추가해야 한다.
    //    (컬럼 존재 가드가 없으면 "duplicate column name: kind" 로 전체가 깨진다.)
    const db = loadDb(dbPath);
    const conn = require('../db').getDb();
    assert.equal(conn.pragma('user_version', { simple: true }), 2);
    const cols = conn.pragma('table_info(key_results)').map((c) => c.name);
    assert.ok(cols.includes('kind'), 'kind 컬럼이 ALTER TABLE 로 추가돼야 한다');

    // ALTER TABLE 직후에도 정상적으로 기본값이 채워지는지 확인
    const objective = db.addObjective({ title: 'o', period: '2026' });
    const kr = db.addKeyResult({ objective_id: objective.id, title: 'x', target: 1 });
    assert.equal(kr.kind, 'committed');

    require('../db').closeDatabase();
  });

  it('TC-DB-07: 기대정렬 체크인(expectation_checkins) prepared statement 왕복 + action 인용 + FK NULL', () => {
    const db = loadDb(':memory:');

    // action 은 SQLite 키워드 — insert/select 왕복 후 응답 키가 action 이어야 한다.
    const checkin = db.addCheckin({ what: '뭔가 했다.', action: '구체적으로 이렇게 했다.' });
    assert.equal(checkin.action, '구체적으로 이렇게 했다.');
    assert.deepEqual(
      Object.keys(checkin).sort(),
      [
        'id', 'period', 'what', 'why', 'until', 'goal', 'strategy', 'action', 'status',
        'project_id', 'objective_id', 'created_at', 'updated_at',
      ].sort()
    );

    const fetched = db.getCheckin(checkin.id);
    assert.equal(fetched.action, '구체적으로 이렇게 했다.');

    const updated = db.updateCheckin(checkin.id, { action: '수정된 액션' });
    assert.equal(updated.action, '수정된 액션');

    // 프로젝트/objective 삭제 시 체크인은 생존하고 FK 는 NULL 이 된다.
    const project = db.addProject({ name: 'p' });
    const objective = db.addObjective({ title: 'o', period: '2026' });
    const linked = db.addCheckin({ what: 'x', project_id: project.id, objective_id: objective.id });
    db.deleteProject(project.id);
    db.deleteObjective(objective.id);
    const survived = db.getCheckin(linked.id);
    assert.ok(survived, '체크인은 삭제되지 않는다');
    assert.equal(survived.project_id, null);
    assert.equal(survived.objective_id, null);

    assert.equal(db.deleteCheckin(checkin.id), true);
    assert.equal(db.getCheckin(checkin.id), undefined);
    assert.equal(db.deleteCheckin(9999), false);

    require('../db').closeDatabase();
  });

  it('TC-DB-08a: user 태그가 있는 할일에 agent 태그 INSERT 는 트리거가 조용히 무시한다', () => {
    const db = loadDb(':memory:');
    const conn = require('../db').getDb();
    const task = db.addTask({ title: '사용자 태그 보호' });

    conn
      .prepare("INSERT INTO task_tags (task_id, tag, source, created_at) VALUES (?, ?, 'user', ?)")
      .run(task.id, '수동', new Date().toISOString());

    let caught;
    let info;
    try {
      info = conn
        .prepare("INSERT INTO task_tags (task_id, tag, source, created_at) VALUES (?, ?, 'agent', ?)")
        .run(task.id, '업무', new Date().toISOString());
    } catch (e) {
      caught = e;
    }
    assert.equal(caught, undefined, '트리거는 예외를 던지지 않아야 한다');
    assert.equal(info.changes, 0);

    const rows = conn.prepare('SELECT tag, source FROM task_tags WHERE task_id = ?').all(task.id);
    assert.deepEqual(rows, [{ tag: '수동', source: 'user' }]);
    require('../db').closeDatabase();
  });

  it('TC-DB-08b: 태그 0개인 할일에는 agent 태그 INSERT 가 정상 반영된다', () => {
    const db = loadDb(':memory:');
    const conn = require('../db').getDb();
    const task = db.addTask({ title: '태그 없음' });

    const info = conn
      .prepare("INSERT INTO task_tags (task_id, tag, source, created_at) VALUES (?, ?, 'agent', ?)")
      .run(task.id, '업무', new Date().toISOString());
    assert.equal(info.changes, 1);
    require('../db').closeDatabase();
  });

  it('TC-DB-08c: agent 태그가 있는 할일에는 agent/user 태그 추가 모두 허용된다', () => {
    const db = loadDb(':memory:');
    const conn = require('../db').getDb();
    const task = db.addTask({ title: 'agent 태그 존재' });
    const now = new Date().toISOString();

    conn
      .prepare("INSERT INTO task_tags (task_id, tag, source, created_at) VALUES (?, ?, 'agent', ?)")
      .run(task.id, '업무', now);

    const infoAgent = conn
      .prepare("INSERT INTO task_tags (task_id, tag, source, created_at) VALUES (?, ?, 'agent', ?)")
      .run(task.id, '개인', now);
    assert.equal(infoAgent.changes, 1, '다른 agent 태그 추가는 허용된다');

    const infoUser = conn
      .prepare("INSERT INTO task_tags (task_id, tag, source, created_at) VALUES (?, ?, 'user', ?)")
      .run(task.id, '수동', now);
    assert.equal(infoUser.changes, 1, 'user 태그 추가는 방향 제한이 없다');

    require('../db').closeDatabase();
  });

  it('TC-DB-08d: 트리거가 존재하고 재오픈해도 멱등하며 user_version 은 2 그대로다', () => {
    const dbPath = path.join(tmpDir, 'trigger-idempotent.db');

    let db = loadDb(dbPath);
    let conn = require('../db').getDb();
    const triggers = conn
      .prepare("SELECT name FROM sqlite_master WHERE type = 'trigger'")
      .all()
      .map((r) => r.name);
    assert.ok(triggers.includes('trg_task_tags_agent_no_override'));
    require('../db').closeDatabase();

    // 같은 파일 DB 재오픈 — 트리거 재생성(IF NOT EXISTS)이 예외 없이 통과해야 한다.
    let caught;
    try {
      db = loadDb(dbPath);
      conn = require('../db').getDb();
    } catch (e) {
      caught = e;
    }
    assert.equal(caught, undefined, '재오픈 시 예외가 없어야 한다');
    assert.equal(conn.pragma('user_version', { simple: true }), 2);
    require('../db').closeDatabase();
  });

  it('TC-DB-04c: CHECK 위반은 SqliteError(code=SQLITE_CONSTRAINT_CHECK) 로 던진다', () => {
    const db = loadDb(':memory:');
    let caught;
    try {
      db.addTask({ title: 'a', priority: 'x' });
    } catch (e) {
      caught = e;
    }
    assert.ok(caught, 'addTask 는 throw 해야 한다');
    assert.equal(caught.code, 'SQLITE_CONSTRAINT_CHECK');
  });

  it('TC-DB-04d: 없는 project_id 로 addTask 하면 FK 위반으로 던진다', () => {
    const db = loadDb(':memory:');
    let caught;
    try {
      db.addTask({ title: 'a', project_id: 9999 });
    } catch (e) {
      caught = e;
    }
    assert.ok(caught, 'addTask 는 throw 해야 한다');
    assert.equal(caught.code, 'SQLITE_CONSTRAINT_FOREIGNKEY');
  });
});
