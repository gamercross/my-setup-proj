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

-- 사용자 태그 비침범 불변식 (ADR-0029 PO-3, FR-TASK-08 AC-4) — REVERSE_PLAN §4-5 S3.
-- 이미 source='user' 태그가 붙은 할일에는 source='agent' INSERT 를 조용히 무시한다.
-- RAISE(IGNORE) 인 이유: 에이전트 배치(agent/db.py:add_agent_tags)가 무효 INSERT 한 건 때문에
--   예외로 죽지 않게 한다. 단일 행 INSERT 만 쓰는 현재 전제 — INSERT..SELECT 로 바꾸면
--   첫 위반에서 나머지 행도 포기되므로 주의.
-- 애플리케이션 가드(add_agent_tags 태그 0개 조건 · classify.py 환각 id 방어 ·
--   get_untagged_tasks 의 NOT EXISTS)를 대체하지 않고 이중화한다.
CREATE TRIGGER IF NOT EXISTS trg_task_tags_agent_no_override
BEFORE INSERT ON task_tags
FOR EACH ROW
WHEN NEW.source = 'agent'
 AND EXISTS (
   SELECT 1 FROM task_tags t WHERE t.task_id = NEW.task_id AND t.source = 'user'
 )
BEGIN
  SELECT RAISE(IGNORE);
END;

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
  kind TEXT NOT NULL DEFAULT 'committed' CHECK (kind IN ('committed','aspirational')),  -- 구글 OKR 유형 (ADR-0034)
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

-- ── 기대정렬 체크인 (개인 OS P10 — ADR-0035) ───────────
-- 7개 질문 답변은 전부 자유 서술 TEXT·nullable. 최소 1개는 채워야 한다(API 검증).
CREATE TABLE IF NOT EXISTS expectation_checkins (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  period       TEXT,     -- 자유 라벨 '1주차' 등. 날짜 강제 안 함 (종료 조건이 상태 기반)
  what         TEXT,     -- 내가 뭘 하고 있지
  why          TEXT,     -- 이걸 왜 하지
  until        TEXT,     -- 언제까지 할 것인지
  goal         TEXT,     -- 어떤 목표지
  strategy     TEXT,     -- 어떤 전략이지
  "action"     TEXT,     -- 무엇을 구체적으로 할 것인지 (SQLite 키워드라 항상 인용)
  status       TEXT,     -- 어떤 상태인지 — 자유 서술. 다른 테이블의 enum status 와 무관 (CHECK 없음)
  project_id   INTEGER REFERENCES projects(id)   ON DELETE SET NULL,
  objective_id INTEGER REFERENCES objectives(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_checkins_created   ON expectation_checkins(created_at);
CREATE INDEX IF NOT EXISTS idx_checkins_project   ON expectation_checkins(project_id);
CREATE INDEX IF NOT EXISTS idx_checkins_objective ON expectation_checkins(objective_id);

-- ── 레퍼런스 자료 (개인 OS P12 — ADR-0037) ─────────────
-- 테이블명은 reference_materials (REFERENCES 는 SQLite 예약어라 회피).
-- API 경로·JSON 키는 'references'/'reference' 를 그대로 쓴다 (ADR-0037 §불일치 명시).
CREATE TABLE IF NOT EXISTS reference_materials (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  category   TEXT,
  location   TEXT,
  due_date   TEXT,
  status     TEXT    NOT NULL DEFAULT 'todo'
             CHECK (status IN ('todo','reading','summarizing','done')),
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_refs_due      ON reference_materials(due_date);
CREATE INDEX IF NOT EXISTS idx_refs_status   ON reference_materials(status);
CREATE INDEX IF NOT EXISTS idx_refs_category ON reference_materials(category);
CREATE INDEX IF NOT EXISTS idx_refs_project  ON reference_materials(project_id);

-- ── 레퍼런스 요약 절차 이력 (수정 없음, 추가·삭제만) ────
-- step_order 는 삭제 후에도 재번호를 매기지 않는다 (이력 보존).
CREATE TABLE IF NOT EXISTS reference_summary_steps (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_id INTEGER NOT NULL REFERENCES reference_materials(id) ON DELETE CASCADE,
  step_order   INTEGER NOT NULL,
  note         TEXT    NOT NULL,
  created_at   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ref_steps_ref ON reference_summary_steps(reference_id, step_order);

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
