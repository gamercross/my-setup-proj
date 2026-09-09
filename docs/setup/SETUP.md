# ⚙️ 개발 환경 설정 가이드

> 이 저장소를 **새 컴퓨터에서 개발 가능한 상태**로 만드는 절차. macOS 와 Ubuntu/WSL 을 분리한다.
> 프로젝트는 이미 존재하므로 "프로젝트를 새로 만드는" 단계는 없다 — clone 후 의존성만 설치한다.

**📂 이동:** [⬆ setup/](README.md) · [docs/](../README.md) · [🚀 ONBOARDING](../ONBOARDING.md) · 환경변수: [ENV_REFERENCE.md](ENV_REFERENCE.md)

---

## 0. 버전 기준

| 구분 | Node | Python | 비고 |
|---|---|---|---|
| **CI (고정)** | 22 | 3.12 | `.github/workflows/test.yml` — 이 버전에서 반드시 통과해야 함 |
| **로컬 (최소)** | 22 이상 | 3.12 이상 | 상위 버전 허용. `agent/venv` 로 격리되므로 Python 은 시스템에 여러 개 있어도 됨 |
| **현재 개발 머신** | 26 (Homebrew) | 3.14 | 참고값 |

- 의존성 버전은 `package-lock.json`(커밋됨) + `agent/requirements.txt`(핀 고정) 이 기준.
- 설치는 **`npm ci`**(락파일 그대로) 를 쓴다. `setup.sh` 가 이를 처리하고, 없으면 `npm install` 로 폴백한다.

---

## 1. 공통 (OS 무관)

```bash
git clone https://github.com/gamercross/my-setup-proj.git
cd my-setup-proj

bash setup.sh     # frontend/backend 의존성(npm ci) + agent venv + .env 준비
bash verify.sh    # 환경·문법·문서 정합 점검 (현재 13/0/0)
```

- `setup.sh` 는 `node` / `npm` / `python3` 가 PATH 에 있어야 동작한다 (없으면 아래 OS별 절차로 먼저 설치).
- `.env` 는 `.env.example` 을 복사해 만든다. **값 채우기는 각 기능 착수 시점** — 지금은 비어 있어도 로컬 개발이 된다 ([ENV_REFERENCE.md](ENV_REFERENCE.md)).
- 앱 실행법·포트 규칙은 [§5](#5-앱-실행).

---

## 2. macOS

```bash
# Homebrew (없으면)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Xcode Command Line Tools — better-sqlite3 네이티브 빌드에 필요
xcode-select --install

# Node / Python / gh
brew install node python@3.12 gh

# (선택) 버전 고정이 필요하면 nodenv/pyenv
brew install nodenv pyenv
```

- **better-sqlite3** 는 Node ABI 에 맞춰 네이티브 빌드/prebuild 를 받는다. 실패하면 `xcode-select --install` 을 먼저 확인.
- 스케줄러는 **launchd**. Daily Brief·작업로그 EOD 는 `scripts/install-worklog-launchd.sh` 로 등록한다 (경로를 현재 저장소로 자동 설정 — 하드코딩 방지).
- Electron 창은 그냥 뜬다 (별도 디스플레이 설정 불필요).

## 3. Ubuntu / WSL

```bash
sudo apt update && sudo apt install -y \
  build-essential curl git python3.12 python3.12-venv python3.12-dev

# Node 22 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# gh (GitHub CLI)
sudo apt install -y gh   # 또는 https://github.com/cli/cli 설치 안내
```

- **better-sqlite3** 빌드에 `build-essential`(gcc·make) 필요 — 위에 포함.
- 스케줄러는 **cron** (launchd 없음). `crontab -e` 로 `scripts/worklog-eod.sh` 를 등록한다.
- **WSL 에서 Electron GUI 는 제약이 있다** — WSLg(최신 Windows) 가 있으면 창이 뜨고, 없으면 `DISPLAY` 설정 또는 X 서버가 필요하다. 브라우저 E2E(TC-UI-*)는 Windows 쪽 브라우저로 하거나 네이티브 Linux/macOS 에서 한다.

---

## 4. Git·GitHub

```bash
git config --global user.name "이름"
git config --global user.email "you@example.com"

gh auth login          # HTTPS + 브라우저 인증 권장
```

- 브랜치 정책: `feature/<짧은-이름>` → 푸시 → PR → `main` ([ADR-0023](../product/architecture/adr/ADR-0023-branch-model.md)). `main` 직접 커밋·`--force` 금지.
- 커밋·푸시 절차: [GIT_WORKFLOW.md](GIT_WORKFLOW.md).

---

## 5. 앱 실행

**통합 실행 (권장):** 명령 하나로 backend + Vite + Electron 을 함께 띄운다 ([ADR-0016](../product/architecture/adr/ADR-0016-desktop-process-topology.md) 1항 채택).

```bash
bash scripts/dev.sh    # backend :3000 + Vite :5173 + Electron. Ctrl+C 로 전부 종료
```

- 전제(`node`·`backend/node_modules`·`frontend/node_modules`) 미충족 시 안내 후 종료 — `bash setup.sh` 먼저.
- `dev.sh` 도 `.env` 를 읽지 않는다 (아래 표 참고 — `PORT` 등은 셸 환경변수).
- Windows 는 Git Bash 에서 실행.

**폴백 — 터미널 2개로 분리:**

```bash
# 터미널 A — 백엔드 API
cd backend && npm start          # http://localhost:3000

# 터미널 B — Vite dev + Electron
cd frontend && npm run dev       # Vite :5173, Electron 창
```

### 포트·환경변수 규칙 (중요)

| 사실 | 설명 |
|---|---|
| **개발 포트는 3000 고정** | Electron `preload.js` 의 `apiBaseUrl` 이 `http://localhost:3000/api` 로 고정돼 있고, prod CSP `connect-src` 도 3000 이다. `PORT` 를 바꾸면 frontend 가 여전히 3000 으로 요청한다 — **바꾸지 않는다.** |
| **backend 는 `.env` 를 자동 로딩하지 않는다** | dotenv 미도입 결정 ([ADR 재검토 D2](../product/architecture/CROSSCUTTING.md#1-설정-configuration)). `PORT`·`DATABASE_PATH`·`NODE_ENV` 는 **셸 환경변수**로만 읽힌다. `.env` 에 적어도 `npm start` 에는 반영되지 않는다. |
| **override 하려면 export** | `DATABASE_PATH=/tmp/test.db NODE_ENV=production node src/server.js` 처럼 명령 앞에 붙이거나 `export` 한다. |
| **`slack-notify.sh` 는 `.env` 를 읽는다** | 스크립트는 `. .env` 로 직접 로딩 → `SLACK_WEBHOOK_URL` 은 `.env` 에 넣으면 동작한다. (backend 와 로딩 방식이 다르다는 점 유의) |

### 실행이 실제로 되는지 확인

```bash
bash scripts/smoke.sh    # 임시 포트+임시 DB 로 backend 기동 → /api/health 확인 → 정리
```

`verify.sh` 는 파일·문법·문서 정합만 본다. `smoke.sh` 가 "backend 가 실제로 뜨고 응답하는가"를 본다.

---

## 6. 트러블슈팅

| 증상 | 확인 |
|---|---|
| `command not found: node` | OS별 §2/§3 로 설치. `which node` |
| `better-sqlite3` 빌드 실패 | macOS: `xcode-select --install` / Ubuntu: `sudo apt install build-essential`. Node 버전이 22 계열인지 |
| 대시보드가 전부 "백엔드에 연결할 수 없습니다" | 터미널 A 에서 `cd backend && npm start` 를 안 띄웠거나 3000 포트 충돌 |
| `bash scripts/dev.sh` 가 즉시 종료됨 | 3000/5173 포트 점유 시 명확한 메시지 후 즉시 실패한다 — 기존 backend/Vite 프로세스를 먼저 종료 (`lsof -i :3000`) |
| `DATABASE_PATH` 를 바꿨는데 DB 가 여전히 `backend/data/app.db` | `.env` 가 아니라 셸 환경변수로 export 해야 함 (위 §5 표) |
| Slack 알림이 안 옴 | `.env`(`.env.example` 아님)의 `SLACK_WEBHOOK_URL` 확인 → `bash scripts/slack-notify.sh "✅" "test" "hi"` |
| WSL 에서 Electron 창이 안 뜸 | WSLg 확인 (`wsl --version`), 없으면 X 서버·`DISPLAY` 필요. E2E 는 다른 환경에서 |

---

## 7. 완료 체크리스트

- [ ] `node --version` ≥ 22, `python3 --version` ≥ 3.12
- [ ] `bash setup.sh` 성공
- [ ] `bash verify.sh` 13/0/0
- [ ] `bash scripts/smoke.sh` — backend health OK
- [ ] `gh auth status` 인증됨
- [ ] (선택) 스케줄러 등록 — macOS `scripts/install-worklog-launchd.sh` / Ubuntu `crontab`

완료 후 → [ONBOARDING.md](../ONBOARDING.md) → [ROADMAP.md](../product/ROADMAP.md)

---

**작성:** 2026-09-02 · **개편:** 2026-09-04 (OS 분리, obsolete 절 제거, 포트·`.env` 로딩 규칙 명시)
