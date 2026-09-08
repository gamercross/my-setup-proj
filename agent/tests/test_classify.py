"""agent/classify.py 테스트 (TC-AGENT-31~40 / FR-TASK-08).

Claude 호출은 전부 monkeypatch — network 마커 없음.
"""

import sqlite3
from datetime import datetime

import pytest

import classify
import db


def _insert_task(path, *, title, status="todo", description=""):
    now = datetime.now().isoformat()
    with sqlite3.connect(path) as conn:
        cur = conn.execute(
            "INSERT INTO tasks (title, description, priority, status, created_at, updated_at) "
            "VALUES (?, ?, 'medium', ?, ?, ?)",
            (title, description, status, now, now),
        )
        return cur.lastrowid


def _tags(path, task_id):
    with sqlite3.connect(path) as conn:
        rows = conn.execute(
            "SELECT tag, source FROM task_tags WHERE task_id = ? ORDER BY tag", (task_id,)
        ).fetchall()
    return rows


# ── 순수 함수 ──────────────────────────────────────────

def test_agent_31_parse_tags_ok():
    """TC-AGENT-31: 정상 JSON → {id: [tags]}."""
    out = classify.parse_tags('{"tags": {"1": ["공부", "시험"], "2": ["건강"]}}')
    assert out == {1: ["공부", "시험"], 2: ["건강"]}


def test_agent_32_parse_tags_strips_code_fence():
    """TC-AGENT-32: ```json 펜스를 제거하고 파싱한다."""
    text = '```json\n{"tags": {"3": ["업무"]}}\n```'
    assert classify.parse_tags(text) == {3: ["업무"]}


def test_agent_33_parse_tags_enforces_limits():
    """TC-AGENT-33: 최대 3개, 중복 제거, 1~20자 초과 태그는 버린다."""
    long = "x" * 21
    out = classify.parse_tags(
        '{"tags": {"1": ["a", "a", "b", "c", "d", "' + long + '"]}}'
    )
    assert out == {1: ["a", "b", "c"]}


def test_agent_34_parse_tags_rejects_bad_format():
    """TC-AGENT-34: 형식 위반은 ValueError."""
    for bad in ["not json", "{}", '{"tags": []}', '{"tags": {"x": ["a"]}}']:
        with pytest.raises(ValueError):
            classify.parse_tags(bad)


def test_agent_35_build_prompt_lists_ids():
    """TC-AGENT-35: 프롬프트에 각 할일의 id 와 제목이 들어간다."""
    p = classify.build_prompt([{"id": 7, "title": "치과 예약", "description": ""}])
    assert "id=7" in p and "치과 예약" in p


# ── classify_untagged ─────────────────────────────────

def test_agent_36_no_targets_skips_claude(temp_db, monkeypatch):
    """TC-AGENT-36: 대상 0건이면 ask 호출 0회, 반환 0."""
    calls = []
    monkeypatch.setattr(classify, "ask", lambda *a, **k: calls.append(1) or "{}")
    assert classify.classify_untagged() == 0
    assert calls == []


def test_agent_37_success_writes_agent_tags_and_logs(temp_db, monkeypatch):
    """TC-AGENT-37: 성공 시 source='agent' 태그 저장 + sync_logs('classify','success').

    할일이 여러 건이어도 ask 는 정확히 1회만 호출한다 ("할일당 1회" 회귀 방지).
    """
    tid = _insert_task(temp_db, title="운영체제 과제")
    tid2 = _insert_task(temp_db, title="치과 예약")
    tid3 = _insert_task(temp_db, title="장보기")

    calls = []

    def fake_ask(*a, **k):
        calls.append(1)
        return (
            '{"tags": {"'
            + str(tid)
            + '": ["공부"], "'
            + str(tid2)
            + '": ["건강"], "'
            + str(tid3)
            + '": ["집안일"]}}'
        )

    monkeypatch.setattr(classify, "ask", fake_ask)

    written = classify.classify_untagged()

    assert len(calls) == 1, "배치 1회만 호출해야 한다"
    assert written == 3
    assert _tags(temp_db, tid) == [("공부", "agent")]
    with db.connect() as conn:
        row = conn.execute(
            "SELECT status FROM sync_logs WHERE service='classify'"
        ).fetchone()
    assert row[0] == "success"


def test_agent_38_failure_is_isolated_and_logged(temp_db, monkeypatch):
    """TC-AGENT-38: ask 예외 → 반환 0, 전파 없음, sync_logs('classify','failed')."""
    _insert_task(temp_db, title="분류 대상")

    def boom(*a, **k):
        raise RuntimeError("classify 폭발")

    monkeypatch.setattr(classify, "ask", boom)

    assert classify.classify_untagged() == 0
    with db.connect() as conn:
        row = conn.execute(
            "SELECT status, error_message FROM sync_logs WHERE service='classify'"
        ).fetchone()
    assert row[0] == "failed"


def test_agent_add_agent_tags_skips_already_tagged(temp_db, monkeypatch):
    """TC-AGENT-39: 이미 source='user' 태그가 있는 할일에는 에이전트 태그를 넣지 않는다."""
    tid = _insert_task(temp_db, title="이미 태그됨")
    with db.connect() as conn:
        with conn:
            conn.execute(
                "INSERT INTO task_tags (task_id, tag, source, created_at) "
                "VALUES (?, '수동', 'user', ?)",
                (tid, datetime.now().isoformat()),
            )
    written = db.add_agent_tags({tid: ["자동"]})
    assert written == 0
    assert _tags(temp_db, tid) == [("수동", "user")]


def test_agent_get_untagged_excludes_done_and_tagged(temp_db):
    """TC-AGENT-40: get_untagged_tasks 는 완료·태그 있는 할일은 제외한다."""
    a = _insert_task(temp_db, title="대상")
    _insert_task(temp_db, title="완료됨", status="done")
    tagged = _insert_task(temp_db, title="태그있음")
    with db.connect() as conn:
        with conn:
            conn.execute(
                "INSERT INTO task_tags (task_id, tag, source, created_at) VALUES (?, 't', 'user', ?)",
                (tagged, datetime.now().isoformat()),
            )
    ids = [t["id"] for t in db.get_untagged_tasks()]
    assert ids == [a]
