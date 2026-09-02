"""Claude API 연결 테스트.

실행:
    python test_claude.py

ANTHROPIC_API_KEY 가 설정되어 있어야 실제 호출이 이루어진다.
키가 없으면 안내 메시지를 출력하고 종료한다.
"""

import os

from dotenv import load_dotenv

load_dotenv()


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
