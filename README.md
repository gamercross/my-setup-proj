# 🤖 my-setup-proj

> Windows / macOS / Linux 어디서든 켜는 생산성 대시보드 + Claude AI 에이전트.
> 우숭대학교 "AI 컴퓨터 운영체제 실습" 강의(14주)의 실습 환경 겸 최종 프로젝트.

**시작** 2026-09-02 · **목표 완성** 2026-11-30

---

## 🖥️ 대시보드 주요 기능

앱은 **"대시보드 OS"** 다 — 아래 기능들이 각각 **위젯**으로 셸에 올라가 이동·리사이즈되고, 위젯마다 사용자가 색·밀도·표시 옵션을 꾸민다 ([DASHBOARD_OS.md](docs/product/vision/DASHBOARD_OS.md) · [UI_SPEC.md](docs/product/reference/UI_SPEC.md) · [requirements/WIDGET.md](docs/product/requirements/WIDGET.md)). 현재 코드는 아직 고정 패널이며 위젯 셸은 Phase C5~C6.

| 기능 | 설명 | 요구사항 | 상태 |
|---|---|---|---|
| **위젯 셸 (대시보드 OS)** | 각 기능을 위젯으로 배치·이동·리사이즈·최소화, 레이아웃 저장/복원, 위젯별 테마·표시 옵션 | FR-WIDGET-01~08 | ⏳ C5~C6 ([ADR-0020~0022](docs/product/architecture/adr/)) |
| **할 일 관리** | 할일 추가·수정·완료·삭제. 우선순위·마감일. 로컬 SQLite 영속 | FR-TASK-01~05 | 🚧 B3 (백엔드·DB ✅, 프론트 배선 중) |
| **프로젝트 진행도 추적** | 프로젝트 카드 + 0–100% 진행 바, 상태(active/done/on_hold). Notion 연동(읽기) | FR-PROJ-01~04 | ⏳ C2 |
| **캘린더 일정** | 오늘/내일 일정 위젯. Google Calendar 를 에이전트가 로컬 캐시에 동기화 | FR-CAL-01~03 | ⏳ C3 |
| **Daily Brief 브리핑** | 매일 아침 Claude 가 할일·메일·일정을 모아 우선순위 브리핑 생성 (cron 자동) | FR-AGENT-01~06 | ⏳ D1~D3 |
| **이메일 통합** | 여러 계정의 미읽은 메일을 한 곳에서 확인·요약 | FR-MAIL-01~03 | ⏳ D2, E |
| **프로젝트 다이어그램 뷰어** | `docs/**/*.md` 의 Mermaid(아키텍처·로드맵·오케스트레이션·모듈 의존)를 대시보드에서 렌더 — 저장소를 열지 않고 구조·진행 파악 | FR-UI-05 | ⏳ C4 ([ADR-0014](docs/product/architecture/adr/ADR-0014-dashboard-diagram-viewer.md)) |
| 공통 | 모든 위젯은 로딩/비어있음/정상/에러 4상태를 독립 렌더. 한 위젯 실패가 셸·다른 위젯을 가리지 않음 | FR-UI-01·04, FR-WIDGET-07 | 🚧 |

> 데이터 흐름: React 대시보드 ↔ Express REST(`:3000/api`) ↔ 로컬 SQLite. 외부 API(Gmail·Calendar·Notion·Claude)는 Python 에이전트가 전담해 SQLite 캐시에 쓴다 ([DESIGN.md](docs/product/architecture/DESIGN.md) §3, [ADR-0006](docs/product/architecture/adr/ADR-0006-agent-owns-external-apis.md)).

---

## 📚 문서 지도

**처음이면 → [docs/ONBOARDING.md](docs/ONBOARDING.md)** (읽는 순서·규칙·명령 요약).
**아키텍처를 더 공부하려면 → [docs/STUDY_GUIDE.md](docs/STUDY_GUIDE.md)** (부족한 부분 진단 + 학습 목록).

문서는 목적별로 세 갈래(`product/` · `setup/` · `progress/`)로 나뉘고, `product/` 는 다시 5개 폴더로 카테고리화돼 있다. 폴더 지도(다이어그램)는 [ONBOARDING.md](docs/ONBOARDING.md#문서-지도-2026-09-03-카테고리화).

### 1. 무엇을 만드는가 — [`docs/product/`](docs/product/)

#### `vision/` — 왜·누구를 위해

| 문서 | 내용 |
|---|---|
| [vision/VISION.md](docs/product/vision/VISION.md) | 제품 정의 (대시보드 OS), 목표, 핵심 기능 4종, 완료 기준 (큰 그림 다이어그램) |
| [vision/DASHBOARD_OS.md](docs/product/vision/DASHBOARD_OS.md) | 🆕 위젯 셸 개념 분석 — 각 데이터가 위젯으로 움직이고 위젯마다 디자인. 벤치마크·위젯 모델·공부 목록·열린 질문 |
| [vision/AS_IS.md](docs/product/vision/AS_IS.md) | 현행 구현 상태 분석, 모듈 의존 그래프, 갭 G1~G9 |
| [vision/USE_SCENARIOS.md](docs/product/vision/USE_SCENARIOS.md) | 이해관계자, 사용 여정 S-1~S-6 |
| [vision/CONSTRAINTS.md](docs/product/vision/CONSTRAINTS.md) | 제약·가정, 규모/비용 추정 |
| [vision/RISKS.md](docs/product/vision/RISKS.md) | 리스크 레지스터 (R-1~R-16, Phase 축 타임라인) |

#### `requirements/` — 무엇을 만족해야

| 문서 | 내용 |
|---|---|
| [requirements/REQUIREMENTS_FUNCTIONAL.md](docs/product/requirements/REQUIREMENTS_FUNCTIONAL.md) + [TASK·UI·AGENT·PROJ·WIDGET](docs/product/requirements/) | 기능 요구사항(FR) 요약표 (도메인 지도) + 도메인별 수용 기준. WIDGET = 위젯 셸(대시보드 OS) |
| [requirements/REQUIREMENTS_NONFUNCTIONAL.md](docs/product/requirements/REQUIREMENTS_NONFUNCTIONAL.md) | 비기능 요구사항(NFR) 8범주 (범주→아키텍처 대응 지도) |
| [requirements/TRACEABILITY.md](docs/product/requirements/TRACEABILITY.md) | FR/NFR ↔ 갭 ↔ 설계 ↔ 단계 ↔ 테스트 ↔ 코드 (추적 사슬 다이어그램) |

#### `architecture/` — 어떻게 만드나

| 문서 | 내용 |
|---|---|
| [architecture/ARCHITECTURE.md](docs/product/architecture/ARCHITECTURE.md) | 기술 스택 큰 그림 + **§0 아키텍처 뷰 지도** (여기서 아래로 분기) |
| [architecture/DESIGN.md](docs/product/architecture/DESIGN.md) + [adr/](docs/product/architecture/adr/) | 컴포넌트·데이터 모델·흐름 시퀀스·Phase 계획 · 결정 이력(ADR-0001~0019) |
| [architecture/ARCHITECTURE_DRIVERS.md](docs/product/architecture/ARCHITECTURE_DRIVERS.md) | ASR·품질 속성 시나리오·피트니스 함수·트레이드오프 |
| [architecture/RUNTIME_VIEW.md](docs/product/architecture/RUNTIME_VIEW.md) | 프로세스·시작/종료·연결 상태 머신 |
| [architecture/DATA_ARCHITECTURE.md](docs/product/architecture/DATA_ARCHITECTURE.md) | 스키마 진화·캐시·동기화 충돌·데이터 분류 (수명주기 다이어그램) |
| [architecture/CROSSCUTTING.md](docs/product/architecture/CROSSCUTTING.md) | 설정·오류 계약·로깅·복원력 (관심사 관통 다이어그램) |
| [architecture/ARCHITECTURE_EVOLUTION.md](docs/product/architecture/ARCHITECTURE_EVOLUTION.md) | 로컬 → 다중 사용자/클라우드 진화 경로 |

#### `reference/` — 정확한 계약 · `testing/` — 검증

| 문서 | 내용 |
|---|---|
| [reference/GLOSSARY.md](docs/product/reference/GLOSSARY.md) | 도메인·상태값·시스템 용어 |
| [reference/DATA_DICTIONARY.md](docs/product/reference/DATA_DICTIONARY.md) | DB 필드 단위 설명 (원천: `backend/db/schema.sql`) |
| [reference/API_REFERENCE.md](docs/product/reference/API_REFERENCE.md) | 백엔드 REST 엔드포인트별 요청/응답·검증·curl |
| [reference/UI_SPEC.md](docs/product/reference/UI_SPEC.md) | 화면·컴포넌트 트리·스토어 계약, 렌더 상태 다이어그램 |
| [testing/TEST_PLAN.md](docs/product/testing/TEST_PLAN.md) | 테스트 피라미드·케이스(TC-xx)·머지 게이트 |
| [ROADMAP.md](docs/product/ROADMAP.md) · [DOC_PLAN.md](docs/product/DOC_PLAN.md) | 주차별 일정 (product/ 루트) · 문서 계획(메타) |

### 2. 어떤 세팅이 필요한가 — [`docs/setup/`](docs/setup/)

| 문서 | 내용 |
|---|---|
| [SETUP.md](docs/setup/SETUP.md) | 개발 환경 구축 (Node.js / Python / Git / API 키) |
| [ENV_REFERENCE.md](docs/setup/ENV_REFERENCE.md) | `.env` 키별 용도·발급 방법·보안 규칙 |
| [CONVENTIONS.md](docs/setup/CONVENTIONS.md) | 코드·구조·커밋·에이전트 작업 규칙 (단일 원천) |
| [GIT_WORKFLOW.md](docs/setup/GIT_WORKFLOW.md) | 에이전트 커밋·푸시 절차, 검증 게이트 해석 |
| [ORCHESTRATION.md](docs/setup/ORCHESTRATION.md) | 에이전트 파이프라인 상태 그래프, `/build-next` 자동 진행 |
| [AUTOMATION.md](docs/setup/AUTOMATION.md) | 에이전트 팀 · `/feature` · `/build-next` · 작업로그 · 슬랙 · CI |
| [DIAGRAMS.md](docs/setup/DIAGRAMS.md) | Mermaid 다이어그램 작성·열람·이미지 내보내기 |
| [CLAUDE_INTEGRATION.md](docs/setup/CLAUDE_INTEGRATION.md) | Claude API·MCP 설정, Daily Brief 에이전트 |

### 3. 얼마나 됐는가 — [`docs/progress/`](docs/progress/)

| 문서 | 내용 |
|---|---|
| [PROGRESS.md](docs/progress/PROGRESS.md) | 주간 진행 상황, 체크리스트, 마일스톤 (매주 월요일 갱신) |
| [COURSE_MAPPING.md](docs/progress/COURSE_MAPPING.md) | 강의 주차 ↔ 프로젝트 작업 매핑 |
| [작업로그.md](작업로그.md) | 날짜별 요약(작성) + 커밋(자동). 매 턴 갱신, 매일 23:50 커밋·슬랙 |

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

전체 환경 구축 절차는 [SETUP.md](docs/setup/SETUP.md), 프로젝트 맥락은 [ONBOARDING.md](docs/ONBOARDING.md) 를 본다.

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

## 📊 현재 상태 (2026-09-03)

| 영역 | 상태 |
|---|---|
| 개념 설계 · 요구사항 · 아키텍처 문서 | ✅ 완료 (`docs/product/`) |
| 자동화 인프라 (에이전트 팀 · 작업로그 · CI · GIT_WORKFLOW) | ✅ 동작 |
| 로컬 개발 환경 (node 26 · python 3.14 · venv) | ✅ Phase A2 (`verify.sh` 15/0/0) |
| 자동화 테스트 | ✅ Phase A3 — backend 18 · agent 3, CI 초록 |
| 프론트엔드 React | ✅ Phase B1 — Vite + `renderer.jsx` 마운트 (창 수동 확인만 남음) |
| DB (SQLite) | ✅ Phase B2 — better-sqlite3, WAL, `DATABASE_PATH` |
| 백엔드 tasks/projects CRUD | 🚧 라우트 ✅ + SQLite ✅ · 미들웨어(CORS/로깅) 정식화는 C1 |
| 프론트↔백엔드 배선 (할일 CRUD E2E) | ⏳ Phase B3 (다음) — CORS(C1) 결정 대기 |
| AI 에이전트 | 🚧 뼈대 + 스텁 (모듈 import 확인) |
| 다이어그램 뷰어 (FR-UI-05) | ⏳ Phase C4 — [ADR-0014](docs/product/architecture/adr/ADR-0014-dashboard-diagram-viewer.md) 제안 |

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
- 미결정 설계 사항은 제안 상태 [ADR](docs/product/architecture/adr/) (0013 에이전트 작업 큐 · 0014 다이어그램 뷰어) — 착수 전 결정. 0009~0012 는 채택 완료.

---

## 📞 참고

- 강의 자료: https://wikidocs.net/book/10238
- Claude 문서: https://docs.claude.com
- 개인 학습 목적 프로젝트
