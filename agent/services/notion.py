"""Notion 통합 (Phase D3, FR-AGENT-03).

일일 브리핑을 Notion 부모 페이지 아래 새 페이지로 저장한다.
notion-client SDK 대신 requests 로 REST API 를 직접 호출한다 (의존성 최소화).

동작 원칙:
  - 키/부모페이지 미설정은 "실패"가 아니라 "스킵"이다 → NotionNotConfigured (호출측이 경고만).
  - 429·5xx 는 일시적 오류 → call_with_retry 로 3회 지수 백오프.
  - 401·400 등 영구 오류는 즉시 RuntimeError 로 전파한다.
  - 하루 재실행 시 같은 날짜 페이지가 중복 생성될 수 있다 (v1 허용 — AGENT.md 한계 명시).

토큰이 에러 메시지에 새지 않도록 저장·로깅은 호출측(daily_brief)에서 sanitize_error 를 거친다.
"""

import logging
import os

import requests

from services.retry import call_with_retry

logger = logging.getLogger(__name__)

NOTION_API_BASE = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"
RETRYABLE_STATUS = {429, 500, 502, 503, 504}
# Notion paragraph rich_text 는 블록당 2000자 제한.
MAX_BLOCK_CHARS = 2000
_TIMEOUT = 15


class NotionNotConfigured(Exception):
    """NOTION_API_KEY 또는 NOTION_PARENT_PAGE_ID 미설정 — 저장을 건너뛴다(실패 아님)."""


class TransientNotionError(OSError):
    """일시적 Notion 오류(429·5xx) — call_with_retry 재시도 대상 (OSError 하위)."""


def _config() -> tuple[str, str]:
    """(api_key, parent_page_id) 를 반환한다. 하나라도 없으면 NotionNotConfigured."""
    api_key = os.environ.get("NOTION_API_KEY", "").strip()
    parent_page_id = os.environ.get("NOTION_PARENT_PAGE_ID", "").strip()
    if not api_key or not parent_page_id:
        raise NotionNotConfigured(
            "Notion 저장을 건너뜁니다. NOTION_API_KEY 와 NOTION_PARENT_PAGE_ID 를 "
            ".env 에 넣고, 해당 부모 페이지의 '...' 메뉴 → Connections 에 integration 을 "
            "추가해 주세요."
        )
    return api_key, parent_page_id


def _blocks(content: str) -> list[dict]:
    """본문을 2000자 이하 paragraph 블록 리스트로 나눈다 (줄바꿈 경계 우선)."""
    text = content or ""
    chunks: list[str] = []
    remaining = text
    while len(remaining) > MAX_BLOCK_CHARS:
        window = remaining[:MAX_BLOCK_CHARS]
        cut = window.rfind("\n")
        # 줄바꿈이 없거나 너무 앞이면 그냥 최대 길이로 자른다.
        if cut <= 0:
            cut = MAX_BLOCK_CHARS
        chunks.append(remaining[:cut])
        remaining = remaining[cut:]
    chunks.append(remaining)

    return [
        {
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": chunk}}]
            },
        }
        for chunk in chunks
    ]


def save_to_notion(data: dict) -> str | None:
    """브리핑을 Notion 페이지로 저장하고 페이지 URL 을 반환한다.

    data = {"title": str, "content": str, "date": str}
    미설정이면 NotionNotConfigured 를 올린다(호출측이 경고). 그 외 실패는 예외 전파.
    """
    api_key, parent_page_id = _config()
    title = data.get("title") or "Daily Brief"
    content = data.get("content") or ""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }
    body = {
        "parent": {"page_id": parent_page_id},
        "properties": {
            "title": {"title": [{"text": {"content": title}}]},
        },
        "children": _blocks(content),
    }

    def _call() -> dict:
        try:
            resp = requests.post(
                f"{NOTION_API_BASE}/pages",
                headers=headers,
                json=body,
                timeout=_TIMEOUT,
            )
        except requests.exceptions.RequestException as err:  # 연결·타임아웃 등
            raise TransientNotionError(f"Notion 요청 실패: {err}") from err

        if resp.status_code in RETRYABLE_STATUS:
            raise TransientNotionError(
                f"일시적 Notion 오류(status={resp.status_code})"
            )
        if not (200 <= resp.status_code < 300):
            raise RuntimeError(
                f"Notion 저장 실패(status={resp.status_code}): {resp.text[:300]}"
            )
        try:
            return resp.json()
        except ValueError:
            return {}

    page = call_with_retry(
        _call,
        attempts=3,
        base_delay=1.0,
        retry_on=(TransientNotionError, requests.exceptions.RequestException),
    )

    url = page.get("url")
    if url:
        return url
    page_id = page.get("id")
    if page_id:
        return f"https://www.notion.so/{str(page_id).replace('-', '')}"
    return None
