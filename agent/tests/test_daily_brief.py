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
        lambda: [{"from_address": "a@b.com", "subject": "제목"}],
    )
    monkeypatch.setattr(
        daily_brief,
        "get_today_events",
        lambda: [{"start_time": "09:00", "title": "스탠드업"}],
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
        daily_brief, "get_unread_emails", lambda: [{"from_address": "a@b.com", "subject": "제목"}]
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


def _sync_rows(service):
    """temp_db 의 sync_logs 행을 (status, error_message) 리스트로 반환한다."""
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT status, error_message FROM sync_logs WHERE service = ? ORDER BY id",
            (service,),
        ).fetchall()
    return [(r["status"], r["error_message"]) for r in rows]


def test_agent_04_notion_failure_logs_sync(temp_db, monkeypatch):
    """TC-AGENT-04: Notion 예외 → briefs 유지, sync_logs('notion','failed') 1행, notion_url NULL."""
    monkeypatch.setattr(daily_brief, "get_today_tasks", lambda: [])
    monkeypatch.setattr(daily_brief, "get_unread_emails", lambda: [])
    monkeypatch.setattr(daily_brief, "get_today_events", lambda: [])
    monkeypatch.setattr(daily_brief, "ask", lambda *a, **k: "브리핑 본문")

    def boom(data):
        raise RuntimeError("Authorization: Bearer secret_abc123")

    monkeypatch.setattr(daily_brief, "save_to_notion", boom)

    ok, result = daily_brief._run()
    today = f"{datetime.now():%Y-%m-%d}"

    assert ok is True
    row = db.get_brief(today)
    assert row["content"] == "브리핑 본문"
    assert row["notion_url"] is None
    logs = _sync_rows("notion")
    assert len(logs) == 1
    assert logs[0][0] == "failed"
    assert "secret_abc123" not in logs[0][1]  # 마스킹됨


def test_agent_29_notion_success_fills_url(temp_db, monkeypatch):
    """TC-AGENT-29: save_to_notion → URL → briefs.notion_url 채움, sync_logs success, created_at 불변."""
    monkeypatch.setattr(daily_brief, "get_today_tasks", lambda: [])
    monkeypatch.setattr(daily_brief, "get_unread_emails", lambda: [])
    monkeypatch.setattr(daily_brief, "get_today_events", lambda: [])
    monkeypatch.setattr(daily_brief, "ask", lambda *a, **k: "브리핑 본문")
    monkeypatch.setattr(daily_brief, "save_to_notion", lambda data: "https://notion.so/page-x")

    ok, _ = daily_brief._run()
    today = f"{datetime.now():%Y-%m-%d}"

    assert ok is True
    row = db.get_brief(today)
    assert row["notion_url"] == "https://notion.so/page-x"
    assert _sync_rows("notion") == [("success", None)]


def test_agent_30_notion_not_configured_is_skipped(temp_db, monkeypatch):
    """TC-AGENT-30: NotionNotConfigured → _run() True, 결과에 ℹ️, sync_logs 0행, 브리핑은 저장됨."""
    monkeypatch.setattr(daily_brief, "get_today_tasks", lambda: [])
    monkeypatch.setattr(daily_brief, "get_unread_emails", lambda: [])
    monkeypatch.setattr(daily_brief, "get_today_events", lambda: [])
    monkeypatch.setattr(daily_brief, "ask", lambda *a, **k: "브리핑 본문")

    def not_configured(data):
        raise daily_brief.NotionNotConfigured("NOTION_PARENT_PAGE_ID 를 .env 에 넣고 Connections 추가")

    monkeypatch.setattr(daily_brief, "save_to_notion", not_configured)

    ok, result = daily_brief._run()
    today = f"{datetime.now():%Y-%m-%d}"

    assert ok is True
    assert "ℹ️" in result
    assert _sync_rows("notion") == []
    assert db.get_brief(today)["content"] == "브리핑 본문"


def test_agent_19_run_bootstraps_schema_on_empty_db(tmp_path, monkeypatch):
    """TC-AGENT-19: 빈 DB 에서 _run() 이 ensure_schema 로 테이블을 만든 뒤 정상 진행한다."""
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "fresh.db"))  # 부트스트랩 안 된 경로
    monkeypatch.setattr(daily_brief, "get_today_tasks", lambda: [])
    monkeypatch.setattr(daily_brief, "get_unread_emails", lambda: [])
    monkeypatch.setattr(daily_brief, "get_today_events", lambda: [])
    monkeypatch.setattr(daily_brief, "ask", lambda *a, **k: "브리핑 본문")
    monkeypatch.setattr(daily_brief, "save_to_notion", lambda data: None)

    ok, _ = daily_brief._run()
    today = f"{datetime.now():%Y-%m-%d}"

    assert ok is True
    assert db.get_brief(today)["content"] == "브리핑 본문"


def test_agent_20_email_cache_failure_is_isolated(monkeypatch):
    """TC-AGENT-20: 이메일 캐시 조회 예외 → 대체 문구 + 할일 블록 정상."""
    def boom():
        raise RuntimeError("DB 잠김")

    monkeypatch.setattr(
        daily_brief, "get_today_tasks",
        lambda: [{"priority": "high", "title": "보고서", "status": "todo"}],
    )
    monkeypatch.setattr(daily_brief, "get_unread_emails", boom)
    monkeypatch.setattr(daily_brief, "get_today_events", lambda: [])

    text = daily_brief.build_context()

    assert "(이메일을 불러오지 못함)" in text
    assert "보고서" in text


def test_agent_21_build_context_does_not_import_network_services():
    """TC-AGENT-21: daily_brief 는 services.gmail / services.calendar 를 import 하지 않는다."""
    import inspect

    src = inspect.getsource(daily_brief)
    assert "services.gmail" not in src
    assert "services.calendar" not in src


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
