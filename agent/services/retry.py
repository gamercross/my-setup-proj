"""지수 백오프 재시도 유틸 (NFR-REL-05).

외부 호출(예: Claude API)의 일시적 오류만 재시도한다.
인증/권한 오류(4xx)는 대기해도 소용없으므로 즉시 전파한다.

테스트에서 `retry.sleep` 을 monkeypatch 해 실제 대기 없이 검증한다.
"""

import logging
import time

logger = logging.getLogger(__name__)

# 테스트에서 교체 가능하도록 모듈 속성으로 노출한다.
sleep = time.sleep


def _is_retryable(exc: Exception, retry_on: tuple) -> bool:
    """재시도 대상 예외인지 판단한다.

    - retry_on 에 명시된 타입이면 재시도.
    - 그 외에는 재시도하지 않고 즉시 전파.
    """
    return isinstance(exc, retry_on)


def call_with_retry(
    fn,
    *,
    attempts: int = 3,
    base_delay: float = 1.0,
    retry_on: tuple = (OSError,),  # ConnectionError·TimeoutError 는 OSError 하위 클래스
    on_retry=None,
):
    """fn() 을 최대 attempts 회 시도한다.

    지수 백오프: i 번째 재시도 전 base_delay * 2**(i-1) 초 대기
    (base_delay=1.0, attempts=3 → 1s, 2s 두 번 sleep).

    재시도 대상(retry_on)이 아닌 예외는 즉시 전파한다.
    마지막 시도까지 실패하면 마지막 예외를 전파한다.
    """
    last_exc = None
    for i in range(1, attempts + 1):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001 - 여기서 분류 후 재전파한다
            last_exc = exc
            if not _is_retryable(exc, retry_on):
                # 인증 오류 등: 대기 없이 즉시 전파
                raise
            if i >= attempts:
                # 마지막 시도 실패
                raise
            delay = base_delay * (2 ** (i - 1))
            logger.warning(
                "재시도 %d/%d (%.1fs 후): %s", i, attempts - 1, delay, exc
            )
            if on_retry is not None:
                try:
                    on_retry(i, exc)
                except Exception:  # noqa: BLE001 - 콜백 실패는 무시
                    logger.warning("on_retry 콜백 실패", exc_info=True)
            sleep(delay)
    # 도달 불가 (루프 안에서 return 또는 raise) — 방어적으로 남긴다.
    raise last_exc
