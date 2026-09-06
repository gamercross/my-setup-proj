# 🔑 환경 변수 레퍼런스 (.env)

> `.env.example` 의 모든 키 설명. 실제 값은 `.env` 에 채운다(`cp .env.example .env`).
> `.env` 는 `.gitignore` 에 포함되어 **절대 커밋되지 않는다** (NFR-SEC-01).
> 보안 규칙은 [CONVENTIONS.md](CONVENTIONS.md) §1, 전체 세팅 절차는 [SETUP.md](SETUP.md).

---

## 1. 키 목록

| 키 | 필수? | 용도 | 사용 컴포넌트 | 없을 때 동작 |
|---|:---:|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ (에이전트) | Claude API 인증 | `agent/services/claude.py`, `test_claude.py` | `test_claude.py` 안내 후 종료; `daily_brief` 는 호출 실패 메시지 반환 |
| `GOOGLE_CLIENT_ID` | ⏳ (Week 6~) | Google OAuth 클라이언트 식별자 | `agent/auth/google_oauth.py`(예정), Gmail·Calendar 서비스 | OAuth 로그인 불가 → 일정·메일 기능 비활성 |
| `GOOGLE_CLIENT_SECRET` | ⏳ (Week 6~) | Google OAuth 시크릿 | 동상 | 동상 |
| `GOOGLE_REDIRECT_URI` | ⏳ | OAuth 콜백 주소. 기본 `http://localhost:3000/auth/callback` | 백엔드 auth 라우트(예정) | 기본값 사용 |
| `NOTION_API_KEY` | ⏳ (Week 4·7) | Notion Integration Token. 프로젝트 읽기·브리핑 저장 | `agent/services/notion.py` | Notion 연동 비활성 |
| `SLACK_WEBHOOK_URL` | ❌ (선택) | 에이전트 진행·EOD 요약 알림용 Incoming Webhook | `scripts/slack-notify.sh`, `worklog-eod.sh` | **조용히 스킵** — 항상 호출해도 안전 |
| `SUPABASE_URL` | ❌ (선택) | Supabase 프로젝트 URL. 2026-09-06~ 클라이언트 부트스트랩이 사용 (연결 배선·`/api/sync/health` 진단만) | `backend/src/supabase.js` | 팩토리가 `null` 반환, 프로세스당 1회 경고. 앱 부팅·기존 기능 무영향, 로컬 SQLite 전용 |
| `SUPABASE_KEY` | ❌ (선택) | Supabase **anon public** 키 전제. `service_role` 키는 `.env` 에 두지 않는다 (사용자가 키 종류 확인 필요) | `backend/src/supabase.js` | 동상 |
| `SUPABASE_TIMEOUT_MS` | ❌ (선택) | Supabase 요청 타임아웃(ms). 기본 `3000` | `backend/src/supabase.js` | `3000` 사용 |
| `NODE_ENV` | ✅ | `development` / `production`. 로깅·개발도구·Vite 로드 방식 분기 (ADR-0010) | `backend/src/server.js`, `frontend/src/main.js` | 코드 기본값(`development` 가정) |
| `PORT` | ✅ | 백엔드 리슨 포트. 기본 `3000` | `backend/src/server.js` | `3000` 사용 |
| `DATABASE_PATH` | — | 로컬 SQLite 파일 경로 (ADR-0009). 비우면 `backend/data/app.db` | `backend/db/index.js`, `agent/db.py` | ✅ B2 구현: `backend/db/index.js` 가 이 값을 읽음 (없으면 `backend/data/app.db`). 단 backend 는 아직 `.env` 자동 로딩 없음 — 셸 환경변수로 주입 (dotenv 도입은 후속). Electron 패키지는 `main.js` 가 `userData` 로 덮어씀 |

## 2. 키별 발급 방법

### `ANTHROPIC_API_KEY`
1. https://console.anthropic.com → **API Keys** → Create Key
2. `sk-ant-...` 복사 → `.env`
3. 대안: `ant auth login` 프로필 사용 시 이 키 없이도 `Anthropic()` 이 인증됨

### `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
1. https://console.cloud.google.com → 프로젝트 생성
2. **API 및 서비스 → 사용 설정**: Gmail API, Google Calendar API
3. **OAuth 동의 화면** 구성 (외부, 테스트 사용자에 본인 추가)
4. **사용자 인증 정보 → OAuth 2.0 클라이언트 ID**(데스크톱 앱) 생성
5. 클라이언트 ID·시크릿 복사, 승인된 리디렉션 URI 에 `GOOGLE_REDIRECT_URI` 값 등록

### `NOTION_API_KEY`
1. https://www.notion.so/my-integrations → **New integration**
2. `secret_...` (Internal Integration Token) 복사
3. 연동할 Notion 페이지/DB → `...` → **Connections** → 이 integration 추가

### `SLACK_WEBHOOK_URL`
1. Slack → **Apps** → "Incoming Webhooks" → Add to Slack
2. 채널 선택 → Webhook URL(`https://hooks.slack.com/services/...`) 복사

### `SUPABASE_URL` / `SUPABASE_KEY`
1. https://supabase.com → New project
2. **Project Settings → API**: Project URL, `anon` public 키 복사 — **`anon public` 키를 사용한다.** `service_role` 키는 `.env` 에 두지 않는다.
3. (키 종류는 사용자가 확인) 부트스트랩·`/api/sync/health` 는 anon 키 전제로 동작한다.

## 3. 보안 규칙

| 규칙 | 근거 |
|---|---|
| `.env` 는 커밋 금지 (`.gitignore` 확인) | NFR-SEC-01 |
| `ANTHROPIC_API_KEY` 는 **백엔드/에이전트에서만** 사용, Electron 렌더러에 노출 금지 | NFR-SEC-03 |
| `preload.js` 화이트리스트에 어떤 시크릿도 넣지 않는다 | NFR-SEC-03 |
| OAuth refresh token 은 로컬에 **암호화** 저장 (평문 금지) | NFR-SEC-05 |
| 모든 외부 통신은 HTTPS | NFR-SEC-02 |

## 4. `.env.example` 과의 동기화

- 새 키를 코드에서 읽기 시작하면 **같은 PR 에서** `.env.example`(빈 값)과 이 문서를 갱신한다.
- `.env.example` 에 값을 넣지 않는다(플레이스홀더/기본값만). `scripts/check_docs.py` DRIFT-3 이 시크릿·`= ` 공백을 검사한다.
- **현재 로컬 실행 기준 변수는 `DATABASE_PATH`·`PORT`·`NODE_ENV` 셋이며, 선택적으로 `SUPABASE_URL`·`SUPABASE_KEY`(·`SUPABASE_TIMEOUT_MS`) 를 쓴다.**
  [ARCHITECTURE.md](../product/architecture/ARCHITECTURE.md) §보안 예시의 `SUPABASE_JWT_SECRET`·`DATABASE_URL` 은
  **Week 10 Supabase 도입 시** 별도 설정 묶음으로 그때 확정한다 (지금은 예시에서도 쓰지 않는다 — [CROSSCUTTING.md](../product/architecture/CROSSCUTTING.md) §1).

## 5. 실행 시 주의 — 포트·`.env` 로딩 방식

같은 `.env` 라도 **읽는 주체마다 동작이 다르다.** 헷갈리면 여기를 본다.

| 주체 | `.env` 로딩 | 결과 |
|---|---|---|
| **backend** (`npm start`) | ❌ 자동 로딩 없음 (dotenv 미도입 — [ADR 재검토 D2](../product/architecture/CROSSCUTTING.md#1-설정-configuration)) | `PORT`·`DATABASE_PATH`·`NODE_ENV` 는 **셸 환경변수**로만 읽힌다. `.env` 에 적어도 반영 안 됨. `SUPABASE_*` 도 셸 export 로만 읽힌다 |
| **agent** (`daily_brief.py` 등) | `python-dotenv` 로 로딩 예정 (D 단계) | `.env` 값 사용 |
| **`scripts/slack-notify.sh`·`worklog-eod.sh`** | `. .env` 로 직접 로딩 | `SLACK_WEBHOOK_URL` 은 `.env` 에 넣으면 동작 |

**backend 설정을 바꾸려면 셸에서 export:**
```bash
DATABASE_PATH=/tmp/test.db NODE_ENV=production node backend/src/server.js
# 또는
export PORT=3000 DATABASE_PATH=... && cd backend && npm start
```

**개발 포트는 3000 고정.** Electron `preload.js` 의 `apiBaseUrl` 과 prod CSP `connect-src` 가 3000 으로 하드코딩돼 있다.
`PORT` 를 바꾸면 frontend 는 여전히 3000 으로 요청한다 → **바꾸지 않는다** ([UI_SPEC.md](../product/reference/UI_SPEC.md) §5).
포트를 가변으로 만들려면 Vite/Electron 실행 시 같은 `BACKEND_PORT` 를 preload 로 주입하는 별도 작업이 필요하다 (현재 범위 밖).

> dotenv 를 도입하기로 결정하면 backend·agent 의 로딩 위치·우선순위·테스트를 함께 표준화하고, 스크립트 방식과 혼용하지 않는다.

---

**작성:** 2026-09-02 · **보강:** 2026-09-04 (§5 포트·로딩 방식)
