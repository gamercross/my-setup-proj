# 🤖 my-setup-proj

> Windows / macOS / Linux 어디서든 켜는 생산성 대시보드 + Claude AI 에이전트.
> 우송대학교 2026-2학기 3개 강의(AI 컴퓨터 운영체제 실습 / AI시대소프트웨어공학 / AITool기반소프트웨어공학)의 공통 실습 환경이자 제출 산출물이다. 각 강의가 보는 층이 다르다 — 런타임·환경(A) / AI 활용 개발 프로세스(B) / SW공학 산출물(C). 상세: [docs/progress/COURSE_MAPPING.md](docs/progress/COURSE_MAPPING.md).

**시작** 2026-09-02 · **목표 완성** 2026-11-30

---

## 🖥️ 대시보드 주요 기능

앱은 **"대시보드 OS"** 다 — 아래 기능들이 각각 **위젯**으로 셸에 올라가 이동·리사이즈되고, 위젯마다 사용자가 색·밀도·표시 옵션을 꾸민다 ([DASHBOARD_OS.md](docs/product/vision/DASHBOARD_OS.md) · [UI_SPEC.md](docs/product/reference/UI_SPEC.md) · [requirements/WIDGET.md](docs/product/requirements/WIDGET.md)). 위젯 셸(배치·이동·리사이즈·최소화·레이아웃 영속·위젯별 격리)은 C5(2026-09-06)에서 구현됐고 `Dashboard.jsx` 는 제거됐다. 위젯별 테마·표시 옵션은 Phase C6(2026-09-06)에서 구현됐다.

| 기능 | 설명 | 요구사항 | 상태 |
|---|---|---|---|
| **위젯 셸 (대시보드 OS)** | 각 기능을 위젯으로 배치·이동·리사이즈·최소화, 레이아웃 저장/복원, 위젯별 테마·표시 옵션 | FR-WIDGET-01~08 | ✅ C5 (배치·영속·격리) / ✅ C6 (테마·표시 옵션) ([ADR-0020~0022](docs/product/architecture/adr/) 채택) |
| **할 일 관리** | 할일 추가·수정·완료·삭제. 우선순위·마감일. 로컬 SQLite 영속 | FR-TASK-01~05 | ✅ B3 (코드·자동 테스트 — 브라우저 E2E 로컬 대기) |
| **프로젝트 진행도 추적** | 프로젝트 카드 + 0–100% 진행 바, 상태(active/done/on_hold). Notion 연동(읽기) | FR-PROJ-01~04 | ✅ C2 (코드·자동 테스트 — 브라우저 E2E 로컬 대기) |
| **캘린더 일정** | 오늘/내일 일정 위젯. Google Calendar 를 에이전트가 로컬 캐시에 동기화 | FR-CAL-01~03 | 🚧 C3 (더미 데이터 ✅ / 실 Google 연동 D2) |
| **Daily Brief 브리핑** | 매일 아침 Claude 가 할일·메일·일정을 모아 우선순위 브리핑 생성 (cron 자동) | FR-AGENT-01~06 | ⏳ D1~D3 |
| **이메일 통합** | 여러 계정의 미읽은 메일을 한 곳에서 확인·요약 | FR-MAIL-01~03 | ⏳ D2, E |
| **프로젝트 다이어그램 뷰어** | `docs/**/*.md` 의 Mermaid(아키텍처·로드맵·오케스트레이션·모듈 의존)를 대시보드에서 렌더 — 저장소를 열지 않고 구조·진행 파악 | FR-UI-05 | ✅ C4 ([ADR-0014](docs/product/architecture/adr/ADR-0014-dashboard-diagram-viewer.md) 채택 — 브라우저 확인 로컬 대기) |
| 공통 | 모든 위젯은 로딩/비어있음/정상/에러 4상태를 독립 렌더. 한 위젯 실패가 셸·다른 위젯을 가리지 않음 | FR-UI-01·04, FR-WIDGET-07 | ✅ C5 (위젯별 ErrorBoundary) |

> 데이터 흐름: React 대시보드 ↔ Express REST(`:3000/api`) ↔ 로컬 SQLite. 외부 API(Gmail·Calendar·Notion·Claude)는 Python 에이전트가 전담해 SQLite 캐시에 쓴다 ([DESIGN.md](docs/product/architecture/DESIGN.md) §3, [ADR-0006](docs/product/architecture/adr/ADR-0006-agent-owns-external-apis.md)).

---

## 📚 문서 지도 — 어디로 갈까

**모든 폴더에 `README.md` 가 있고 서로 링크된다.** 어느 README 에서 시작해도 상단 네비게이션 바로 상위·형제 폴더로 이동할 수 있다. 이 표에서 원하는 폴더 README 로 들어가면, 그 안에 문서별 `무엇 / 언제 참조 / ⚠️ 놓치기 쉬운 것` 표가 있다.

### 진입점

| 나는… | → |
|---|---|
| **처음이다** (15분 온보딩 — 읽는 순서·규칙·명령) | [docs/ONBOARDING.md](docs/ONBOARDING.md) |
| **폴더를 훑고 싶다** (최상위 허브) | [docs/README.md](docs/README.md) |
| **아키텍처를 더 공부하고 싶다** | [docs/STUDY_GUIDE.md](docs/STUDY_GUIDE.md) |

### 폴더 README (여기서 각 폴더 안으로)

```mermaid
flowchart TB
  ROOT["📕 README.md (여기)"] --> DOCS["📚 docs/README.md<br/>최상위 허브"]
  DOCS --> P["📦 product/README.md"]
  DOCS --> SET["🔧 setup/README.md"]
  DOCS --> PRG["📈 progress/README.md"]
  P --> V["🎯 vision/"] --> R["✅ requirements/"] --> A["🏛 architecture/"]
  A --> ADR["📐 adr/"]
  A --> REF["📚 reference/"]
  A --> T["🧪 testing/"]
  V -.-> SET
  R -.-> PRG
  A -.-> STUDY["📖 STUDY_GUIDE.md"]
```

| README | 질문 | 대표 문서 | 바로 이럴 때 |
|---|---|---|---|
| [docs/](docs/README.md) | 전체 허브 | ONBOARDING · STUDY_GUIDE | 어디로 갈지 모를 때 |
| [product/](docs/product/README.md) | 무엇을 만드나 (5 카테고리 허브) | — | 제품 전반 |
| [product/vision/](docs/product/vision/README.md) | 왜·완료의 정의 | VISION · DASHBOARD_OS · AS_IS · RISKS | 방향·범위 판단 |
| [product/requirements/](docs/product/requirements/README.md) | 무엇을 만족해야 | FR · NFR · TRACEABILITY · TASK/UI/AGENT/PROJ/WIDGET | "이거 어느 FR인가" |
| [product/architecture/](docs/product/architecture/README.md) | 어떻게 만드나 (구조·결정) | ARCHITECTURE §0 뷰 지도 · DESIGN · DRIVERS · RUNTIME/DATA/CROSSCUTTING/EVOLUTION | 구현 착수 전 |
| [product/architecture/adr/](docs/product/architecture/adr/README.md) | 결정 이력 | ADR-0001~0023 (채택/제안) | "왜 이렇게 정했나" |
| [product/reference/](docs/product/reference/README.md) | 정확한 계약 | API_REFERENCE · UI_SPEC · DATA_DICTIONARY · GLOSSARY | 코드 작성 중 |
| [product/testing/](docs/product/testing/README.md) | 어떻게 검증 | TEST_PLAN (피라미드·TC-·머지 게이트) | PR 전 자기 점검 |
| [setup/](docs/setup/README.md) | 환경·도구·규칙 | SETUP · CONVENTIONS · GIT_WORKFLOW · ORCHESTRATION · AUTOMATION · DIAGRAMS · CLAUDE_INTEGRATION | 세팅·커밋·파이프라인 |
| [progress/](docs/progress/README.md) | 지금 어디까지 | PROGRESS · COURSE_MAPPING · (루트 [작업로그.md](작업로그.md)) | 다음 할 일 |

카테고리 밖 (product/ 루트): [ROADMAP.md](docs/product/ROADMAP.md) 주차별 일정 · [DOC_PLAN.md](docs/product/DOC_PLAN.md) 문서 계획(메타)

---

## ⚡ 빠른 시작

```bash
git clone https://github.com/gamercross/my-setup-proj.git
cd my-setup-proj
bash setup.sh     # frontend/backend npm install + agent venv + .env 준비
bash verify.sh    # 환경·문법 점검
```

### 앱 실행 (개발 모드)

현재는 **백엔드와 프론트를 각각 실행**한다 (한 번에 띄우는 통합 스크립트는 없음 — 아래 "미정" 참고).

```bash
# 터미널 A — 백엔드 API (:3000)
cd backend && npm start

# 터미널 B — Vite dev + Electron (:5173)
cd frontend && npm run dev
```

- `frontend/` 의 `npm run dev` 는 Vite 와 Electron 만 띄운다. 백엔드가 안 떠 있으면 대시보드는 `ErrorBanner`("백엔드에 연결할 수 없습니다") 를 보여주고, 앱 자체는 죽지 않는다 (FR-UI-04).
- CORS 는 C1(2026-09-03)에서 처리됨 — dev 오리진 `localhost:5173`, prod Electron `file://`(`Origin: null`) 허용.
- **미정 (Week 5~ / 패키징 전 결정):** ① Electron 이 백엔드 프로세스를 자동 기동할지(`child_process`) vs 계속 분리. ② 패키징된 앱에서 백엔드 실행 주체. ③ 백엔드 비정상 종료 시 앱의 재연결 정책. → 결정 시 ADR + [DESIGN.md](docs/product/architecture/DESIGN.md) §실행 구조에 반영.

### 웹 데모 (프로토타입, 백엔드 없이)

대시보드를 브라우저에서 바로 보려면 데모 빌드를 쓴다 — 인메모리 샘플 데이터로 동작하며
Electron·백엔드가 필요 없다 ([ADR-0026](docs/product/architecture/adr/ADR-0026-web-demo-mode.md)).

```bash
cd frontend && npm run preview:demo   # 로컬에서 빌드 + 미리보기
```

- 배포본: **https://gamercross.github.io/my-setup-proj/** — `main` 의 `frontend/` 변경 시
  `.github/workflows/deploy-demo.yml` 이 자동 배포. 워크플로가 `enablement: true` 로 Pages 를
  자동으로 켜지만, 조직 정책으로 막혀 있으면 Settings → Pages → Source "GitHub Actions" 를
  1회 수동 설정해야 한다.
- 데모에서 추가/이동한 내용은 새로고침하면 초기화된다.

전체 환경 구축 절차는 [SETUP.md](docs/setup/SETUP.md), 프로젝트 맥락은 [ONBOARDING.md](docs/ONBOARDING.md) 를 본다.

---

## 🔑 API 키 발급 (개인 사용 · 무료)

`.env` 에 채우는 외부 키들이다. **전부 개인 사용 한도에서 무료이고, 서버를 띄우거나 결제 계정을 연결할 필요가 없다.** 이 앱은 로컬 데스크톱 앱이라 OAuth 도 `localhost` 로 처리한다. 키별 상세 절차·없을 때 동작은 [ENV_REFERENCE.md](docs/setup/ENV_REFERENCE.md) §2.

| 키 | 발급처 | 비용 | 언제 필요 | 요점 |
|---|---|---|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys | 사용량 과금 (에이전트 호출 시) | 에이전트 (D1~) | `sk-ant-...`. `ant auth login` 프로필이 있으면 생략 가능 |
| `GOOGLE_CLIENT_ID` / `_SECRET` | [console.cloud.google.com](https://console.cloud.google.com) | **무료** (아래 참고) | Gmail·Calendar 실 연동 (D2-b) | OAuth 2.0 클라이언트 **"데스크톱 앱"** 유형 |
| `TOKEN_ENCRYPTION_KEY` | 로컬 생성 (Fernet) | — | Gmail·Calendar 실 연동 (D2-b) | `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` 출력을 `.env` 에. 토큰 파일 암호화 (ADR-0024) |
| `NOTION_API_KEY` | [notion.so/my-integrations](https://www.notion.so/my-integrations) | 무료 | 프로젝트 읽기·브리핑 저장 (D3) | Internal Integration Token + 대상 페이지에 Connection 추가 |
| `SLACK_WEBHOOK_URL` | Slack → Apps → Incoming Webhooks | 무료 | 선택 (진행·EOD 알림) | 없으면 조용히 스킵 |
| `SUPABASE_URL` / `SUPABASE_KEY` | [supabase.com](https://supabase.com) → Project Settings → API | 무료 티어 | 선택 (부트스트랩·`/api/sync/health`) | **`anon public`** 키만. `service_role` 은 `.env` 에 두지 않음 |

### Google Cloud 를 서버 비용 없이 쓰는 법

Google Cloud 에서 과금되는 건 Compute·Cloud Run·BigQuery 같은 **인프라 리소스**뿐이다. **Gmail API·Google Calendar API 는 결제 계정 없이 무료**이며 개인 사용량(하루 수십~수백 요청)은 무료 할당량의 0.001% 도 안 된다.

1. [console.cloud.google.com](https://console.cloud.google.com) → 프로젝트 생성 (결제 계정 연결 **안 함**)
2. **API 및 서비스 → 사용 설정** → `Gmail API`, `Google Calendar API` 켜기
3. **OAuth 동의 화면** → 사용자 유형 `외부` → **게시 상태를 `프로덕션` 으로 게시**
   - `테스트` 모드로 두면 refresh token 이 **7일마다 만료**돼 매주 재로그인해야 한다.
   - `프로덕션(미검증)` 은 로그인 시 "확인되지 않은 앱" 경고가 한 번 뜨지만 `고급 → 계속` 으로 통과하고, refresh token 이 무기한 유효하다 (6개월 미사용 시에만 만료). 본인 계정만 쓰면 Google 앱 검증·보안 심사(CASA)는 불필요하다 (미검증 상태로 최대 100명까지 허용).
4. **사용자 인증 정보 → OAuth 2.0 클라이언트 ID** → 유형 **`데스크톱 앱`** → 생성
   - 데스크톱 앱 유형은 `http://localhost` loopback 리다이렉트를 자동 허용한다.
5. 클라이언트 ID·시크릿을 `.env` 의 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` 에 붙여넣기
6. 스코프는 읽기 전용만: `gmail.readonly`, `calendar.readonly`
7. 발급된 refresh token 은 로컬에 **암호화 저장**한다 (평문 금지 — NFR-SEC-05, Fernet + `TOKEN_ENCRYPTION_KEY`, ADR-0024).
8. 최초 로그인: `cd agent && source venv/bin/activate && python auth/google_oauth.py login` → 브라우저 동의 → `agent/.secrets/google_token.enc` 생성. 이후 `python sync.py` 로 수집.

---

## 🗂️ 저장소 구조

```
my-setup-proj/
├─ frontend/   Electron + React 데스크톱 앱 (Vite + React 마운트 ✅ B1, 데이터 배선 중 — B3)
├─ backend/    Node.js + Express API (tasks/projects CRUD + better-sqlite3, db/schema.sql)
├─ agent/      Python Claude 에이전트 (뼈대 + 서비스 스텁)
├─ scripts/    작업로그·슬랙·다이어그램 자동화 스크립트
├─ tests/      테스트 (Phase A3 에서 채움)
├─ docs/       ONBOARDING + product / setup / progress
└─ .claude/    에이전트 팀 정의 + /feature 파이프라인
```

---

## 📊 현재 상태 (2026-09-06)

| 영역 | 상태 |
|---|---|
| 개념 설계 · 요구사항 · 아키텍처 문서 (뷰별 심화 + ADR-0001~0023) | ✅ (`docs/product/`) |
| 자동화 인프라 (에이전트 팀 · 작업로그 · CI · GIT_WORKFLOW · DOC_HEALTH) | ✅ 동작 |
| 로컬 개발 환경 (node 26 · python 3.14 · venv) | ✅ Phase A2 |
| 자동화 테스트 | ✅ backend 56 · agent 3, `verify.sh` 27/0/0 (서비스 스모크 포함), DOC_HEALTH 11/0/0, CI 초록 (A3~C5 + Supabase 부트스트랩) |
| 프론트엔드 React (Vite 마운트) | ✅ Phase B1 |
| DB (SQLite, better-sqlite3 · WAL · `DATABASE_PATH`) | ✅ Phase B2 |
| 백엔드 tasks/projects CRUD + 미들웨어(CORS·로깅·에러) + 오류 매핑 | ✅ B2·C1·C2 |
| 캘린더 `/api/calendar/events` (더미) · 다이어그램 `/api/diagrams` (services 계층) | ✅ C3 · C4 |
| 프론트↔백엔드 배선 (할일 B3 · 프로젝트 C2 · 캘린더 C3 · 다이어그램 C4) | ✅ 코드·자동 테스트 — 브라우저 E2E(TC-UI-10~19 · TC-WIDGET-01~08) 로컬 수동 확인 대기 |
| 위젯 셸 (레지스트리 · `useLayoutStore` · 배치·리사이즈·최소화 · localStorage 영속 · 위젯별 격리) | ✅ C5 — 테마·표시 옵션은 C6 |
| AI 에이전트 | 🚧 뼈대 + 스텁 |

정확한 최신은 [AS_IS.md](docs/product/vision/AS_IS.md) · [TRACEABILITY.md](docs/product/requirements/TRACEABILITY.md) · `git log`. 다음 할 일은 [PROGRESS.md](docs/progress/PROGRESS.md).

---

## 🔧 개발 방식

기능 하나를 `/feature <설명>` 으로 시작하면 네 에이전트가 순서대로 처리한다:

```
planner(계획) → developer(구현) → supervisor(리뷰·검증) → finisher(커밋·푸시)
```

`/build-next` 는 로드맵([DESIGN §8](docs/product/architecture/DESIGN.md))을 스스로 따라가며 이 파이프라인을 반복 실행하고,
사람이 결정할 지점(제안 ADR·API 키·대화형)에서만 멈춘다.

- 상태 그래프·정지 조건: [ORCHESTRATION.md](docs/setup/ORCHESTRATION.md)
- 규칙: [CONVENTIONS.md](docs/setup/CONVENTIONS.md) · 커밋·푸시: [GIT_WORKFLOW.md](docs/setup/GIT_WORKFLOW.md) · 전체: [AUTOMATION.md](docs/setup/AUTOMATION.md)
- 브랜치: `feature/* → PR → main` ([ADR-0023](docs/product/architecture/adr/ADR-0023-branch-model.md)). `main` 직접 커밋·`develop`·Git Flow 안 씀.
- 미결정 설계는 **제안** 상태 ADR ([목록·상태](docs/product/architecture/adr/README.md)) — 관련 Phase 착수 전 사용자 결정. 0013~0022 제안 / 0001~0012·0023 채택.

---

## 📞 참고

- 강의 자료: https://wikidocs.net/book/10238
- Claude 문서: https://docs.claude.com
- 개인 학습 목적 프로젝트

---

> 📚 **문서 탐색:** [docs/README.md](docs/README.md) (허브) · [ONBOARDING](docs/ONBOARDING.md) · [product/](docs/product/README.md) · [setup/](docs/setup/README.md) · [progress/](docs/progress/README.md)
