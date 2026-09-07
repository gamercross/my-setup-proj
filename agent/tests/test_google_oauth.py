"""agent/auth/google_oauth.py 테스트 (TC-AUTH-01~08).

Credentials / Fernet 는 실제 라이브러리를 쓰고, InstalledAppFlow 만 monkeypatch 한다.
네트워크 호출 0회.
"""

import os

import pytest
from cryptography.fernet import Fernet

from auth import google_oauth as go

_VALID_KEY = Fernet.generate_key().decode()
_REFRESH_SECRET = "1//super-secret-refresh-token-value"


@pytest.fixture
def token_path(tmp_path, monkeypatch):
    path = tmp_path / ".secrets" / "google_token.enc"
    monkeypatch.setenv("GOOGLE_TOKEN_PATH", str(path))
    monkeypatch.setenv("TOKEN_ENCRYPTION_KEY", _VALID_KEY)
    return path


def _dummy_creds():
    from google.oauth2.credentials import Credentials

    return Credentials(
        token="ya29.dummy-access-token",
        refresh_token=_REFRESH_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
        client_id="cid.apps.googleusercontent.com",
        client_secret="csecret",
        scopes=go.SCOPES,
    )


def test_auth_01_missing_encryption_key(monkeypatch):
    """TC-AUTH-01: 키 미설정 → TokenEncryptionKeyMissing + 생성 명령 안내."""
    monkeypatch.delenv("TOKEN_ENCRYPTION_KEY", raising=False)
    with pytest.raises(go.TokenEncryptionKeyMissing) as ei:
        go._get_fernet()
    assert "Fernet.generate_key" in str(ei.value)


def test_auth_02_malformed_encryption_key(monkeypatch):
    """TC-AUTH-02: 잘못된 키 → 동일 예외 (ValueError 누출 금지)."""
    monkeypatch.setenv("TOKEN_ENCRYPTION_KEY", "not-a-key")
    with pytest.raises(go.TokenEncryptionKeyMissing):
        go._get_fernet()


def test_auth_03_saved_token_is_encrypted_and_0600(token_path):
    """TC-AUTH-03: 저장 파일에 refresh token 평문이 없고 권한이 0600."""
    go.save_credentials(_dummy_creds())
    raw = token_path.read_bytes()
    assert _REFRESH_SECRET.encode() not in raw
    assert b"refresh_token" not in raw
    assert (os.stat(token_path).st_mode & 0o777) == 0o600


def test_auth_04_save_load_roundtrip(token_path):
    """TC-AUTH-04: save → load 왕복 시 refresh token 이 복원된다."""
    go.save_credentials(_dummy_creds())
    loaded = go.load_credentials()
    assert loaded.refresh_token == _REFRESH_SECRET


def test_auth_05_missing_token_file(token_path):
    """TC-AUTH-05: 파일 없음 → GoogleNotAuthorized + 로그인 명령."""
    with pytest.raises(go.GoogleNotAuthorized) as ei:
        go.load_credentials()
    assert "login" in str(ei.value)


def test_auth_06_login_without_client_id(monkeypatch):
    """TC-AUTH-06: CLIENT_ID 미설정 login() → GoogleClientConfigMissing, 브라우저 미기동."""
    monkeypatch.setenv("TOKEN_ENCRYPTION_KEY", _VALID_KEY)
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    monkeypatch.delenv("GOOGLE_CLIENT_SECRET", raising=False)

    called = {"flow": False}

    def _boom(*a, **k):
        called["flow"] = True
        raise AssertionError("브라우저 흐름이 시작되면 안 된다")

    from google_auth_oauthlib.flow import InstalledAppFlow

    monkeypatch.setattr(InstalledAppFlow, "from_client_config", staticmethod(_boom))

    with pytest.raises(go.GoogleClientConfigMissing):
        go.login()
    assert called["flow"] is False


def test_auth_07_scopes_are_readonly_pair():
    """TC-AUTH-07: 스코프는 정확히 2개이며 둘 다 .readonly."""
    assert len(go.SCOPES) == 2
    assert all(s.endswith(".readonly") for s in go.SCOPES)


def test_auth_08_logout_is_idempotent(token_path):
    """TC-AUTH-08: logout 이 파일을 삭제하고, 재호출해도 예외 없음."""
    go.save_credentials(_dummy_creds())
    assert token_path.exists()
    go.logout()
    assert not token_path.exists()
    go.logout()  # 재호출 — 예외 없어야 한다
