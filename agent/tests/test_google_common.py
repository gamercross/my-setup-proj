"""_sanitize_error 마스킹 유틸 단위 테스트 (Phase D2-b, FR-CAL-03 AC-4 / FR-MAIL 공용).

HttpError.str() 이 담을 수 있는 여러 토큰 표기 형태를 모두 마스킹하는지 확인한다.
sync_logs.error_message 에 평문 토큰이 저장되지 않아야 한다.
"""

import pytest

from services.google_common import _sanitize_error

_SECRET = "ya29.SECRETVALUE"


@pytest.mark.parametrize(
    "raw",
    [
        f"access_token={_SECRET} failed",
        f"Authorization: Bearer {_SECRET}",
        f"Bearer {_SECRET}",
        "Bearer 1//0abc-DEF_ghi",
        '{"access_token": "ya29.SECRET"}',
        "{'refresh_token':'1//abc.DEF'} client_secret=GOCSPX-abc",
    ],
)
def test_sanitize_masks_tokens(raw):
    """토큰 표기 형태(키=값·헤더·Bearer·JSON)를 모두 *** 로 가린다."""
    out = _sanitize_error(raw)
    assert _SECRET not in out
    assert "ya29.SECRET" not in out
    assert "1//abc.DEF" not in out
    assert "GOCSPX-abc" not in out
    assert "***" in out


def test_sanitize_keeps_normal_message():
    """토큰이 없는 정상 메시지는 그대로 보존한다."""
    msg = "Calendar API rate limit exceeded"
    assert _sanitize_error(msg) == msg


def test_sanitize_truncates_to_500():
    """500자로 절단한다."""
    assert len(_sanitize_error("x" * 1000)) == 500
