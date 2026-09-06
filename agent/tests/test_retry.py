"""services/retry.py 테스트 (TC-AGENT-16,17,18)."""

import pytest

from services import retry
from services.retry import call_with_retry


class _AuthError(Exception):
    """인증 오류 흉내 — retry_on 에 포함되지 않는다."""


def test_agent_16_succeeds_on_third_attempt(monkeypatch):
    """TC-AGENT-16: 2회 실패 후 3회째 성공 → 정상 반환, sleep 1·2s 두 번."""
    slept = []
    monkeypatch.setattr(retry, "sleep", lambda d: slept.append(d))

    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        if calls["n"] < 3:
            raise ConnectionError("일시 오류")
        return "ok"

    result = call_with_retry(fn, attempts=3, base_delay=1.0, retry_on=(ConnectionError,))

    assert result == "ok"
    assert calls["n"] == 3
    assert slept == [1.0, 2.0]


def test_agent_17_all_attempts_fail(monkeypatch):
    """TC-AGENT-17: 3회 전부 실패 → 마지막 예외 전파, sleep 2회."""
    slept = []
    monkeypatch.setattr(retry, "sleep", lambda d: slept.append(d))

    def fn():
        raise TimeoutError("계속 타임아웃")

    with pytest.raises(TimeoutError):
        call_with_retry(fn, attempts=3, base_delay=1.0, retry_on=(TimeoutError,))

    assert slept == [1.0, 2.0]


def test_agent_18_auth_error_fails_fast(monkeypatch):
    """TC-AGENT-18: 인증 오류 → 재시도 0회, sleep 미호출, 즉시 전파."""
    slept = []
    monkeypatch.setattr(retry, "sleep", lambda d: slept.append(d))

    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        raise _AuthError("키 만료")

    with pytest.raises(_AuthError):
        call_with_retry(fn, attempts=3, base_delay=1.0, retry_on=(ConnectionError,))

    assert calls["n"] == 1
    assert slept == []
