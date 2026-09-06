"""에이전트 테스트 공용 fixture."""

import pytest

import db


@pytest.fixture
def temp_db(tmp_path, monkeypatch):
    """임시 파일 SQLite 를 DATABASE_PATH 로 지정하고 스키마를 부트스트랩한다.

    briefs 의 WAL 특성상 :memory: 는 부적합 — 파일 DB 를 쓴다.
    """
    path = tmp_path / "app.db"
    monkeypatch.setenv("DATABASE_PATH", str(path))
    with db.connect() as conn:
        db.ensure_schema(conn)
    return str(path)
