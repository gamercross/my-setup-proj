"""Google OAuth 2.0 데스크톱 흐름 + 암호화 토큰 저장 (Phase D2-b, FR-AUTH-01).

- 최초 실행: `python auth/google_oauth.py login` → 브라우저 동의 → 토큰 저장.
- 이후 실행: 저장된 토큰을 복호화해 로드하고, 만료 시 refresh token 으로 자동 갱신.
- 저장 포맷: Fernet 으로 암호화한 JSON 파일 (ADR-0024, NFR-SEC-05).
  키는 환경변수 TOKEN_ENCRYPTION_KEY 에서 읽는다 (코드/파일에 하드코딩 금지).

스코프는 읽기 전용 2개(gmail.readonly, calendar.readonly)로 제한한다 (FR-AUTH-01 AC-5).
로그에 credentials·토큰 문자열을 절대 출력하지 않는다.
"""

import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# claude.py / db.py 와 동일하게 모듈 로드 시 .env 를 읽는다.
load_dotenv()

logger = logging.getLogger(__name__)

# 읽기 전용 스코프만 요청한다 (FR-AUTH-01 AC-5).
SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
]

_SECRETS_DIR = Path(__file__).resolve().parent.parent / ".secrets"
DEFAULT_TOKEN_PATH = _SECRETS_DIR / "google_token.enc"

# Fernet 키 생성 명령 (에러 메시지에 그대로 노출한다).
_KEYGEN_HINT = (
    'python -c "from cryptography.fernet import Fernet; '
    'print(Fernet.generate_key().decode())"'
)


# ── 예외 계층 ──────────────────────────────────────────────
class GoogleAuthError(RuntimeError):
    """Google 인증 관련 최상위 예외."""


class TokenEncryptionKeyMissing(GoogleAuthError):
    """TOKEN_ENCRYPTION_KEY 가 없거나 형식이 잘못됨."""


class GoogleClientConfigMissing(GoogleAuthError):
    """GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET 미설정."""


class GoogleNotAuthorized(GoogleAuthError):
    """저장된 토큰이 없거나 복호화할 수 없음 — 재로그인 필요."""


def resolve_token_path() -> Path:
    """토큰 파일 경로를 해석한다 (GOOGLE_TOKEN_PATH env 우선)."""
    raw = os.environ.get("GOOGLE_TOKEN_PATH", "").strip()
    return Path(raw) if raw else DEFAULT_TOKEN_PATH


def _get_fernet():
    """TOKEN_ENCRYPTION_KEY 를 검증해 Fernet 인스턴스를 만든다.

    키가 없거나 형식이 잘못되면 TokenEncryptionKeyMissing 을 던진다
    (cryptography 의 ValueError 를 그대로 누출하지 않는다 — FR-AUTH-01 AC-1/AC-2).
    """
    from cryptography.fernet import Fernet

    key = os.environ.get("TOKEN_ENCRYPTION_KEY", "").strip()
    if not key:
        raise TokenEncryptionKeyMissing(
            "TOKEN_ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.\n"
            "아래 명령으로 키를 생성해 .env 에 넣으세요:\n"
            f"  {_KEYGEN_HINT}"
        )
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except (ValueError, TypeError) as err:
        raise TokenEncryptionKeyMissing(
            "TOKEN_ENCRYPTION_KEY 형식이 올바르지 않습니다 "
            "(32바이트 url-safe base64 여야 합니다).\n"
            "아래 명령으로 새 키를 생성하세요:\n"
            f"  {_KEYGEN_HINT}"
        ) from err


def _client_config() -> dict:
    """installed-app(데스크톱) OAuth 클라이언트 설정 dict 를 만든다.

    GOOGLE_REDIRECT_URI 는 데스크톱 loopback 흐름에서 사용하지 않는다
    (웹 흐름 도입 시에만 필요 — ENV_REFERENCE 참고).
    """
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise GoogleClientConfigMissing(
            "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET 가 설정되지 않았습니다.\n"
            "Google Cloud Console → API 및 서비스 → 사용자 인증 정보에서 "
            "'데스크톱 앱' OAuth 클라이언트를 만들고 .env 에 넣으세요."
        )
    return {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost"],
        }
    }


def save_credentials(creds) -> None:
    """Credentials 를 JSON→Fernet 암호화해 토큰 파일에 저장한다 (파일 권한 0600)."""
    fernet = _get_fernet()
    path = resolve_token_path()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        token = fernet.encrypt(creds.to_json().encode("utf-8"))
        path.write_bytes(token)
        os.chmod(path, 0o600)
        logger.info("토큰 저장 완료 (%s)", path)
    except OSError as err:
        raise GoogleAuthError(f"토큰 파일 저장 실패: {err}") from err


def load_credentials():
    """토큰 파일을 복호화해 Credentials 를 만든다.

    파일이 없으면 GoogleNotAuthorized, 복호화 실패도 GoogleNotAuthorized.
    """
    from cryptography.fernet import InvalidToken
    from google.oauth2.credentials import Credentials

    fernet = _get_fernet()
    path = resolve_token_path()
    if not path.exists():
        raise GoogleNotAuthorized(
            "저장된 Google 토큰이 없습니다. 먼저 로그인하세요:\n"
            "  python auth/google_oauth.py login"
        )
    try:
        raw = fernet.decrypt(path.read_bytes())
    except InvalidToken as err:
        raise GoogleNotAuthorized(
            "토큰 파일을 복호화할 수 없습니다 (키가 바뀌었거나 파일이 손상됨). "
            "다시 로그인하세요:\n  python auth/google_oauth.py login"
        ) from err
    except OSError as err:
        raise GoogleAuthError(f"토큰 파일 읽기 실패: {err}") from err

    import json

    info = json.loads(raw.decode("utf-8"))
    return Credentials.from_authorized_user_info(info, SCOPES)


def login(*, port: int = 0):
    """브라우저 동의 흐름을 실행하고 토큰을 저장한 뒤 Credentials 를 반환한다."""
    from google_auth_oauthlib.flow import InstalledAppFlow

    config = _client_config()  # CLIENT_ID 미설정 시 여기서 GoogleClientConfigMissing
    flow = InstalledAppFlow.from_client_config(config, SCOPES)
    creds = flow.run_local_server(port=port)
    save_credentials(creds)
    logger.info("Google 로그인 완료 — 스코프 %d개", len(SCOPES))
    return creds


def get_credentials():
    """유효한 Credentials 를 반환한다. 만료 + refresh token 이 있으면 자동 갱신한다."""
    from google.auth.transport.requests import Request

    creds = load_credentials()
    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            save_credentials(creds)
            logger.info("만료된 토큰을 갱신했습니다")
        except Exception as err:  # noqa: BLE001 - refresh 실패는 재로그인 유도
            raise GoogleNotAuthorized(
                "토큰 갱신에 실패했습니다. 다시 로그인하세요:\n"
                "  python auth/google_oauth.py login"
            ) from err
    return creds


def build_service(api: str, version: str):
    """googleapiclient 서비스 객체를 만든다 (get_credentials 사용)."""
    from googleapiclient.discovery import build

    creds = get_credentials()
    return build(api, version, credentials=creds, cache_discovery=False)


def logout() -> None:
    """토큰 파일을 삭제한다. 파일이 없어도 예외를 던지지 않는다."""
    path = resolve_token_path()
    try:
        path.unlink()
        logger.info("토큰 파일을 삭제했습니다 (%s)", path)
    except FileNotFoundError:
        logger.info("삭제할 토큰 파일이 없습니다")
    except OSError as err:
        raise GoogleAuthError(f"토큰 파일 삭제 실패: {err}") from err


def _main(argv) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    cmd = argv[1] if len(argv) > 1 else ""
    try:
        if cmd == "login":
            login()
            print("로그인 완료. 토큰이 저장되었습니다.")
            return 0
        if cmd == "logout":
            logout()
            print("로그아웃 완료.")
            return 0
        print("사용법: python auth/google_oauth.py [login|logout]")
        return 2
    except GoogleAuthError as err:
        # 스택트레이스 없이 한국어 안내만 출력한다 (FR-AUTH-01 AC-1).
        print(f"오류: {err}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(_main(sys.argv))
