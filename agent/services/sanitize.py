"""에러 메시지 토큰 마스킹 유틸 (NFR-SEC-04 / FR-CAL-03 AC-4 공용).

sync_logs.error_message 등 저장·로깅 전에 access_token·Bearer·client_secret 류를
*** 로 가린다. google_common·notion 등이 공유한다.

과거 위치는 services.google_common._sanitize_error 였다. 하위 호환을 위해
google_common 이 이 모듈의 sanitize_error 를 재노출한다.
"""

import re

# 민감 키 목록 (JSON 본문·헤더·key=value 형태를 모두 커버).
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


def sanitize_error(msg) -> str:
    """에러 메시지에서 토큰류를 마스킹하고 500자로 절단한다."""
    text = str(msg)
    # 원래 구조(따옴표 등)는 최대한 보존하고 값만 *** 로 바꾼다.
    text = _KEYED_QUOTED_PATTERN.sub(r"\g<key>\g<sep>\g<q>***\g<q>", text)
    text = _KEYED_BARE_PATTERN.sub(r"\g<key>\g<sep>***", text)
    text = _BEARER_PATTERN.sub("Bearer ***", text)
    return text[:_MAX_ERROR_LEN]
