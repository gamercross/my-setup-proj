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


def test_sync_11_upsert_emails_dedupes_and_updates(temp_db):
    """TC-SYNC-11: 같은 email_id 재삽입 → 1행 유지 + 필드 갱신 + is_read 리셋."""
    db.upsert_emails([
        {"email_id": "x1", "from_address": "a@b.com", "subject": "옛 제목",
         "snippet": "old", "received_at": "2026-09-01T09:00:00"},
    ])
    db.mark_emails_read_except([])  # x1 을 읽음 처리
    db.upsert_emails([
        {"email_id": "x1", "from_address": "a@b.com", "subject": "새 제목",
         "snippet": "new", "received_at": "2026-09-02T09:00:00"},
    ])
    with db.connect() as conn:
        rows = conn.execute("SELECT subject, is_read FROM emails WHERE email_id='x1'").fetchall()
    assert len(rows) == 1
    assert rows[0]["subject"] == "새 제목"
    assert rows[0]["is_read"] == 0


def test_sync_12_replace_calendar_events_leaves_outside_window(temp_db):
    """TC-SYNC-12: replace_calendar_events 는 창 밖 일정을 건드리지 않는다."""
    db.replace_calendar_events(
        "2026-09-01T00:00:00", "2026-09-08T00:00:00",
        [{"event_id": "old", "title": "지난주", "start_time": "2026-09-02T10:00:00",
          "end_time": "2026-09-02T11:00:00", "location": None}],
    )
    db.replace_calendar_events(
        "2026-09-08T00:00:00", "2026-09-15T00:00:00",
        [{"event_id": "new", "title": "이번주", "start_time": "2026-09-09T10:00:00",
          "end_time": "2026-09-09T11:00:00", "location": None}],
    )
    with db.connect() as conn:
        ids = {r["event_id"] for r in conn.execute("SELECT event_id FROM calendar_events")}
    assert ids == {"old", "new"}


def test_sync_13_get_unread_emails_filters_and_orders(temp_db):
    """TC-SYNC-13: is_read=0 만, received_at DESC."""
    db.upsert_emails([
        {"email_id": "a", "from_address": "a", "subject": "a", "snippet": "a",
         "received_at": "2026-09-01T09:00:00"},
        {"email_id": "b", "from_address": "b", "subject": "b", "snippet": "b",
         "received_at": "2026-09-03T09:00:00"},
    ])
    db.mark_emails_read_except(["a", "b"])
    db.upsert_emails([
        {"email_id": "c", "from_address": "c", "subject": "c", "snippet": "c",
         "received_at": "2026-09-02T09:00:00"},
    ])
    with db.connect() as conn:
        conn.execute("UPDATE emails SET is_read=1 WHERE email_id='a'")
        conn.commit()
    ids = [e["email_id"] for e in db.get_unread_emails()]
    assert ids == ["b", "c"]


def test_sync_14_get_today_events_filters_today_asc(temp_db):
    """TC-SYNC-14: get_today_events 는 오늘 구간만 시간순으로 반환."""
    today = f"{datetime.now():%Y-%m-%d}"
    db.replace_calendar_events(
        f"{today}T00:00:00", "2999-01-01T00:00:00",
        [
            {"event_id": "late", "title": "오후", "start_time": f"{today}T15:00:00",
             "end_time": f"{today}T16:00:00", "location": None},
            {"event_id": "early", "title": "오전", "start_time": f"{today}T09:00:00",
             "end_time": f"{today}T10:00:00", "location": None},
            {"event_id": "tmr", "title": "내일", "start_time": "2999-01-01T09:00:00",
             "end_time": "2999-01-01T10:00:00", "location": None},
        ],
    )
    titles = [e["title"] for e in db.get_today_events()]
    assert titles == ["오전", "오후"]
