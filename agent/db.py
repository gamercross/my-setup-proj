"""에이전트용 SQLite 접근 계층 (ADR-0009 / ADR-0011).

백엔드와 **같은 DB 파일**(DATABASE_PATH, 기본 backend/data/app.db)을 연다.

쓰기 주체 분리:
  - tasks / projects 는 **읽기 전용**으로만 사용한다 (백엔드가 소유).
    예외: task_tags 는 쓰기만 한다 (daily_brief 컨텍스트에서만, source='agent' — ADR-0029).
          tasks 행 자체는 여전히 UPDATE 하지 않는다.
  - briefs 는 에이전트가 date 기준으로 upsert 한다.
  - emails / calendar_events 는 **에이전트 소유**다 (백엔드는 읽기 전용 — ADR-0011).

스키마 초기화 책임은 백엔드에 있다(ADR-0011). 여기서는 파일이 비어있을 때를
대비한 방어적 멱등 실행(ensure_schema)만 제공한다.
"""

import logging
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv

# claude.py 와 동일하게 모듈 로드 시 .env 를 읽는다.
load_dotenv()

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = _ROOT / "backend" / "data" / "app.db"
SCHEMA_PATH = _ROOT / "backend" / "db" / "schema.sql"


def resolve_db_path() -> str:
    """DATABASE_PATH 를 해석한다 (backend/db/index.js:resolveDbPath 와 1:1 대응).

    트림 후 비어있지 않으면 그 값을 그대로 사용한다(':memory:' 도 통과).
    모듈 로드 시점에 캐시하지 않고 호출 시점마다 해석한다.
    """
    raw = os.environ.get("DATABASE_PATH", "").strip()
    if raw:
        return raw
    return str(DEFAULT_DB_PATH)


@contextmanager
def connect():
    """짧게 쓰고 즉시 닫는 커넥션 컨텍스트 매니저.

    커넥션 싱글턴을 만들지 않는다. PRAGMA 는 백엔드 부팅과 동일 순서로 건다.
    """
    path = resolve_db_path()

    # 파일 DB 면 상위 디렉터리를 보장한다 (':memory:' 는 건너뜀).
    if path != ":memory:":
        Path(path).parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(path, timeout=5)
    try:
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
        conn.execute("PRAGMA foreign_keys=ON")
        yield conn
    finally:
        conn.close()


def ensure_schema(conn) -> None:
    """tasks / briefs 가 없을 때에만 schema.sql 을 멱등 실행한다.

    스키마의 단일 원천은 backend/db/schema.sql 이며, 초기화 책임은 백엔드다(ADR-0011).
    여기서는 빈 파일 DB 를 대비한 방어적 실행일 뿐이다.

    주의: executescript 는 암시적 커밋을 유발하므로 다른 트랜잭션 안에서 호출하지 않는다.
    """
    rows = conn.execute(
        "SELECT name FROM sqlite_master "
        "WHERE type='table' AND name IN ('tasks','briefs')"
    ).fetchall()
    if len(rows) >= 2:
        return

    try:
        sql = SCHEMA_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        logger.warning("schema.sql 을 찾지 못함(%s) — 스키마 부트스트랩 건너뜀", SCHEMA_PATH)
        return

    conn.executescript(sql)


def get_today_tasks(date: str | None = None) -> list[dict]:
    """오늘 마감이면서 완료되지 않은 할일을 우선순위 순으로 반환한다 (읽기 전용).

    1차 구현은 오늘 날짜만 대상으로 하며 연체 할일은 포함하지 않는다.
    """
    if date is None:
        date = f"{datetime.now():%Y-%m-%d}"

    with connect() as conn:
        rows = conn.execute(
            "SELECT id, title, priority, status, due_date FROM tasks "
            "WHERE due_date = ? AND status != 'done' "
            "ORDER BY CASE priority "
            "  WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, id",
            (date,),
        ).fetchall()
    return [dict(row) for row in rows]


def get_untagged_tasks(limit: int = 30) -> list[dict]:
    """태그가 하나도 없고 완료되지 않은 할일을 반환한다 (읽기 전용, FR-TASK-08).

    자동 분류 대상 선정용. id 오름차순, 최대 limit 건.
    """
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, title, description, priority, due_date FROM tasks t "
            "WHERE t.status != 'done' "
            "  AND NOT EXISTS (SELECT 1 FROM task_tags tt WHERE tt.task_id = t.id) "
            "ORDER BY t.id LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def add_agent_tags(mapping: dict[int, list[str]]) -> int:
    """에이전트 분류 결과를 task_tags 에 저장한다 (source='agent', FR-TASK-08).

    안전장치: 저장 시점에도 태그가 0개이고 source='user' 가 없는 할일에만 넣는다
    (그 사이 사용자가 태그를 달았으면 건드리지 않는다). 단일 트랜잭션.
    저장한 (task, tag) 쌍 수를 반환한다.
    """
    if not mapping:
        return 0
    now = datetime.now().isoformat()
    written = 0
    with connect() as conn:
        with conn:
            for task_id, tags in mapping.items():
                if not tags:
                    continue
                existing = conn.execute(
                    "SELECT COUNT(*) FROM task_tags WHERE task_id = ?", (task_id,)
                ).fetchone()[0]
                if existing:
                    continue
                for tag in tags:
                    cur = conn.execute(
                        "INSERT OR IGNORE INTO task_tags (task_id, tag, source, created_at) "
                        "VALUES (?, ?, 'agent', ?)",
                        (task_id, tag, now),
                    )
                    written += cur.rowcount
    return written


def upsert_brief(date: str, content: str, notion_url: str | None = None) -> None:
    """date 기준으로 브리핑을 저장/갱신한다. created_at 은 최초 생성값을 유지한다."""
    now = datetime.now().isoformat()
    with connect() as conn:
        with conn:  # 짧은 트랜잭션, 즉시 커밋
            conn.execute(
                "INSERT INTO briefs (date, content, notion_url, created_at) "
                "VALUES (?, ?, ?, ?) "
                "ON CONFLICT(date) DO UPDATE SET "
                "  content = excluded.content, "
                "  notion_url = COALESCE(excluded.notion_url, briefs.notion_url)",
                (date, content, notion_url, now),
            )


def log_sync(service: str, status: str, error_message: str | None = None) -> None:
    """동기화 시도 결과를 sync_logs 에 1행 기록한다 (FR-SYNC-03).

    service 는 schema.sql 의 CHECK(gmail·calendar·notion·supabase·classify) 를 따른다.
    Claude 브리핑 실패는 CHECK 밖이므로 여기 넣지 않는다(로그 파일에만 — AGENT.md AC-4).
    자동 분류(classify)는 CHECK 에 포함되므로 성공/실패를 기록한다 (ADR-0029).

    로깅 실패가 브리핑을 죽이면 안 되므로 예외를 올리지 않고 경고만 남긴다.
    """
    try:
        now = datetime.now().isoformat()
        with connect() as conn:
            with conn:  # 짧은 트랜잭션, 즉시 커밋
                conn.execute(
                    "INSERT INTO sync_logs (service, status, last_sync, error_message) "
                    "VALUES (?, ?, ?, ?)",
                    (service, status, now, error_message),
                )
    except Exception as err:  # noqa: BLE001 - 로깅 실패는 삼킨다
        logger.warning("sync_logs 기록 실패 (service=%s, status=%s): %s", service, status, err)


def upsert_emails(items: list[dict]) -> int:
    """미읽은 메일 목록을 emails 에 upsert 한다 (FR-MAIL-01 AC-1).

    email_id 충돌 시 필드를 갱신하고 is_read=0 으로 되돌린다 (다시 미읽음으로 나타난 경우).
    executemany 로 단일 트랜잭션에서 처리한다.
    """
    if not items:
        return 0
    now = datetime.now().isoformat()
    rows = [
        (
            it.get("email_id"),
            it.get("from_address"),
            it.get("subject"),
            it.get("snippet"),
            it.get("received_at"),
            now,
        )
        for it in items
    ]
    with connect() as conn:
        with conn:
            conn.executemany(
                "INSERT INTO emails "
                "(email_id, from_address, subject, snippet, received_at, is_read, synced_at) "
                "VALUES (?, ?, ?, ?, ?, 0, ?) "
                "ON CONFLICT(email_id) DO UPDATE SET "
                "  from_address = excluded.from_address, "
                "  subject = excluded.subject, "
                "  snippet = excluded.snippet, "
                "  received_at = excluded.received_at, "
                "  is_read = 0, "
                "  synced_at = excluded.synced_at",
                rows,
            )
    return len(rows)


def mark_emails_read_except(email_ids: list[str]) -> int:
    """이번 동기화에 없는 기존 미읽음 행을 is_read=1 로 바꾼다 (FR-MAIL-01 AC-3).

    email_ids 가 비어 있으면 미읽음 전체를 읽음 처리한다.
    """
    with connect() as conn:
        with conn:
            if email_ids:
                placeholders = ",".join("?" for _ in email_ids)
                cur = conn.execute(
                    f"UPDATE emails SET is_read = 1 "
                    f"WHERE is_read = 0 AND email_id NOT IN ({placeholders})",
                    email_ids,
                )
            else:
                cur = conn.execute("UPDATE emails SET is_read = 1 WHERE is_read = 0")
    return cur.rowcount


def get_unread_emails(limit: int = 10) -> list[dict]:
    """미읽은 메일을 최신순으로 반환한다 (읽기 전용)."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT email_id, from_address, subject, snippet, received_at "
            "FROM emails WHERE is_read = 0 "
            "ORDER BY received_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def replace_calendar_events(window_start: str, window_end: str, items: list[dict]) -> int:
    """동기화 창(window_start ≤ start_time < window_end) 안의 일정을 통째로 교체한다.

    단일 트랜잭션에서 창 안 기존 행을 모두 삭제한 뒤 재삽입한다 (FR-CAL-03 AC-2).
    """
    now = datetime.now().isoformat()
    rows = [
        (
            it.get("event_id"),
            it.get("title"),
            it.get("start_time"),
            it.get("end_time"),
            it.get("location"),
            now,
        )
        for it in items
    ]
    with connect() as conn:
        with conn:
            conn.execute(
                "DELETE FROM calendar_events "
                "WHERE start_time >= ? AND start_time < ?",
                (window_start, window_end),
            )
            if rows:
                conn.executemany(
                    "INSERT INTO calendar_events "
                    "(event_id, title, start_time, end_time, location, synced_at) "
                    "VALUES (?, ?, ?, ?, ?, ?) "
                    "ON CONFLICT(event_id) DO UPDATE SET "
                    "  title = excluded.title, "
                    "  start_time = excluded.start_time, "
                    "  end_time = excluded.end_time, "
                    "  location = excluded.location, "
                    "  synced_at = excluded.synced_at",
                    rows,
                )
    return len(rows)


def get_today_events(date: str | None = None) -> list[dict]:
    """오늘 구간(00:00~24:00)에 시작하는 일정을 시간순으로 반환한다 (읽기 전용)."""
    if date is None:
        date = f"{datetime.now():%Y-%m-%d}"
    day_start = f"{date}T00:00:00"
    day_end = f"{date}T23:59:59"
    with connect() as conn:
        rows = conn.execute(
            "SELECT event_id, title, start_time, end_time, location "
            "FROM calendar_events "
            "WHERE start_time >= ? AND start_time <= ? "
            "ORDER BY start_time ASC",
            (day_start, day_end),
        ).fetchall()
    return [dict(row) for row in rows]


def get_week_events(start_date: str | None = None, days: int = 7) -> list[dict]:
    """start_date 부터 days 일간의 일정을 시간순으로 반환한다 (읽기 전용)."""
    if start_date is None:
        start_date = f"{datetime.now():%Y-%m-%d}"
    start = datetime.fromisoformat(f"{start_date}T00:00:00")
    end = start + timedelta(days=days)
    with connect() as conn:
        rows = conn.execute(
            "SELECT event_id, title, start_time, end_time, location "
            "FROM calendar_events "
            "WHERE start_time >= ? AND start_time < ? "
            "ORDER BY start_time ASC",
            (start.isoformat(), end.isoformat()),
        ).fetchall()
    return [dict(row) for row in rows]


def get_brief(date: str) -> dict | None:
    """date 의 브리핑 1건을 반환한다 (없으면 None)."""
    with connect() as conn:
        row = conn.execute(
            "SELECT id, date, content, notion_url, created_at FROM briefs WHERE date = ?",
            (date,),
        ).fetchone()
    return dict(row) if row else None
