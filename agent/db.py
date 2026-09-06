"""에이전트용 SQLite 접근 계층 (ADR-0009 / ADR-0011).

백엔드와 **같은 DB 파일**(DATABASE_PATH, 기본 backend/data/app.db)을 연다.

쓰기 주체 분리:
  - tasks / projects 는 **읽기 전용**으로만 사용한다 (백엔드가 소유).
  - briefs 는 에이전트가 date 기준으로 upsert 한다.

스키마 초기화 책임은 백엔드에 있다(ADR-0011). 여기서는 파일이 비어있을 때를
대비한 방어적 멱등 실행(ensure_schema)만 제공한다.
"""

import logging
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
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


def get_brief(date: str) -> dict | None:
    """date 의 브리핑 1건을 반환한다 (없으면 None)."""
    with connect() as conn:
        row = conn.execute(
            "SELECT id, date, content, notion_url, created_at FROM briefs WHERE date = ?",
            (date,),
        ).fetchone()
    return dict(row) if row else None
