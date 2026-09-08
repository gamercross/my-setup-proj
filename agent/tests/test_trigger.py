"""지금 실행 트리거 테스트 (TC-AGENT-41~45) — P7, FR-AGENT-08.

파일 IO 만 다루므로 network 마커가 필요 없다. sync.sync_all 은 패치한다.
trigger.py 는 `import sync` 하므로 패치 대상은 `trigger.sync.sync_all` 이다.
"""

import trigger


def test_agent_41_consume_없으면_false(tmp_path):
    """TC-AGENT-41: 플래그 파일이 없으면 consume() 은 False."""
    assert trigger.consume(tmp_path / "run-now") is False


def test_agent_42_consume_있으면_삭제하고_true(tmp_path):
    """TC-AGENT-42: 플래그가 있으면 True 를 반환하고 파일을 삭제한다."""
    flag = tmp_path / "run-now"
    flag.write_text("2026-09-08T00:00:00Z\n")
    assert trigger.consume(flag) is True
    assert not flag.exists()


def test_agent_43_main_플래그_없으면_sync_미호출_0(tmp_path, monkeypatch):
    """TC-AGENT-43: 플래그가 없으면 main() 은 sync 를 호출하지 않고 0 을 반환한다."""
    monkeypatch.setattr(trigger, "FLAG_PATH", tmp_path / "run-now")
    called = {"n": 0}

    def fake_sync_all():
        called["n"] += 1
        return {"gmail": True}

    monkeypatch.setattr(trigger.sync, "sync_all", fake_sync_all)
    assert trigger.main() == 0
    assert called["n"] == 0


def test_agent_44_main_플래그_있으면_삭제후_sync_실행(tmp_path, monkeypatch):
    """TC-AGENT-44: 삭제가 sync 실행보다 먼저다. 전부 성공이면 0, 하나라도 실패면 1.

    뮤테이션 방어: sync_all 호출 시점에 플래그가 이미 없어야 한다.
    (main() 반환 후가 아니라 sync 실행 중을 관찰한다.)
    """
    flag = tmp_path / "run-now"
    flag.write_text("x\n")
    monkeypatch.setattr(trigger, "FLAG_PATH", flag)

    seen = {}

    def fake_sync_all():
        seen["flag_exists_during_sync"] = flag.exists()
        return {"gmail": True, "calendar": True}

    monkeypatch.setattr(trigger.sync, "sync_all", fake_sync_all)
    assert trigger.main() == 0
    assert seen["flag_exists_during_sync"] is False  # 삭제가 sync 보다 먼저
    assert not flag.exists()

    flag.write_text("x\n")
    monkeypatch.setattr(trigger.sync, "sync_all", lambda: {"gmail": True, "calendar": False})
    assert trigger.main() == 1


def test_agent_45_sync_예외여도_플래그는_남지_않는다(tmp_path, monkeypatch):
    """TC-AGENT-45: sync_all 이 예외를 던져도 플래그는 이미 삭제돼 남지 않는다.

    (플래그가 남으면 launchd 재감지 → 무한 재실행 루프가 된다.)
    main() 이 예외를 전파하든 1을 반환하든 상관없이 플래그는 없어야 한다.
    """
    flag = tmp_path / "run-now"
    flag.write_text("x\n")
    monkeypatch.setattr(trigger, "FLAG_PATH", flag)

    def boom():
        raise RuntimeError("sync 폭발")

    monkeypatch.setattr(trigger.sync, "sync_all", boom)
    try:
        trigger.main()
    except RuntimeError:
        pass
    assert not flag.exists()  # 예외와 무관하게 플래그는 소비됨
