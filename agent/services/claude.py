"""Claude API 래퍼 (Week 1 최소 구현).

최신 모델 claude-opus-5 를 기본값으로 사용한다.
Week 3부터 daily_brief 에서 이 모듈을 호출한다.
"""

import os

from dotenv import load_dotenv

from services.retry import call_with_retry

load_dotenv()

# 기본 모델: 최신 Claude 모델
DEFAULT_MODEL = "claude-opus-5"


def _retryable_exceptions() -> tuple:
    """재시도 대상 예외 튜플을 만든다.

    네트워크/타임아웃/5xx/과부하 계열만 재시도한다.
    인증·권한·잘못된 요청(4xx)은 여기 포함하지 않아 즉시 전파된다
    (TC-AGENT-03 "키 만료 → 즉시 실패" 유지).
    """
    # ConnectionError·TimeoutError 는 OSError 의 하위 클래스라 OSError 하나로 커버된다.
    retryable = [OSError]
    try:
        import anthropic

        for name in (
            "APIConnectionError",
            "APITimeoutError",
            "InternalServerError",
            "RateLimitError",
        ):
            exc = getattr(anthropic, name, None)
            if isinstance(exc, type):
                retryable.append(exc)
    except Exception:  # noqa: BLE001 - anthropic 미설치 시 기본 예외만 사용
        pass
    return tuple(retryable)


def get_client():
    """Anthropic 클라이언트를 생성한다.

    ANTHROPIC_API_KEY 환경 변수 또는 `ant auth login` 프로필에서 인증 정보를 읽는다.
    """
    from anthropic import Anthropic

    # 타임아웃 30s 고정, SDK 내부 재시도는 끈다(max_retries=0).
    # 재시도 책임은 retry.py 의 call_with_retry 단일 지점에 둔다.
    return Anthropic(timeout=30.0, max_retries=0)


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

    # 일시적 오류는 3회 지수 백오프(1·2s)로 재시도한다 (FR-AGENT-06 AC-3 / NFR-REL-05).
    # 성공 경로 목표는 브리핑 60초(NFR-PERF-04)다. 3회 모두 실패하는 열화 경로는
    # 최악 30s×3 + 백오프(1s+2s) ≈ 93초 뒤 오류를 전파하며,
    # 이 경우 브리핑은 크래시 없이 실패 메시지를 반환한다.
    response = call_with_retry(
        lambda: client.messages.create(**kwargs),
        attempts=3,
        base_delay=1.0,
        retry_on=_retryable_exceptions(),
    )

    # 텍스트 블록만 모아서 반환한다
    parts = [block.text for block in response.content if block.type == "text"]
    return "\n".join(parts).strip()
