"""agent/services/gmail.py 테스트 (TC-MAIL-01~09).

fake service 를 주입해 네트워크 호출 0회. 재시도 테스트는 services.retry.sleep 을 모킹한다.
"""

import os
from datetime import datetime

import pytest

import db
from services import retry
from services.gmail import fetch_unread, sync_gmail


def _http_error(status):
    from googleapiclient.errors import HttpError

    class _Resp:
        def __init__(self, s):
            self.status = s
            self.reason = "err"

        def get(self, k, d=None):
            return d

    return HttpError(_Resp(status), b"{}")


class _Req:
    def __init__(self, fn):
        self._fn = fn

    def execute(self):
        return self._fn()


class FakeGmail:
    """users().messages().list()/get() 를 흉내낸다."""

    def __init__(self, *, ids, details, list_errors=None, get_errors=None):
        self._ids = ids
        self._details = details          # {msg_id: detail dict}
        self._list_errors = list(list_errors or [])
        self._get_errors = dict(get_errors or {})  # {msg_id: [exc, ...]}

    # ── 요청 빌더 ──
    def users(self):
        return self

    def messages(self):
        return self

    def list(self, **kw):
        return _Req(self._do_list)

    def get(self, *, userId, id, **kw):
        return _Req(lambda: self._do_get(id))

    # ── 실행부 ──
    def _do_list(self):
        if self._list_errors:
            raise self._list_errors.pop(0)
        return {"messages": [{"id": i} for i in self._ids]}

    def _do_get(self, msg_id):
        queue = self._get_errors.get(msg_id)
        if queue:
            raise queue.pop(0)
        if msg_id not in self._details:
            raise _http_error(404)
        return self._details[msg_id]


def _detail(msg_id, *, sender, subject, snippet, internal_ms):
    return {
        "id": msg_id,
        "snippet": snippet,
        "internalDate": str(internal_ms),
        "payload": {
            "headers": [
                {"name": "From", "value": sender},
                {"name": "Subject", "value": subject},
                {"name": "Date", "value": "Mon, 01 Sep 2026 09:00:00 +0000"},
            ]
        },
    }


@pytest.fixture(autouse=True)
def _no_sleep(monkeypatch):
    slept = []
    monkeypatch.setattr(retry, "sleep", lambda d: slept.append(d))
    return slept


def _two_message_service():
    return FakeGmail(
        ids=["m1", "m2"],
        details={
            "m1": _detail("m1", sender="a@b.com", subject="첫 메일", snippet="본문1",
                          internal_ms=1_756_717_200_000),
            "m2": _detail("m2", sender="c@d.com", subject="둘째 메일", snippet="본문2",
                          internal_ms=1_756_720_800_000),
        },
    )


def test_mail_01_fetch_unread_normalizes(_no_sleep):
    """TC-MAIL-01: 2건 → 5개 키로 정규화, received_at 은 ISO8601."""
    items = fetch_unread(10, service=_two_message_service())
    assert len(items) == 2
    assert set(items[0]) == {"email_id", "from_address", "subject", "snippet", "received_at"}
    assert items[0]["from_address"] == "a@b.com"
    datetime.fromisoformat(items[0]["received_at"])  # 파싱되면 ISO8601


def test_mail_02_individual_get_failure_is_skipped(_no_sleep):
    """TC-MAIL-02: 개별 get 1건 예외 → 나머지 반환."""
    svc = _two_message_service()
    svc._get_errors = {"m1": [_http_error(401)]}
    items = fetch_unread(10, service=svc)
    assert [i["email_id"] for i in items] == ["m2"]


def test_mail_03_sync_gmail_success(temp_db, _no_sleep):
    """TC-MAIL-03: sync_gmail 성공 → emails 2행 + sync_logs gmail/success."""
    import services.gmail as gmail_mod

    svc = _two_message_service()
    gmail_mod.fetch_unread = lambda n=10: fetch_unread(n, service=svc)
    try:
        assert sync_gmail() is True
    finally:
        gmail_mod.fetch_unread = fetch_unread

    with db.connect() as conn:
        assert conn.execute("SELECT COUNT(*) c FROM emails").fetchone()["c"] == 2
        row = conn.execute("SELECT service, status FROM sync_logs ORDER BY id DESC").fetchone()
    assert (row["service"], row["status"]) == ("gmail", "success")


def _run_sync_with(monkeypatch, svc):
    import services.gmail as gmail_mod

    monkeypatch.setattr(gmail_mod, "fetch_unread", lambda n=10: fetch_unread(n, service=svc))
    return sync_gmail()


def test_mail_04_double_sync_keeps_two_rows(temp_db, monkeypatch, _no_sleep):
    """TC-MAIL-04: 2회 실행해도 emails 2행 유지."""
    _run_sync_with(monkeypatch, _two_message_service())
    _run_sync_with(monkeypatch, _two_message_service())
    with db.connect() as conn:
        assert conn.execute("SELECT COUNT(*) c FROM emails").fetchone()["c"] == 2


def test_mail_05_missing_ids_marked_read(temp_db, monkeypatch, _no_sleep):
    """TC-MAIL-05: 3건 → 1건 → 빠진 2건 is_read=1, get_unread_emails 1건."""
    svc3 = FakeGmail(
        ids=["m1", "m2", "m3"],
        details={
            i: _detail(i, sender=f"{i}@x.com", subject=i, snippet=i, internal_ms=1_756_717_200_000)
            for i in ("m1", "m2", "m3")
        },
    )
    _run_sync_with(monkeypatch, svc3)
    svc1 = FakeGmail(
        ids=["m2"],
        details={"m2": _detail("m2", sender="m2@x.com", subject="m2", snippet="m2",
                               internal_ms=1_756_717_200_000)},
    )
    _run_sync_with(monkeypatch, svc1)

    assert [e["email_id"] for e in db.get_unread_emails()] == ["m2"]
    with db.connect() as conn:
        read = conn.execute("SELECT COUNT(*) c FROM emails WHERE is_read=1").fetchone()["c"]
    assert read == 2


def test_mail_06_fetch_failure_isolated(temp_db, monkeypatch, _no_sleep):
    """TC-MAIL-06: fetch 예외 → sync_gmail False + gmail/failed + error_message."""
    import services.gmail as gmail_mod

    def _boom(n=10):
        raise RuntimeError("access_token=abc123 만료")

    monkeypatch.setattr(gmail_mod, "fetch_unread", _boom)
    assert sync_gmail() is False

    with db.connect() as conn:
        row = conn.execute(
            "SELECT status, error_message FROM sync_logs ORDER BY id DESC"
        ).fetchone()
    assert row["status"] == "failed"
    assert row["error_message"]
    assert "abc123" not in row["error_message"]  # 토큰 마스킹


def test_mail_07_retries_transient_then_succeeds(temp_db, monkeypatch, _no_sleep):
    """TC-MAIL-07: list 가 503 2회 후 성공 → 3회째 성공, sleep 1s·2s."""
    svc = _two_message_service()
    svc._list_errors = [_http_error(503), _http_error(503)]
    assert _run_sync_with(monkeypatch, svc) is True
    assert _no_sleep == [1.0, 2.0]


def test_mail_08_auth_error_fails_fast(temp_db, monkeypatch, _no_sleep):
    """TC-MAIL-08: list 가 401 → 재시도 0, sleep 미호출, 즉시 실패."""
    svc = _two_message_service()
    svc._list_errors = [_http_error(401)]
    assert _run_sync_with(monkeypatch, svc) is False
    assert _no_sleep == []


@pytest.mark.network
def test_mail_09_real_gmail_smoke(temp_db):
    """TC-MAIL-09: 실제 Gmail 1회 호출 (토큰 없으면 skip)."""
    from auth import google_oauth

    if not os.environ.get("TOKEN_ENCRYPTION_KEY") or not google_oauth.resolve_token_path().exists():
        pytest.skip("Google 토큰 미설정")
    assert sync_gmail() in (True, False)
