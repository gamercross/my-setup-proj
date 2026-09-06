"""Claude API 연결 테스트.

실행:
    pytest tests/test_claude.py -m network          # 실호출 스모크
    pytest -m "not network"                         # 실호출 제외 (CI 기본)

ANTHROPIC_API_KEY 가 설정되어 있어야 실제 호출이 이루어진다.
키가 없으면 안내 메시지를 출력하고 종료한다.
"""

import os

import pytest
from dotenv import load_dotenv

load_dotenv()


@pytest.mark.network
@pytest.mark.skipif(
    not os.getenv("ANTHROPIC_API_KEY"),
    reason="ANTHROPIC_API_KEY 없음 — 실호출 스모크 건너뜀",
)
def test_claude_connection():
    """실제 Claude 호출이 문자열 응답을 돌려주는지 확인한다."""
    from services.claude import ask

    answer = ask("한 문장으로 자기소개를 해줘.")
    assert isinstance(answer, str) and answer.strip()


def test_retryable_exceptions_classification():
    """`_retryable_exceptions()` 가 anthropic 예외를 올바르게 분류하는지 확인한다.

    - APIConnectionError(네트워크) → 재시도 대상(포함)
    - AuthenticationError(4xx) → 재시도 금지(불포함) → 즉시 전파
    anthropic 미설치 환경에서는 건너뛴다.
    """
    anthropic = pytest.importorskip("anthropic")

    from services.claude import _retryable_exceptions

    retryable = _retryable_exceptions()

    assert issubclass(anthropic.APIConnectionError, retryable)
    assert not issubclass(anthropic.AuthenticationError, retryable)

    # call_with_retry 로도 동작을 확인한다: 인증 오류는 즉시 전파돼야 한다.
    from services.retry import call_with_retry

    calls = {"n": 0}

    def raise_auth():
        calls["n"] += 1
        raise anthropic.AuthenticationError.__new__(anthropic.AuthenticationError)

    with pytest.raises(anthropic.AuthenticationError):
        call_with_retry(raise_auth, attempts=3, base_delay=0, retry_on=retryable)
    assert calls["n"] == 1  # 재시도 없이 1회만 호출


def main() -> int:
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("⚠️  ANTHROPIC_API_KEY 가 없습니다. .env 파일을 확인하세요.")
        return 1

    try:
        from services.claude import ask

        answer = ask("한 문장으로 자기소개를 해줘.")
        print("✅ Claude 응답:")
        print(answer)
        return 0
    except Exception as err:  # noqa: BLE001
        print(f"❌ 호출 실패: {err}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
