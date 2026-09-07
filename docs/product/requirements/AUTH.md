# FR-AUTH — 사용자 / 인증 도메인 상세 명세

> [REQUIREMENTS_FUNCTIONAL.md](REQUIREMENTS_FUNCTIONAL.md) §7 의 AUTH 도메인 상세화.
> 관련 결정: [ADR-0024](../architecture/adr/ADR-0024-oauth-token-storage.md) (Fernet 암호화 토큰 저장), [ADR-0006](../architecture/adr/ADR-0006-agent-owns-external-apis.md).
> 환경변수·최초 로그인 절차: [ENV_REFERENCE.md](../../setup/ENV_REFERENCE.md) §2.

## 공통 규칙

- OAuth 흐름은 **데스크톱(loopback) 흐름** — `InstalledAppFlow.run_local_server`. `GOOGLE_REDIRECT_URI` 는 사용하지 않는다(웹 흐름 도입 시에만).
- 요청 스코프는 정확히 2개, 둘 다 읽기 전용: `gmail.readonly`, `calendar.readonly`.
- 토큰은 `agent/.secrets/google_token.enc` 에 Fernet 암호화 저장(권한 0600). 키는 `TOKEN_ENCRYPTION_KEY` 환경변수.
- 로그·에러 메시지에 credentials·토큰 문자열을 출력하지 않는다. 설정 오류는 스택트레이스 없이 한국어 안내(해결 명령 포함).

---

## FR-AUTH-01 — Google OAuth 2.0 로그인 + 토큰 암호화 저장

**우선순위** P1 · **목표 주차** W6 · **상태** ✅ Phase D2-b (2026-09-07)

### 수용 기준
- **AC-1** `TOKEN_ENCRYPTION_KEY` 미설정 → 한국어 안내(키 생성 명령 포함) 후 실패. 스택트레이스·`ValueError` 누출 없음.
- **AC-2** `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` 미설정 → 동일하게 한국어 안내 후 실패, 브라우저 미기동.
- **AC-3** 최초 실행(`python agent/auth/google_oauth.py login`) → 브라우저 동의 → 토큰 파일 생성. 파일 바이트에 refresh token 평문이 없다(암호문).
- **AC-4** 이후 실행은 브라우저 없이 토큰을 로드하고, 만료 시 refresh token 으로 자동 갱신 후 재저장한다.
- **AC-5** 요청 스코프는 `gmail.readonly` + `calendar.readonly` 뿐.
- **AC-6** 토큰 파일 권한은 0600 이며 `.gitignore`(`.secrets/`, `*.enc`) 대상이다.

### 관련
`agent/auth/google_oauth.py` · [ADR-0024](../architecture/adr/ADR-0024-oauth-token-storage.md)
TC: TC-AUTH-01~08

---

## 이월

- **FR-AUTH-02** (다중 사용자·데이터 분리) — W10 이후, Supabase 와 함께.
- **FR-AUTH-03** (로그아웃 시 토큰 폐기) — `google_oauth.logout()` 가 토큰 파일을 삭제한다(TC-AUTH-08). 정식 상태 갱신은 별도 Phase.
