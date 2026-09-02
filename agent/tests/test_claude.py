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
