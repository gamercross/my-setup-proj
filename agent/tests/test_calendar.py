"""agent/services/calendar.py 테스트 (TC-CAL-08~14). fake service 주입, 네트워크 0회."""

import os
from datetime import datetime

import pytest

import db
from services import retry
from services.calendar import fetch_events, sync_calendar


class _Req:
    def __init__(self, fn):
        self._fn = fn

    def execute(self):
        return self._fn()


class FakeCalendar:
    def __init__(self, items, *, errors=None):
        self._items = items
        self._errors = list(errors or [])

    def events(self):
        return self

    def list(self, **kw):
        return _Req(self._do_list)

    def _do_list(self):
        if self._errors:
            raise self._errors.pop(0)
        return {"items": self._items}


@pytest.fixture(autouse=True)
def _no_sleep(monkeypatch):
    monkeypatch.setattr(retry, "sleep", lambda d: None)


def _timed(event_id, start_iso, end_iso, **extra):
    return {"id": event_id, "summary": event_id,
            "start": {"dateTime": start_iso}, "end": {"dateTime": end_iso}, **extra}


def test_cal_08_normalizes_timed_and_allday():
    """TC-CAL-08: dateTime + 종일(date) → 둘 다 ISO, 종일은 T00:00:00."""
    now = datetime(2026, 9, 7, 8, 0, 0)
    items = [
        _timed("e1", "2026-09-07T10:00:00+09:00", "2026-09-07T11:00:00+09:00", location="회의실"),
        {"id": "e2", "summary": "종일", "start": {"date": "2026-09-08"}, "end": {"date": "2026-09-09"}},
        {"id": "e3", "start": {"dateTime": "2026-09-09T09:00:00+09:00"},
         "end": {"dateTime": "2026-09-09T09:30:00+09:00"}},
    ]
    _, _, events = fetch_events(7, service=FakeCalendar(items), now=now)
    by_id = {e["event_id"]: e for e in events}
    assert by_id["e1"]["location"] == "회의실"
    assert by_id["e2"]["start_time"] == "2026-09-08T00:00:00"
    assert by_id["e3"]["title"] == "(제목 없음)"
    assert by_id["e3"]["location"] is None


def test_cal_09_excludes_cancelled():
    """TC-CAL-09: status=='cancelled' 제외."""
    items = [
        _timed("ok", "2026-09-07T10:00:00+09:00", "2026-09-07T11:00:00+09:00"),
        dict(_timed("gone", "2026-09-07T12:00:00+09:00", "2026-09-07T13:00:00+09:00"),
             status="cancelled"),
    ]
    _, _, events = fetch_events(7, service=FakeCalendar(items), now=datetime(2026, 9, 7, 8, 0))
    assert [e["event_id"] for e in events] == ["ok"]


def _sync_with(monkeypatch, svc, now=None):
    import services.calendar as cal_mod

    monkeypatch.setattr(
        cal_mod, "fetch_events",
        lambda days=7: fetch_events(days, service=svc, now=now),
    )
    return sync_calendar()


def test_cal_10_sync_success(temp_db, monkeypatch):
    """TC-CAL-10: sync_calendar 성공 → calendar_events + calendar/success."""
    now = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
    start = now.replace(hour=10).astimezone().isoformat()
    end = now.replace(hour=11).astimezone().isoformat()
    svc = FakeCalendar([_timed("e1", start, end)])
    assert _sync_with(monkeypatch, svc, now) is True
    with db.connect() as conn:
        assert conn.execute("SELECT COUNT(*) c FROM calendar_events").fetchone()["c"] == 1
        row = conn.execute("SELECT service, status FROM sync_logs ORDER BY id DESC").fetchone()
    assert (row["service"], row["status"]) == ("calendar", "success")


def test_cal_11_replace_drops_missing(temp_db, monkeypatch):
    """TC-CAL-11: 3건 → 같은 창 2건 → 사라진 1건 캐시 제거, 총 2행."""
    now = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)

    def mk(ids):
        out = []
        for n, i in enumerate(ids):
            s = now.replace(hour=10 + n).astimezone().isoformat()
            e = now.replace(hour=10 + n, minute=30).astimezone().isoformat()
            out.append(_timed(i, s, e))
        return FakeCalendar(out)

    _sync_with(monkeypatch, mk(["a", "b", "c"]), now)
    _sync_with(monkeypatch, mk(["a", "b"]), now)
    with db.connect() as conn:
        ids = {r["event_id"] for r in conn.execute("SELECT event_id FROM calendar_events")}
    assert ids == {"a", "b"}


def test_cal_12_fetch_failure_keeps_cache(temp_db, monkeypatch):
    """TC-CAL-12: fetch 예외 → False + calendar/failed + 기존 캐시 보존."""
    now = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
    start = now.replace(hour=10).astimezone().isoformat()
    end = now.replace(hour=11).astimezone().isoformat()
    _sync_with(monkeypatch, FakeCalendar([_timed("keep", start, end)]), now)

    import services.calendar as cal_mod

    def _boom(days=7):
        # 여러 토큰 표기(키=값·Authorization 헤더·Bearer·JSON)를 한 번에 섞어 마스킹 검증.
        raise RuntimeError(
            'access_token=secret123 / Authorization: Bearer secret123 / '
            'Bearer secret123 / {"access_token": "secret123"}'
        )

    monkeypatch.setattr(cal_mod, "fetch_events", _boom)
    assert sync_calendar() is False

    with db.connect() as conn:
        ids = {r["event_id"] for r in conn.execute("SELECT event_id FROM calendar_events")}
        row = conn.execute(
            "SELECT status, error_message FROM sync_logs ORDER BY id DESC"
        ).fetchone()
    assert ids == {"keep"}
    assert row["status"] == "failed"
    assert "secret123" not in row["error_message"]  # 토큰 마스킹 (FR-CAL-03 AC-4)


def test_cal_14_allday_event_dropped_from_window(temp_db, monkeypatch):
    """TC-CAL-14: 종일 일정 2건 → 같은 창 0건 → 캐시에서 종일 일정 제거.

    창 경계(offset-aware)와 종일 일정(naive) 타임존 불일치로 DELETE 가
    빗나가던 버그의 회귀 방지. 창 안 종일 일정이 사라지면 캐시도 비어야 한다.
    """
    now = datetime(2026, 9, 7, 8, 0, 0)
    allday = [
        {"id": "allday-today", "summary": "종일-오늘",
         "start": {"date": "2026-09-07"}, "end": {"date": "2026-09-08"}},
        {"id": "allday-soon", "summary": "종일-곧",
         "start": {"date": "2026-09-09"}, "end": {"date": "2026-09-10"}},
    ]
    _sync_with(monkeypatch, FakeCalendar(allday), now)
    with db.connect() as conn:
        assert conn.execute("SELECT COUNT(*) c FROM calendar_events").fetchone()["c"] == 2

    _sync_with(monkeypatch, FakeCalendar([]), now)
    with db.connect() as conn:
        ids = {r["event_id"] for r in conn.execute("SELECT event_id FROM calendar_events")}
    assert ids == set()


@pytest.mark.network
def test_cal_13_real_calendar_smoke(temp_db):
    """TC-CAL-13: 실제 Calendar 1회 호출 (토큰 없으면 skip)."""
    from auth import google_oauth

    if not os.environ.get("TOKEN_ENCRYPTION_KEY") or not google_oauth.resolve_token_path().exists():
        pytest.skip("Google 토큰 미설정")
    assert sync_calendar() in (True, False)
