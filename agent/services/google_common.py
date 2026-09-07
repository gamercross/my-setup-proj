"""Google API 공통 유틸 — 재시도 래퍼 (Phase D2-b, NFR-REL-05).

googleapiclient 요청의 일시적 오류(429·5xx)만 call_with_retry 로 3회 백오프한다.
401/403/400 등 영구 오류는 즉시 전파한다.
"""

import logging

from services.retry import call_with_retry

# _sanitize_error 는 services.sanitize 로 이동했다 (notion 등과 공용 — NFR-SEC-04).
# 기존 import 경로(services.google_common._sanitize_error)를 유지하기 위해 재노출한다.
from services.sanitize import sanitize_error as _sanitize_error

logger = logging.getLogger(__name__)

# 재시도 대상 HTTP 상태 코드.
RETRYABLE_STATUS = {429, 500, 502, 503, 504}

__all__ = [
    "RETRYABLE_STATUS",
    "TransientApiError",
    "execute_with_retry",
    "_sanitize_error",
]


class TransientApiError(OSError):
    """일시적 Google API 오류 — call_with_retry 의 재시도 대상 (OSError 하위)."""


def _status_of(err) -> int | None:
    """HttpError 에서 상태 코드를 방어적으로 읽는다."""
    resp = getattr(err, "resp", None)
    status = getattr(resp, "status", None)
    if status is None:
        status = getattr(err, "status_code", None)
    try:
        return int(status) if status is not None else None
    except (TypeError, ValueError):
        return None


def execute_with_retry(request, *, attempts: int = 3, base_delay: float = 1.0):
    """request.execute() 를 재시도 정책과 함께 실행한다.

    HttpError 중 429/5xx 만 TransientApiError 로 승격해 재시도하고,
    그 외(401/403/400 등)는 원본 예외를 그대로 전파한다.
    """
    from googleapiclient.errors import HttpError

    def _call():
        try:
            return request.execute()
        except HttpError as err:
            status = _status_of(err)
            if status in RETRYABLE_STATUS:
                raise TransientApiError(f"일시적 Google API 오류(status={status})") from err
            raise

    return call_with_retry(
        _call, attempts=attempts, base_delay=base_delay, retry_on=(TransientApiError,)
    )
