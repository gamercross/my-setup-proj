"""Notion 저장 단위 테스트 (TC-AGENT-22~28).

requests.post 를 monkeypatch 하고 retry.sleep 을 무력화해 네트워크·대기 없이 검증한다.
"""

import pytest

import services.retry as retry
from services import notion
from services.notion import NotionNotConfigured, save_to_notion


class FakeResp:
    def __init__(self, status_code, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload if payload is not None else {}
        self.text = text or ""

    def json(self):
        return self._payload


@pytest.fixture(autouse=True)
def _no_sleep(monkeypatch):
    """실제 대기를 없앤다."""
    calls = []
    monkeypatch.setattr(retry, "sleep", lambda s: calls.append(s))
    return calls


@pytest.fixture
def _configured(monkeypatch):
    monkeypatch.setenv("NOTION_API_KEY", "secret_TOKEN123")
    monkeypatch.setenv("NOTION_PARENT_PAGE_ID", "parent-page-abc")


def test_agent_22_save_returns_url_and_builds_body(monkeypatch, _configured):
    """TC-AGENT-22: 200 응답 → URL 반환, body/헤더에 필수 필드."""
    seen = {}

    def fake_post(url, headers=None, json=None, timeout=None):
        seen["url"] = url
        seen["headers"] = headers
        seen["json"] = json
        return FakeResp(200, {"url": "https://notion.so/page-1", "id": "abc"})

    monkeypatch.setattr(notion.requests, "post", fake_post)

    out = save_to_notion({"title": "Daily Brief - 2026-09-07", "content": "본문", "date": "x"})

    assert out == "https://notion.so/page-1"
    assert seen["url"].endswith("/v1/pages")
    assert seen["headers"]["Notion-Version"] == "2022-06-28"
    assert seen["headers"]["Authorization"].startswith("Bearer ")
    assert seen["json"]["parent"]["page_id"] == "parent-page-abc"
    assert seen["json"]["properties"]["title"]["title"][0]["text"]["content"].startswith("Daily Brief")
    assert len(seen["json"]["children"]) >= 1


def test_agent_23_missing_api_key(monkeypatch):
    """TC-AGENT-23: NOTION_API_KEY 없음 → NotionNotConfigured, requests.post 미호출."""
    monkeypatch.delenv("NOTION_API_KEY", raising=False)
    monkeypatch.setenv("NOTION_PARENT_PAGE_ID", "parent-page-abc")
    called = []
    monkeypatch.setattr(notion.requests, "post", lambda *a, **k: called.append(1))

    with pytest.raises(NotionNotConfigured):
        save_to_notion({"title": "t", "content": "c", "date": "x"})
    assert called == []


def test_agent_24_missing_parent_page(monkeypatch):
    """TC-AGENT-24: 부모 페이지 id 만 없음 → NotionNotConfigured + 안내 문구."""
    monkeypatch.setenv("NOTION_API_KEY", "secret_x")
    monkeypatch.delenv("NOTION_PARENT_PAGE_ID", raising=False)
    monkeypatch.setattr(notion.requests, "post", lambda *a, **k: pytest.fail("호출되면 안 됨"))

    with pytest.raises(NotionNotConfigured) as ei:
        save_to_notion({"title": "t", "content": "c", "date": "x"})
    msg = str(ei.value)
    assert ".env" in msg and "Connections" in msg


def test_agent_25_retries_on_429_then_succeeds(monkeypatch, _configured, _no_sleep):
    """TC-AGENT-25: 429 두 번 → 3회째 200, sleep 1s·2s."""
    seq = [FakeResp(429, text="rate"), FakeResp(429, text="rate"),
           FakeResp(200, {"url": "https://notion.so/ok"})]

    def fake_post(*a, **k):
        return seq.pop(0)

    monkeypatch.setattr(notion.requests, "post", fake_post)

    out = save_to_notion({"title": "t", "content": "c", "date": "x"})
    assert out == "https://notion.so/ok"
    assert _no_sleep == [1.0, 2.0]


def test_agent_26_no_retry_on_401(monkeypatch, _configured, _no_sleep):
    """TC-AGENT-26: 401 → 재시도 없이 즉시 RuntimeError, sleep 미호출."""
    calls = []

    def fake_post(*a, **k):
        calls.append(1)
        return FakeResp(401, text='{"message":"unauthorized"}')

    monkeypatch.setattr(notion.requests, "post", fake_post)

    with pytest.raises(RuntimeError):
        save_to_notion({"title": "t", "content": "c", "date": "x"})
    assert calls == [1]
    assert _no_sleep == []


def test_agent_27_long_content_splits_blocks(monkeypatch, _configured):
    """TC-AGENT-27: 5000자 → children 3블록, 각 ≤2000자."""
    seen = {}

    def fake_post(url, headers=None, json=None, timeout=None):
        seen["json"] = json
        return FakeResp(200, {"url": "https://notion.so/ok"})

    monkeypatch.setattr(notion.requests, "post", fake_post)

    save_to_notion({"title": "t", "content": "가" * 5000, "date": "x"})
    blocks = seen["json"]["children"]
    assert len(blocks) == 3
    for b in blocks:
        assert len(b["paragraph"]["rich_text"][0]["text"]["content"]) <= 2000


def test_agent_28_error_text_is_sanitized_when_logged():
    """TC-AGENT-28: sanitize_error 가 토큰을 *** 로 가린다 (daily_brief 가 저장 전 호출)."""
    from services.sanitize import sanitize_error

    out = sanitize_error("Notion 저장 실패: Authorization: Bearer secret_abc123")
    assert "secret_abc123" not in out
    assert "***" in out
