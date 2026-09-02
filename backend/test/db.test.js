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
      'projects',
      'sync_logs',
      'tasks',
    ]);

    assert.equal(conn.pragma('journal_mode', { simple: true }), 'wal');
  });
});
