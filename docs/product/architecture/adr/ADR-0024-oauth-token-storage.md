# ADR-0024: OAuth 토큰은 Fernet 암호화 JSON 파일로 저장

- 상태: 채택 (2026-09-07)
- 관련: FR-AUTH-01, NFR-SEC-05, [ADR-0006](ADR-0006-agent-owns-external-apis.md), Phase D2-b

## 맥락
Phase D2-b 에서 에이전트가 Google(Gmail·Calendar)에 실제로 접속하려면 OAuth refresh token 을
로컬에 보관해야 한다. `google-auth` 기본값은 `token.json` 평문 저장인데, 이는 실수로 커밋되거나
백업·동기화 폴더로 새어나가면 곧바로 계정 접근 토큰이 유출된다(NFR-SEC-05 위반).
1인 데스크톱 앱이라는 제약 안에서 저장 포맷을 정해야 한다.

## 결정
refresh token 을 포함한 credentials JSON 을 **Fernet(대칭키)로 암호화한 단일 파일**
(`agent/.secrets/google_token.enc`, 권한 0600)로 저장한다. 키는 환경변수
`TOKEN_ENCRYPTION_KEY` 에서만 읽는다(코드·파일에 하드코딩 금지). `.secrets/`·`*.enc` 는
`.gitignore` 대상이다.

## 근거
- **실수 커밋 / 백업 유출 방어**가 1차 목표다. 암호문만으로는 토큰을 복원할 수 없다.
- Fernet 은 `cryptography` 표준 제공, 키 생성 한 줄, AEAD(무결성 포함)로 충분히 견고.
- 환경변수 키 주입은 `DATABASE_PATH`·`ANTHROPIC_API_KEY` 등 기존 관행과 일치한다.

## 대안
- **OS 키체인(`keyring`):** 헤드리스/CI 환경에서 취약하고 백엔드별 동작 편차. 데스크톱 배포 전까지 과함.
- **평문(`google-auth` 기본 `token.json`):** NFR-SEC-05 위반. 채택 불가.
- **DB 컬럼 저장:** 같은 SQLite 파일이 백엔드와 공유되어 노출면이 넓어짐(ADR-0011 쓰기 주체 분리에도 어긋남).

## 결과 / 트레이드오프
- 키와 암호문이 같은 머신에 있으므로 **로컬 기기 자체가 침해되면 무력**하다 — 목적은 어디까지나
  실수 커밋·백업 유출 방어이며, 이 한계를 문서에 명시한다.
- `TOKEN_ENCRYPTION_KEY` 를 잃으면 재로그인이 필요하다(복호화 불가 시 `GoogleNotAuthorized`).
- Electron 패키징 시 `safeStorage`(OS 보호 저장소)로 이관을 재검토한다.
