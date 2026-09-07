"""Gmail 통합 — 미읽은 메일 수집 (Phase D2-b, FR-MAIL-01).

읽기 전용(gmail.readonly)으로 미읽은 메일을 최대 N건 가져와 emails 테이블에 캐시한다.
네트워크 호출은 모두 execute_with_retry 로 감싼다 (NFR-REL-05).
"""

import logging
from datetime import datetime

import db
from services.google_common import _sanitize_error, execute_with_retry

logger = logging.getLogger(__name__)

DEFAULT_MAX_RESULTS = 10
UNREAD_QUERY = "is:unread"


def _header(headers: list[dict], name: str) -> str:
    """metadata 헤더 목록에서 name 값을 찾는다 (없으면 빈 문자열)."""
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def _received_at(internal_date) -> str:
    """internalDate(ms 문자열)를 ISO8601 로컬 시각으로 변환한다."""
    try:
        ms = int(internal_date)
        return datetime.fromtimestamp(ms / 1000).isoformat()
    except (TypeError, ValueError):
        return datetime.now().isoformat()


def fetch_unread(max_results: int = DEFAULT_MAX_RESULTS, *, service=None) -> list[dict]:
    """미읽은 메일을 정규화된 dict 리스트로 반환한다.

    키: email_id / from_address / subject / snippet / received_at
    개별 메일 조회 실패 1건은 건너뛰고 경고만 남긴다.
    """
    if service is None:
        from auth import google_oauth

        service = google_oauth.build_service("gmail", "v1")

    listing = execute_with_retry(
        service.users()
        .messages()
        .list(userId="me", q=UNREAD_QUERY, maxResults=max_results)
    )
    messages = listing.get("messages", []) or []

    results: list[dict] = []
    for msg in messages:
        msg_id = msg.get("id")
        if not msg_id:
            continue
        try:
            detail = execute_with_retry(
                service.users()
                .messages()
                .get(
                    userId="me",
                    id=msg_id,
                    format="metadata",
                    metadataHeaders=["From", "Subject", "Date"],
                )
            )
        except Exception as err:  # noqa: BLE001 - 개별 실패는 격리
            logger.warning("메일 %s 조회 실패 — 건너뜀: %s", msg_id, err)
            continue

        headers = detail.get("payload", {}).get("headers", [])
        results.append(
            {
                "email_id": msg_id,
                "from_address": _header(headers, "From"),
                "subject": _header(headers, "Subject"),
                "snippet": detail.get("snippet", ""),
                "received_at": _received_at(detail.get("internalDate")),
            }
        )
    return results


def sync_gmail(max_results: int = DEFAULT_MAX_RESULTS) -> bool:
    """미읽은 메일을 수집해 emails 를 갱신하고 sync_logs 에 결과를 남긴다.

    실패해도 예외를 전파하지 않고 False 를 반환한다 (FR-MAIL-01 AC-4).
    """
    try:
        items = fetch_unread(max_results)
        db.upsert_emails(items)
        db.mark_emails_read_except([it["email_id"] for it in items])
        db.log_sync("gmail", "success")
        logger.info("Gmail 동기화 완료 — %d건", len(items))
        return True
    except Exception as err:  # noqa: BLE001 - 실패 격리
        logger.error("Gmail 동기화 실패: %s", err)
        db.log_sync("gmail", "failed", _sanitize_error(err))
        return False
