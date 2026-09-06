"""일일 브리핑 에이전트 테스트 (TC-AGENT-01,02,03,06,13,14,15).

daily_brief.py 는 `from ... import name` 으로 이름을 바인딩하므로
monkeypatch 대상은 항상 `daily_brief.<name>` 이다.
외부 호출은 0회 — 모든 데이터 소스와 Claude/Notion 을 패치한다(TC-AGENT-15 제외).
"""

import os
from datetime import datetime

import pytest

import daily_brief
import db


def test_agent_01_build_context_includes_sources(monkeypatch):
    """TC-AGENT-01: 할일/이메일/일정 + 기준시각이 컨텍스트 텍스트에 반영된다."""
    monkeypatch.setattr(
        daily_brief,
        "get_today_tasks",
        lambda: [{"priority": "high", "title": "보고서", "status": "todo"}],
    )
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

    for token in ("보고서", "a@b.com", "제목", "09:00", "스탠드업", "기준 시각:"):
        assert token in text


def test_agent_02_empty_sources(monkeypatch):
    """TC-AGENT-02: 세 소스가 모두 비면 '없음' 이 3번 나오고 예외 없음."""
    monkeypatch.setattr(daily_brief, "get_today_tasks", lambda: [])
    monkeypatch.setattr(daily_brief, "get_unread_emails", lambda: [])
    monkeypatch.setattr(daily_brief, "get_today_events", lambda: [])

    text = daily_brief.build_context()

    assert text.count("없음") == 3


def test_agent_03_claude_failure_is_handled(monkeypatch):
    """TC-AGENT-03: Claude 실패 시 경고 문자열 반환 + Notion/DB 미저장."""
    monkeypatch.setattr(daily_brief, "get_today_tasks", lambda: [])
    monkeypatch.setattr(daily_brief, "get_unread_emails", lambda: [])
    monkeypatch.setattr(daily_brief, "get_today_events", lambda: [])

    def boom(*args, **kwargs):
        raise RuntimeError("API 키 만료")

    notion_calls = []
    upsert_calls = []
    monkeypatch.setattr(daily_brief, "ask", boom)
    monkeypatch.setattr(daily_brief, "save_to_notion", lambda data: notion_calls.append(data))
    monkeypatch.setattr(daily_brief, "upsert_brief", lambda *a, **k: upsert_calls.append(a))

    ok, result = daily_brief._run()

    assert ok is False
    assert result.startswith("⚠️ Claude 호출 실패: ")
    assert "API 키 만료" in result
    assert notion_calls == []
    assert upsert_calls == []


def test_agent_13_task_load_failure_is_isolated(monkeypatch):
    """TC-AGENT-13: 할일 조회 예외 → 대체 문구, 나머지 블록은 정상."""
    def boom():
        raise RuntimeError("DB 잠김")

    monkeypatch.setattr(daily_brief, "get_today_tasks", boom)
    monkeypatch.setattr(
        daily_brief, "get_unread_emails", lambda: [{"from": "a@b.com", "subject": "제목"}]
    )
    monkeypatch.setattr(daily_brief, "get_today_events", lambda: [])

    text = daily_brief.build_context()

    assert "(할일을 불러오지 못함)" in text
    assert "제목" in text


def test_agent_06_brief_saved_to_db(temp_db, monkeypatch):
    """TC-AGENT-06: Claude 응답이 briefs.content 에 저장된다."""
    monkeypatch.setattr(daily_brief, "get_today_tasks", lambda: [])
    monkeypatch.setattr(daily_brief, "get_unread_emails", lambda: [])
    monkeypatch.setattr(daily_brief, "get_today_events", lambda: [])
    monkeypatch.setattr(daily_brief, "ask", lambda *a, **k: "오늘의 우선순위 TOP 3\n1. 집중")
    monkeypatch.setattr(daily_brief, "save_to_notion", lambda data: None)

    ok, _ = daily_brief._run()
    today = f"{datetime.now():%Y-%m-%d}"

    assert ok is True
    assert db.get_brief(today)["content"].startswith("오늘의 우선순위 TOP 3")


def test_agent_14_notion_failure_keeps_local_brief(temp_db, monkeypatch):
    """TC-AGENT-14: Notion 예외 → briefs 행 유지 + 결과에 'Notion 저장만 실패'."""
    monkeypatch.setattr(daily_brief, "get_today_tasks", lambda: [])
    monkeypatch.setattr(daily_brief, "get_unread_emails", lambda: [])
    monkeypatch.setattr(daily_brief, "get_today_events", lambda: [])
    monkeypatch.setattr(daily_brief, "ask", lambda *a, **k: "브리핑 본문")

    def boom(data):
        raise RuntimeError("Notion 토큰 오류")

    monkeypatch.setattr(daily_brief, "save_to_notion", boom)

    ok, result = daily_brief._run()
    today = f"{datetime.now():%Y-%m-%d}"

    assert ok is True
    assert "Notion 저장만 실패" in result
    assert db.get_brief(today)["content"] == "브리핑 본문"


@pytest.mark.network
def test_agent_15_real_claude_smoke(temp_db, monkeypatch):
    """TC-AGENT-15: 실제 Claude 1회 호출 → 비어있지 않은 브리핑 + briefs 저장."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        pytest.skip("ANTHROPIC_API_KEY 미설정")

    monkeypatch.setattr(daily_brief, "get_today_tasks", lambda: [])
    monkeypatch.setattr(daily_brief, "get_unread_emails", lambda: [])
    monkeypatch.setattr(daily_brief, "get_today_events", lambda: [])
    monkeypatch.setattr(daily_brief, "save_to_notion", lambda data: None)

    ok, result = daily_brief._run()
    today = f"{datetime.now():%Y-%m-%d}"

    assert ok is True
    assert result.strip()
    assert db.get_brief(today)["content"].strip()
