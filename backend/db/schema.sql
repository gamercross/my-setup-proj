-- my-setup-proj 로컬 데이터베이스 스키마 (SQLite)
--
-- 이 파일이 DB 구조의 **단일 원천(single source of truth)** 이다.
-- 문서(ARCHITECTURE.md, DESIGN.md, DATA_DICTIONARY.md)는 DDL 을 복사하지 말고 이 파일을 참조한다.
--
-- 적용: 백엔드 부팅 시 이 스크립트를 그대로 실행한다 (CREATE TABLE IF NOT EXISTS).
--   경로는 환경변수 DATABASE_PATH (기본 backend/data/app.db) — ADR-0009.
--   부팅 시 PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; 을 함께 설정한다 — ADR-0011.
-- 날짜/시간 컬럼은 모두 TEXT + ISO8601 (예: '2026-09-02T08:00:00Z', 날짜만이면 '2026-09-02').
-- Week 10+ Supabase 동기화 시 user_id / is_synced / synced_at 컬럼을 추가한다 (아래 주석 참조).

PRAGMA foreign_keys = ON;

-- ── 프로젝트 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  notion_id  TEXT,                                     -- Notion page/database id, NULL 허용
  progress   INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status     TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','done','on_hold')),
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_notion ON projects(notion_id);

-- ── 할일 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  due_date    TEXT,                                    -- 'YYYY-MM-DD', NULL 허용
  priority    TEXT    NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  status      TEXT    NOT NULL DEFAULT 'todo'   CHECK (status IN ('todo','in_progress','done')),
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,  -- NULL = 단독 할일 (ADR-0012)
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_due     ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status  ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);

-- ── 할일 태그 (T2 자동 분류 — ADR-0029) ────────────────
-- 자유 문자열 태그·다중. source: 'user' 수동, 'agent' 에이전트 배치 분류.
-- tasks.category 컬럼은 만들지 않는다 (폐기 — ADR-0029).
CREATE TABLE IF NOT EXISTS task_tags (
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag        TEXT    NOT NULL,
  source     TEXT    NOT NULL CHECK (source IN ('user','agent')),
  created_at TEXT    NOT NULL,
  PRIMARY KEY (task_id, tag)
);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag);

-- ── 캘린더 일정 (Google Calendar 캐시) ──────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id   TEXT    UNIQUE,                           -- Google event id (upsert 키)
  title      TEXT,
  start_time TEXT,                                     -- ISO8601
  end_time   TEXT,                                     -- ISO8601
  location   TEXT,
  synced_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_start ON calendar_events(start_time);

-- ── 이메일 (Gmail 미읽은 메일 캐시) ─────────────────────
CREATE TABLE IF NOT EXISTS emails (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id     TEXT    UNIQUE,                         -- Gmail message id (upsert 키)
  from_address TEXT,
  subject      TEXT,
  snippet      TEXT,
  received_at  TEXT,                                   -- ISO8601
  is_read      INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0,1)),
  synced_at    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_emails_received ON emails(received_at);

-- ── 일일 브리핑 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS briefs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date       TEXT    NOT NULL,                         -- 'YYYY-MM-DD' (하루 1건 권장)
  content    TEXT    NOT NULL,                         -- Claude 가 생성한 브리핑 본문
  notion_url TEXT,                                     -- Notion 에 저장된 페이지 URL, NULL 허용
  created_at TEXT    NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_briefs_date ON briefs(date);

-- ── 동기화 로그 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  service       TEXT NOT NULL CHECK (service IN ('gmail','calendar','notion','supabase','classify')),
  status        TEXT NOT NULL CHECK (status IN ('success','failed')),
  last_sync     TEXT NOT NULL,                         -- 이 시도의 시각 (ISO8601)
  error_message TEXT                                   -- status='failed' 일 때만 채움
);
CREATE INDEX IF NOT EXISTS idx_sync_service ON sync_logs(service, last_sync);

-- ── OKR: 목표(Objective) ───────────────────────────────
-- 사용자가 앱에서 CRUD 한다. 에이전트는 손대지 않는다 (FR-OKR-01).
CREATE TABLE IF NOT EXISTS objectives (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  period     TEXT    NOT NULL,                          -- 'YYYY' | 'YYYY-Q[1-4]'
  status     TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','done','archived')),
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(status);

-- ── OKR: 핵심 결과(Key Result) ─────────────────────────
CREATE TABLE IF NOT EXISTS key_results (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  objective_id INTEGER NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  title        TEXT    NOT NULL,
  target       REAL    NOT NULL,
  "current"    REAL    NOT NULL DEFAULT 0,              -- SQL 예약어라 항상 인용
  unit         TEXT,                                    -- NULL = 단위 없음
  project_id   INTEGER REFERENCES projects(id) ON DELETE SET NULL,  -- 느슨 FK (ADR-0012)
  created_at   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_key_results_objective ON key_results(objective_id);
CREATE INDEX IF NOT EXISTS idx_key_results_project   ON key_results(project_id);

-- ── OKR: 월별 달성률 스냅샷 ────────────────────────────
-- 백엔드가 월 1회 각 KR 의 그 시점 pct 를 UPSERT 한다 (FR-OKR-04).
CREATE TABLE IF NOT EXISTS kr_snapshots (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  key_result_id INTEGER NOT NULL REFERENCES key_results(id) ON DELETE CASCADE,
  month         TEXT    NOT NULL,                       -- 'YYYY-MM'
  pct           REAL    NOT NULL,                       -- 0~1
  UNIQUE (key_result_id, month)
);

-- ── (향후) Supabase 동기화용 확장 ──────────────────────
-- ALTER TABLE tasks    ADD COLUMN user_id    TEXT;
-- ALTER TABLE tasks    ADD COLUMN is_synced  INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE tasks    ADD COLUMN synced_at  TEXT;
-- (projects 등 동기화 대상 테이블에 동일 적용)

-- ── (제안, C5 단계 2) 위젯 레이아웃 — 대시보드 OS ──────
-- UI 상태다. 1차는 SQLite 가 아니라 브라우저 localStorage('dashboard.layout.v1').
-- 재설치·다기기 요구가 생기면 아래 테이블로 이관한다 (ADR-0021). 지금은 미적용.
-- CREATE TABLE IF NOT EXISTS widget_instances (
--   id          INTEGER PRIMARY KEY AUTOINCREMENT,
--   widget_type TEXT    NOT NULL,   -- 'tasks'|'projects'|'calendar'|'emails'|'brief'|'diagrams'
--   x INTEGER NOT NULL, y INTEGER NOT NULL, w INTEGER NOT NULL, h INTEGER NOT NULL,
--   z INTEGER NOT NULL DEFAULT 0,
--   minimized   INTEGER NOT NULL DEFAULT 0 CHECK (minimized IN (0,1)),
--   config      TEXT    NOT NULL DEFAULT '{}',  -- JSON: { theme:{...}, display:{...} } (화이트리스트 키만, ADR-0022)
--   created_at  TEXT    NOT NULL,
--   updated_at  TEXT    NOT NULL
-- );
