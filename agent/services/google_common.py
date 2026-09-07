"""Google API 공통 유틸 — 재시도 래퍼 (Phase D2-b, NFR-REL-05).

googleapiclient 요청의 일시적 오류(429·5xx)만 call_with_retry 로 3회 백오프한다.
401/403/400 등 영구 오류는 즉시 전파한다.
"""

import logging
import re

from services.retry import call_with_retry

logger = logging.getLogger(__name__)

# 재시도 대상 HTTP 상태 코드.
RETRYABLE_STATUS = {429, 500, 502, 503, 504}

# sync_logs.error_message 에 저장하기 전 토큰류를 마스킹한다 (gmail·calendar 공용).
# HttpError.str() 이 응답 본문 JSON 을 그대로 담으므로 다음 형태를 모두 커버한다:
#  1) key=value / key: value  (client_secret 등 민감 키가 명시된 경우)
#  2) JSON 형태 "key": "value" / 'key':'value'
#  3) Authorization 헤더 및 Bearer <token> 단독 형태
_SENSITIVE_KEYS = "access_token|refresh_token|id_token|client_secret|authorization"

# 키 뒤 값이 따옴표로 감싸진 JSON 형태: "access_token": "1//abc.DEF" 등.
_KEYED_QUOTED_PATTERN = re.compile(
    rf"(?P<key>{_SENSITIVE_KEYS})"
    r"(?P<sep>[\"']?\s*[=:]\s*)"
    r"(?P<q>[\"'])"
    r"(?:Bearer\s+)?[^\"']+"
    r"(?P=q)",
    re.IGNORECASE,
)
# 키 뒤 값이 따옴표 없이 이어지는 형태: access_token=ya29... / Authorization: Bearer ya29...
_KEYED_BARE_PATTERN = re.compile(
    rf"(?P<key>{_SENSITIVE_KEYS})"
    r"(?P<sep>\s*[=:]\s*)"
    r"(?:Bearer\s+)?[^\s\"']+",
    re.IGNORECASE,
)
# Bearer <token> 단독 형태.
_BEARER_PATTERN = re.compile(r"Bearer\s+[^\s\"']+", re.IGNORECASE)
_MAX_ERROR_LEN = 500


def _sanitize_error(msg) -> str:
    """에러 메시지에서 토큰류를 마스킹하고 500자로 절단한다."""
    text = str(msg)
    # 원래 구조(따옴표 등)는 최대한 보존하고 값만 *** 로 바꾼다.
    text = _KEYED_QUOTED_PATTERN.sub(r"\g<key>\g<sep>\g<q>***\g<q>", text)
    text = _KEYED_BARE_PATTERN.sub(r"\g<key>\g<sep>***", text)
    text = _BEARER_PATTERN.sub("Bearer ***", text)
    return text[:_MAX_ERROR_LEN]


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
