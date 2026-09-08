// 데이터 접근 계층 (better-sqlite3) — ADR-0002, ADR-0009, ADR-0011
//
// 공개 API 는 Week 1 인메모리 구현과 완전히 동일하다 (라우트/응답 형태 불변).
// 실제 커넥션·스키마·PRAGMA 는 backend/db/index.js 가 담당한다.
//
// 주의: 여기서 require('../db') 는 backend/db/index.js (커넥션 계층) 다.
//       라우트가 require('../db') 하면 이 파일이다.
const { getDb } = require('../db');

const db = getDb();

// 응답 키 순서까지 인메모리 구현과 동일하게 맞춘다. SELECT * 금지.
// tasks 는 project_id 를 응답에 노출한다 (ADR-0012, NULL = 단독 할일).
const TASK_COLS =
  'id, title, description, due_date, priority, status, project_id, created_at, updated_at';
const PROJECT_COLS = 'id, name, progress, status, notion_id, created_at, updated_at';
// calendar_events·emails 는 에이전트가 채우는 캐시 — 백엔드는 SELECT 만 한다 (ADR-0011).
const EVENT_COLS = 'id, event_id, title, start_time, end_time, location, synced_at';
const EMAIL_COLS =
  'id, email_id, from_address, subject, snippet, received_at, is_read, synced_at';

// 병합 허용 필드 (라우트의 isValidationError 정규식이 오류 메시지에 의존하므로 문자열 불변)
const TASK_FIELDS = ['title', 'description', 'due_date', 'priority', 'status', 'project_id'];
const PROJECT_FIELDS = ['name', 'progress', 'status', 'notion_id'];

// ── OKR (objectives / key_results / kr_snapshots) ─────────────────────────────
// key_results.current 는 SQLite 예약어라 DDL·SQL 에서 항상 "current" 로 인용한다.
// SELECT 는 "current" AS current 로 되돌려 응답 키는 current 를 유지한다 (P8 주의점 1).
const OBJECTIVE_COLS = 'id, title, period, status, created_at, updated_at';
const KR_COLS =
  'id, objective_id, title, target, "current" AS current, unit, project_id, created_at, updated_at';
const OBJECTIVE_FIELDS = ['title', 'period', 'status'];
const KR_FIELDS = ['title', 'target', 'current', 'unit', 'project_id'];

// prepared statement 는 모듈 로드 시 준비한다.
const stmts = {
  listTasks: db.prepare(`SELECT ${TASK_COLS} FROM tasks ORDER BY id`),
  listTasksByProject: db.prepare(
    `SELECT ${TASK_COLS} FROM tasks WHERE project_id = ? ORDER BY id`
  ),
  listTasksNoProject: db.prepare(
    `SELECT ${TASK_COLS} FROM tasks WHERE project_id IS NULL ORDER BY id`
  ),
  getTask: db.prepare(`SELECT ${TASK_COLS} FROM tasks WHERE id = ?`),

  // task_tags — 응답에 source 는 싣지 않는다 (tag 만 노출). JOIN/GROUP_CONCAT 대신 JS 조인.
  listAllTags: db.prepare('SELECT task_id, tag FROM task_tags ORDER BY task_id, tag'),
  listTagsForTask: db.prepare(
    'SELECT tag FROM task_tags WHERE task_id = ? ORDER BY tag'
  ),
  insertUserTag: db.prepare(
    `INSERT OR IGNORE INTO task_tags (task_id, tag, source, created_at)
     VALUES (@task_id, @tag, 'user', @created_at)`
  ),
  deleteTag: db.prepare('DELETE FROM task_tags WHERE task_id = ? AND tag = ?'),
  insertTask: db.prepare(
    `INSERT INTO tasks (title, description, due_date, priority, status, project_id, created_at, updated_at)
     VALUES (@title, @description, @due_date, @priority, @status, @project_id, @created_at, @updated_at)`
  ),
  updateTask: db.prepare(
    `UPDATE tasks SET title = @title, description = @description, due_date = @due_date,
       priority = @priority, status = @status, project_id = @project_id, updated_at = @updated_at
     WHERE id = @id`
  ),
  deleteTask: db.prepare('DELETE FROM tasks WHERE id = ?'),

  listProjects: db.prepare(`SELECT ${PROJECT_COLS} FROM projects ORDER BY id`),
  getProject: db.prepare(`SELECT ${PROJECT_COLS} FROM projects WHERE id = ?`),
  insertProject: db.prepare(
    `INSERT INTO projects (name, progress, status, notion_id, created_at, updated_at)
     VALUES (@name, @progress, @status, @notion_id, @created_at, @updated_at)`
  ),
  updateProject: db.prepare(
    `UPDATE projects SET name = @name, progress = @progress, status = @status,
       notion_id = @notion_id, updated_at = @updated_at
     WHERE id = @id`
  ),
  deleteProject: db.prepare('DELETE FROM projects WHERE id = ?'),

  // sync_logs 는 에이전트가 소유 — 백엔드는 SELECT(읽기 전용)만 한다.
  listSyncLogs: db.prepare(
    `SELECT id, service, status, last_sync, error_message FROM sync_logs
     ORDER BY id DESC LIMIT @limit`
  ),
  listSyncLogsByService: db.prepare(
    `SELECT id, service, status, last_sync, error_message FROM sync_logs
     WHERE service = @service ORDER BY id DESC LIMIT @limit`
  ),

  // briefs 는 에이전트 소유 — 백엔드는 SELECT 만 한다 (ADR-0011).
  getBriefByDate: db.prepare(
    'SELECT id, date, content, notion_url, created_at FROM briefs WHERE date = ?'
  ),

  // calendar_events — 에이전트가 채우는 캐시. 백엔드는 SELECT 만 (ADR-0011).
  // start_time 이 NULL 인 항목(시간 미정)은 항상 포함하고 정렬에서 맨 뒤로 보낸다.
  listEvents: db.prepare(
    `SELECT ${EVENT_COLS} FROM calendar_events
     ORDER BY (start_time IS NULL), start_time, id`
  ),

  // emails — 에이전트가 채우는 미읽음 캐시. 백엔드는 SELECT 만 (ADR-0011).
  listUnreadEmails: db.prepare(
    `SELECT ${EMAIL_COLS} FROM emails
     WHERE is_read = 0
     ORDER BY (received_at IS NULL), received_at DESC, id DESC
     LIMIT @limit`
  ),

  // ── OKR ──────────────────────────────
  listObjectives: db.prepare(`SELECT ${OBJECTIVE_COLS} FROM objectives ORDER BY id`),
  listObjectivesActive: db.prepare(
    `SELECT ${OBJECTIVE_COLS} FROM objectives WHERE status <> 'archived' ORDER BY id`
  ),
  getObjective: db.prepare(`SELECT ${OBJECTIVE_COLS} FROM objectives WHERE id = ?`),
  insertObjective: db.prepare(
    `INSERT INTO objectives (title, period, status, created_at, updated_at)
     VALUES (@title, @period, @status, @created_at, @updated_at)`
  ),
  updateObjective: db.prepare(
    `UPDATE objectives SET title = @title, period = @period, status = @status,
       updated_at = @updated_at
     WHERE id = @id`
  ),
  deleteObjective: db.prepare('DELETE FROM objectives WHERE id = ?'),

  listKeyResults: db.prepare(
    `SELECT ${KR_COLS} FROM key_results ORDER BY objective_id, id`
  ),
  getKeyResult: db.prepare(`SELECT ${KR_COLS} FROM key_results WHERE id = ?`),
  insertKeyResult: db.prepare(
    `INSERT INTO key_results (objective_id, title, target, "current", unit, project_id, created_at, updated_at)
     VALUES (@objective_id, @title, @target, @current, @unit, @project_id, @created_at, @updated_at)`
  ),
  updateKeyResult: db.prepare(
    `UPDATE key_results SET title = @title, target = @target, "current" = @current,
       unit = @unit, project_id = @project_id, updated_at = @updated_at
     WHERE id = @id`
  ),
  deleteKeyResult: db.prepare('DELETE FROM key_results WHERE id = ?'),

  upsertSnapshot: db.prepare(
    `INSERT INTO kr_snapshots (key_result_id, month, pct)
     VALUES (@key_result_id, @month, @pct)
     ON CONFLICT(key_result_id, month) DO UPDATE SET pct = excluded.pct`
  ),
  listTrend: db.prepare(
    `SELECT month, AVG(pct) AS avg FROM kr_snapshots
     GROUP BY month ORDER BY month DESC LIMIT 12`
  ),

  // 주간 플래너 — due_date 는 [from, afterEnd) 반개구간. due_date IS NULL 은 자동 제외.
  countTasksInRange: db.prepare(
    `SELECT COUNT(*) AS total, SUM(status = 'done') AS done FROM tasks
     WHERE due_date >= @from AND due_date < @afterEnd`
  ),
  listTasksInRange: db.prepare(
    `SELECT ${TASK_COLS} FROM tasks
     WHERE due_date >= @from AND due_date < @afterEnd
     ORDER BY due_date, id LIMIT @limit`
  ),
};

// 동기화 서비스 화이트리스트 (schema.sql 의 CHECK 와 일치)
const SYNC_SERVICES = ['gmail', 'calendar', 'notion', 'supabase', 'classify'];

// ── 태그 부착 헬퍼 ─────────────────────────────
// task 행에 tags 배열(tag ASC)을 붙인다. getTasks/getTask/addTask/updateTask
// 4개 반환 경로 모두 이 헬퍼를 통과시킨다.
function attachTags(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const map = new Map();
  for (const { task_id, tag } of stmts.listAllTags.all()) {
    if (!map.has(task_id)) map.set(task_id, []);
    map.get(task_id).push(tag);
  }
  for (const row of rows) {
    row.tags = map.get(row.id) || [];
  }
  return rows;
}

function attachTagsOne(row) {
  if (!row) return row;
  row.tags = stmts.listTagsForTask.all(row.id).map((r) => r.tag);
  return row;
}

// id 를 정수로 정규화한다. 정수가 아니면 null (NaN 바인딩 시 500 방지).
function toId(id) {
  const n = Number(id);
  return Number.isInteger(n) ? n : null;
}

// ── 할일(tasks) ─────────────────────────────

// 할일 목록 조회 (생성 순서).
// filter.projectId: 정수면 그 프로젝트, null 이면 단독 할일(project_id IS NULL),
// undefined 면 전체 (FR-TASK-06).
function getTasks(filter = {}) {
  if (filter.projectId === null) {
    return attachTags(stmts.listTasksNoProject.all());
  }
  if (filter.projectId !== undefined) {
    const nid = toId(filter.projectId);
    if (nid === null) return [];
    return attachTags(stmts.listTasksByProject.all(nid));
  }
  return attachTags(stmts.listTasks.all());
}

// 할일 단건 조회 (없으면 undefined)
function getTask(id) {
  const nid = toId(id);
  if (nid === null) return undefined;
  return attachTagsOne(stmts.getTask.get(nid));
}

// 할일 추가
function addTask(task) {
  if (!task || !task.title) {
    throw new Error('title 은 필수입니다.');
  }
  const now = new Date().toISOString();
  const row = {
    title: task.title,
    description: task.description || '',
    due_date: task.due_date || null,
    priority: task.priority || 'medium',
    status: task.status || 'todo',
    project_id: task.project_id ?? null,
    created_at: now,
    updated_at: now,
  };
  const info = stmts.insertTask.run(row);
  return getTask(info.lastInsertRowid);
}

// 할일 수정 (없으면 undefined, 허용 필드만 병합)
function updateTask(id, patch) {
  const row = getTask(id);
  if (!row) return undefined;
  for (const key of TASK_FIELDS) {
    if (patch && patch[key] !== undefined) {
      row[key] = patch[key];
    }
  }
  row.updated_at = new Date().toISOString();
  stmts.updateTask.run(row);
  return getTask(row.id);
}

// 할일 삭제 (삭제 성공 여부 boolean 반환)
function deleteTask(id) {
  const nid = toId(id);
  if (nid === null) return false;
  return stmts.deleteTask.run(nid).changes > 0;
}

// ── 할일 태그(task_tags) ─────────────────────────────

// 수동 태그 추가 (source='user'). 멱등: 이미 있으면 INSERT OR IGNORE.
// 갱신된 task 행(tags 포함)을 반환한다 (없는 id 면 undefined).
function addTaskTag(id, tag) {
  const nid = toId(id);
  if (nid === null) return undefined;
  stmts.insertUserTag.run({ task_id: nid, tag, created_at: new Date().toISOString() });
  return getTask(nid);
}

// 태그 삭제. source 무관하게 (task_id, tag) 로 지운다.
// 삭제 성공 여부 boolean 반환 (없던 태그면 false — 라우트에서 멱등 처리).
function removeTaskTag(id, tag) {
  const nid = toId(id);
  if (nid === null) return false;
  return stmts.deleteTag.run(nid, tag).changes > 0;
}

// ── 프로젝트(projects) ─────────────────────────────

// 진행도 값 검증 (0~100)
function assertProgress(v) {
  if (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 100) {
    throw new Error('progress 는 0~100 사이 숫자여야 합니다.');
  }
}

// 프로젝트 목록 조회 (생성 순서)
function getProjects() {
  return stmts.listProjects.all();
}

// 프로젝트 단건 조회 (없으면 undefined)
function getProject(id) {
  const nid = toId(id);
  if (nid === null) return undefined;
  return stmts.getProject.get(nid);
}

// 프로젝트 추가
function addProject(p) {
  if (!p || !p.name) {
    throw new Error('name 은 필수입니다.');
  }
  const progress = p.progress === undefined ? 0 : p.progress;
  assertProgress(progress);
  const now = new Date().toISOString();
  const row = {
    name: p.name,
    progress,
    status: p.status || 'active',
    notion_id: p.notion_id || null,
    created_at: now,
    updated_at: now,
  };
  const info = stmts.insertProject.run(row);
  return getProject(info.lastInsertRowid);
}

// 프로젝트 수정 (없으면 undefined, 허용 필드만 병합)
// 존재 확인 → progress 검증 순서 유지 (TC-PROJ-04).
function updateProject(id, patch) {
  const row = getProject(id);
  if (!row) return undefined;
  for (const key of PROJECT_FIELDS) {
    if (patch && patch[key] !== undefined) {
      if (key === 'progress') assertProgress(patch.progress);
      row[key] = patch[key];
    }
  }
  row.updated_at = new Date().toISOString();
  stmts.updateProject.run(row);
  return getProject(row.id);
}

// 프로젝트 삭제 (삭제 성공 여부 boolean 반환)
function deleteProject(id) {
  const nid = toId(id);
  if (nid === null) return false;
  return stmts.deleteProject.run(nid).changes > 0;
}

// ── 동기화 로그(sync_logs) — 읽기 전용 ─────────────────────────────

// 동기화 이력 조회 (최신 순). service 미지정이면 전체, limit 기본 50.
function getSyncLogs({ service, limit } = {}) {
  const lim = Number.isInteger(limit) && limit > 0 ? limit : 50;
  if (service) {
    return stmts.listSyncLogsByService.all({ service, limit: lim });
  }
  return stmts.listSyncLogs.all({ limit: lim });
}

// ── 일일 브리핑(briefs) — 읽기 전용 ─────────────────────────────

// 특정 날짜('YYYY-MM-DD')의 브리핑 1건 조회 (없으면 undefined)
function getBriefByDate(date) {
  return stmts.getBriefByDate.get(date);
}

// ── 캘린더 일정(calendar_events) — 읽기 전용 ─────────────────────────────

// 전체 일정을 start_time 오름차순(NULL 맨 뒤)으로 반환한다.
// from/to 범위 필터·직렬화는 services/calendar.js 가 담당한다.
function getCalendarEvents() {
  return stmts.listEvents.all();
}

// ── 이메일(emails) — 읽기 전용 ─────────────────────────────

// 미읽음 메일을 received_at 내림차순으로 반환한다 (기본 50건).
function getUnreadEmails({ limit } = {}) {
  const lim = Number.isInteger(limit) && limit > 0 ? limit : 50;
  return stmts.listUnreadEmails.all({ limit: lim });
}

// ── OKR: 목표(objectives) ─────────────────────────────

// 목표 목록. includeArchived 면 전체, 아니면 archived 제외.
function getObjectives({ includeArchived } = {}) {
  return includeArchived
    ? stmts.listObjectives.all()
    : stmts.listObjectivesActive.all();
}

function getObjective(id) {
  const nid = toId(id);
  if (nid === null) return undefined;
  return stmts.getObjective.get(nid);
}

function addObjective(o) {
  const now = new Date().toISOString();
  const row = {
    title: o.title,
    period: o.period,
    status: o.status || 'active',
    created_at: now,
    updated_at: now,
  };
  const info = stmts.insertObjective.run(row);
  return getObjective(info.lastInsertRowid);
}

// 목표 수정 (없으면 undefined, 허용 필드만 병합)
function updateObjective(id, patch) {
  const row = getObjective(id);
  if (!row) return undefined;
  for (const key of OBJECTIVE_FIELDS) {
    if (patch && patch[key] !== undefined) row[key] = patch[key];
  }
  row.updated_at = new Date().toISOString();
  stmts.updateObjective.run(row);
  return getObjective(row.id);
}

function deleteObjective(id) {
  const nid = toId(id);
  if (nid === null) return false;
  return stmts.deleteObjective.run(nid).changes > 0;
}

// ── OKR: 핵심 결과(key_results) ────────────────────────

// 전체 KR (objective_id, id 순). 서비스에서 JS 그룹핑한다 (N+1 금지).
function getKeyResults() {
  return stmts.listKeyResults.all();
}

function getKeyResult(id) {
  const nid = toId(id);
  if (nid === null) return undefined;
  return stmts.getKeyResult.get(nid);
}

function addKeyResult(kr) {
  const now = new Date().toISOString();
  const row = {
    objective_id: kr.objective_id,
    title: kr.title,
    target: kr.target,
    current: kr.current === undefined ? 0 : kr.current,
    unit: kr.unit ?? null,
    project_id: kr.project_id ?? null,
    created_at: now,
    updated_at: now,
  };
  const info = stmts.insertKeyResult.run(row);
  return getKeyResult(info.lastInsertRowid);
}

function updateKeyResult(id, patch) {
  const row = getKeyResult(id);
  if (!row) return undefined;
  for (const key of KR_FIELDS) {
    if (patch && patch[key] !== undefined) row[key] = patch[key];
  }
  row.updated_at = new Date().toISOString();
  stmts.updateKeyResult.run(row);
  return getKeyResult(row.id);
}

function deleteKeyResult(id) {
  const nid = toId(id);
  if (nid === null) return false;
  return stmts.deleteKeyResult.run(nid).changes > 0;
}

// ── OKR: 월별 스냅샷(kr_snapshots) ────────────────────

// (key_result_id, month) UPSERT. 같은 달 재실행은 덮어쓰기(멱등).
function upsertKrSnapshot(key_result_id, month, pct) {
  stmts.upsertSnapshot.run({ key_result_id, month, pct });
}

// 월별 KR 평균 달성률 추이 (오름차순, 최근 12개월).
function getKrTrend() {
  return stmts.listTrend.all().reverse();
}

// db.transaction 헬퍼 노출 — 서비스가 여러 UPSERT 를 묶을 때 쓴다.
function transaction(fn) {
  return db.transaction(fn)();
}

// ── 주간 플래너 (읽기 전용 집계) ──────────────────────

// [from, to] 구간(둘 다 'YYYY-MM-DD')의 마감 할 일 통계 { total, done }.
function getTaskStatsInRange(from, to) {
  const afterEnd = addOneDay(to);
  const r = stmts.countTasksInRange.get({ from, afterEnd });
  return { total: r.total || 0, done: r.done || 0 };
}

// [from, to] 구간의 마감 할 일 목록 (due_date 오름차순, tags 부착).
function getTasksInRange(from, to, limit = 50) {
  const afterEnd = addOneDay(to);
  const lim = Number.isInteger(limit) && limit > 0 ? limit : 50;
  return attachTags(stmts.listTasksInRange.all({ from, afterEnd, limit: lim }));
}

// 'YYYY-MM-DD' → 다음 날 'YYYY-MM-DD' (반개구간 종료 경계용).
function addOneDay(dateKey) {
  const [y, m, d] = String(dateKey).split('-').map(Number);
  const dt = new Date(y, m - 1, d + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate()
  ).padStart(2, '0')}`;
}

module.exports = {
  SYNC_SERVICES,
  getObjectives,
  getObjective,
  addObjective,
  updateObjective,
  deleteObjective,
  getKeyResults,
  getKeyResult,
  addKeyResult,
  updateKeyResult,
  deleteKeyResult,
  upsertKrSnapshot,
  getKrTrend,
  transaction,
  getTaskStatsInRange,
  getTasksInRange,
  getSyncLogs,
  getBriefByDate,
  getCalendarEvents,
  getUnreadEmails,
  getTasks,
  getTask,
  addTask,
  updateTask,
  deleteTask,
  addTaskTag,
  removeTaskTag,
  getProjects,
  getProject,
  addProject,
  updateProject,
  deleteProject,
};
