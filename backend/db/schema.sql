-- my-setup-proj 로컬 데이터베이스 스키마 (SQLite)
--
-- 이 파일이 DB 구조의 **단일 원천(single source of truth)** 이다.
-- 문서(ARCHITECTURE.md, DESIGN.md, DATA_DICTIONARY.md)는 DDL 을 복사하지 말고 이 파일을 참조한다.
--
-- 적용: 백엔드 부팅 시 이 스크립트를 그대로 실행한다 (CREATE TABLE IF NOT EXISTS).
-- 날짜/시간 컬럼은 모두 TEXT + ISO8601 (예: '2026-09-02T08:00:00Z', 날짜만이면 '2026-09-02').
-- Week 10+ Supabase 동기화 시 user_id / is_synced / synced_at 컬럼을 추가한다 (아래 주석 참조).

PRAGMA foreign_keys = ON;

-- ── 할일 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  due_date    TEXT,                                    -- 'YYYY-MM-DD', NULL 허용
  priority    TEXT    NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  status      TEXT    NOT NULL DEFAULT 'todo'   CHECK (status IN ('todo','in_progress','done')),
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_due    ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

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
  service       TEXT NOT NULL CHECK (service IN ('gmail','calendar','notion','supabase')),
  status        TEXT NOT NULL CHECK (status IN ('success','failed')),
  last_sync     TEXT NOT NULL,                         -- 이 시도의 시각 (ISO8601)
  error_message TEXT                                   -- status='failed' 일 때만 채움
);
CREATE INDEX IF NOT EXISTS idx_sync_service ON sync_logs(service, last_sync);

-- ── (향후) Supabase 동기화용 확장 ──────────────────────
-- ALTER TABLE tasks    ADD COLUMN user_id    TEXT;
-- ALTER TABLE tasks    ADD COLUMN is_synced  INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE tasks    ADD COLUMN synced_at  TEXT;
-- (projects 등 동기화 대상 테이블에 동일 적용)
