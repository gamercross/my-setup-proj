"""agent/db.py 테스트 (TC-AGENT-05,09,10,11,12)."""

import sqlite3
from datetime import datetime

import pytest

import db


def _insert_task(path, *, title, due_date, status="todo", priority="medium"):
    now = datetime.now().isoformat()
    with sqlite3.connect(path) as conn:
        conn.execute(
            "INSERT INTO tasks (title, due_date, priority, status, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (title, due_date, priority, status, now, now),
        )


def test_agent_09_resolve_db_path(monkeypatch):
    """TC-AGENT-09: env 우선, 미설정/공백이면 backend/data/app.db."""
    monkeypatch.setenv("DATABASE_PATH", "/tmp/custom.db")
    assert db.resolve_db_path() == "/tmp/custom.db"

    monkeypatch.setenv("DATABASE_PATH", "   ")
    assert db.resolve_db_path() == str(db.DEFAULT_DB_PATH)

    monkeypatch.delenv("DATABASE_PATH", raising=False)
    assert db.resolve_db_path() == str(db.DEFAULT_DB_PATH)


def test_agent_10_ensure_schema_idempotent(tmp_path, monkeypatch):
    """TC-AGENT-10: 빈 파일 DB 에서 tasks/briefs 생성, 2회 호출 멱등."""
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "app.db"))
    for _ in range(2):
        with db.connect() as conn:
            db.ensure_schema(conn)

    with db.connect() as conn:
        names = {
            r["name"]
            for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
    assert {"tasks", "briefs"} <= names


def test_agent_11_connect_pragmas(temp_db):
    """TC-AGENT-11: connect() 후 WAL + busy_timeout=5000."""
    with db.connect() as conn:
        assert conn.execute("PRAGMA journal_mode").fetchone()[0] == "wal"
        assert conn.execute("PRAGMA busy_timeout").fetchone()[0] == 5000


def test_agent_12_get_today_tasks_filters_and_orders(temp_db):
    """TC-AGENT-12: 오늘·미완료만, priority 정렬."""
    today = f"{datetime.now():%Y-%m-%d}"
    _insert_task(temp_db, title="낮음", due_date=today, priority="low")
    _insert_task(temp_db, title="높음", due_date=today, priority="high")
    _insert_task(temp_db, title="완료됨", due_date=today, status="done")
    _insert_task(temp_db, title="내일", due_date="2999-01-01")

    tasks = db.get_today_tasks()
    titles = [t["title"] for t in tasks]
    assert titles == ["높음", "낮음"]


def test_sync_06_log_sync_writes_rows(temp_db):
    """TC-SYNC-06: success/failed 각 1행, last_sync 는 ISO8601."""
    db.log_sync("gmail", "success")
    db.log_sync("calendar", "failed", "401 Unauthorized")

    with db.connect() as conn:
        rows = conn.execute(
            "SELECT service, status, last_sync, error_message FROM sync_logs ORDER BY id"
        ).fetchall()

    assert len(rows) == 2
    assert (rows[0]["service"], rows[0]["status"]) == ("gmail", "success")
    assert (rows[1]["service"], rows[1]["status"]) == ("calendar", "failed")
    assert rows[1]["error_message"] == "401 Unauthorized"
    # last_sync 가 ISO8601 로 파싱되는지 확인
    datetime.fromisoformat(rows[0]["last_sync"])


def test_sync_07_log_sync_never_raises(temp_db):
    """TC-SYNC-07: 잘못된 status 등으로 INSERT 가 실패해도 예외를 올리지 않는다."""
    db.log_sync("gmail", "잘못된상태")  # CHECK 위반 → 내부에서 삼켜야 한다

    with db.connect() as conn:
        count = conn.execute("SELECT COUNT(*) AS c FROM sync_logs").fetchone()["c"]
    assert count == 0


def test_agent_05_upsert_brief_is_single_row(temp_db):
    """TC-AGENT-05: 같은 date 로 2회 upsert → 1행, content 최신값."""
    db.upsert_brief("2026-09-06", "첫 번째")
    db.upsert_brief("2026-09-06", "두 번째")

    with db.connect() as conn:
        rows = conn.execute("SELECT content FROM briefs WHERE date='2026-09-06'").fetchall()
    assert len(rows) == 1
    assert rows[0]["content"] == "두 번째"
    assert db.get_brief("2026-09-06")["content"] == "두 번째"
