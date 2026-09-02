"""일일 브리핑 에이전트 테스트 (TC-AGENT-01,02,03).

daily_brief.py 는 `from services... import name` 으로 이름을 바인딩하므로
monkeypatch 대상은 항상 `daily_brief.<name>` 이다 (services.* 패치는 무효).
외부 호출은 0회 — 모든 데이터 소스와 Claude/Notion 을 패치한다.
"""

import daily_brief


def test_agent_01_build_context_includes_sources(monkeypatch):
    """TC-AGENT-01: 이메일/일정 내용이 컨텍스트 텍스트에 반영된다."""
    monkeypatch.setattr(
        daily_brief,
        "get_unread_emails",
        lambda: [{"from": "a@b.com", "subject": "제목"}],
    )
    monkeypatch.setattr(
        daily_brief,
        "get_today_events",
        lambda: [{"start": "09:00", "title": "스탠드업"}],
    )

    text = daily_brief.build_context()

    for token in ("a@b.com", "제목", "09:00", "스탠드업", "기준 시각:"):
        assert token in text


def test_agent_02_empty_sources(monkeypatch):
    """TC-AGENT-02: 두 소스가 비면 '없음' 이 2번 나오고 예외 없음."""
    monkeypatch.setattr(daily_brief, "get_unread_emails", lambda: [])
    monkeypatch.setattr(daily_brief, "get_today_events", lambda: [])

    text = daily_brief.build_context()

    assert text.count("없음") == 2


def test_agent_03_claude_failure_is_handled(monkeypatch):
    """TC-AGENT-03: Claude 호출 실패 시 경고 문자열 반환 + Notion 미저장."""
    monkeypatch.setattr(daily_brief, "get_unread_emails", lambda: [])
    monkeypatch.setattr(daily_brief, "get_today_events", lambda: [])

    def boom(*args, **kwargs):
        raise RuntimeError("API 키 만료")

    calls = []
    monkeypatch.setattr(daily_brief, "ask", boom)
    monkeypatch.setattr(
        daily_brief, "save_to_notion", lambda data: calls.append(data)
    )

    result = daily_brief.generate_daily_brief()

    assert result.startswith("⚠️ Claude 호출 실패: ")
    assert "API 키 만료" in result
    assert calls == []
