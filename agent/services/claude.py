"""Claude API 래퍼 (Week 1 최소 구현).

최신 모델 claude-opus-5 를 기본값으로 사용한다.
Week 3부터 daily_brief 에서 이 모듈을 호출한다.
"""

import os

from dotenv import load_dotenv

load_dotenv()

# 기본 모델: 최신 Claude 모델
DEFAULT_MODEL = "claude-opus-5"


def get_client():
    """Anthropic 클라이언트를 생성한다.

    ANTHROPIC_API_KEY 환경 변수 또는 `ant auth login` 프로필에서 인증 정보를 읽는다.
    """
    from anthropic import Anthropic

    return Anthropic()


def ask(prompt: str, system: str | None = None, model: str = DEFAULT_MODEL) -> str:
    """단일 메시지를 보내고 텍스트 응답을 돌려준다.

    실패 시 예외 메시지를 그대로 올려 호출부에서 처리하도록 한다.
    """
    client = get_client()

    kwargs = {
        "model": model,
        "max_tokens": 1024,
        # 적응형 사고(adaptive thinking) 사용
        "thinking": {"type": "adaptive"},
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        kwargs["system"] = system

    response = client.messages.create(**kwargs)

    # 텍스트 블록만 모아서 반환한다
    parts = [block.text for block in response.content if block.type == "text"]
    return "\n".join(parts).strip()
