# 🤖 my-setup-proj

> Windows / macOS / Linux 어디서든 켜는 생산성 대시보드 + Claude AI 에이전트.
> 우숭대학교 "AI 컴퓨터 운영체제 실습" 강의(14주)의 실습 환경 겸 최종 프로젝트.

**시작** 2026-09-02 · **목표 완성** 2026-11-30

---

## 📚 문서 지도

**처음이면 → [docs/ONBOARDING.md](docs/ONBOARDING.md)** (읽는 순서·규칙·명령 요약).

문서는 목적별로 세 갈래로 나뉜다.

### 1. 무엇을 만드는가 — [`docs/product/`](docs/product/)

**핵심 흐름 (이 순서로 읽는다)**

| 문서 | 내용 |
|---|---|
| [VISION.md](docs/product/VISION.md) | 제품 정의, 목표, 핵심 기능 4종, 완료 기준 |
| [AS_IS.md](docs/product/AS_IS.md) | 현행 구현 상태 분석, 모듈 의존 그래프, 갭 G1~G8 |
| [USE_SCENARIOS.md](docs/product/USE_SCENARIOS.md) | 이해관계자, 사용 여정 S-1~S-6 |
| [CONSTRAINTS.md](docs/product/CONSTRAINTS.md) | 제약·가정, 규모/비용 추정 |
| [RISKS.md](docs/product/RISKS.md) | 리스크 레지스터 (R-1~R-16, 확률×영향×완화) |
| [ARCHITECTURE.md](docs/product/ARCHITECTURE.md) · [ROADMAP.md](docs/product/ROADMAP.md) | 기술 스택 큰 그림 · Phase 1~4 주차별 일정 (다이어그램) |
| [REQUIREMENTS_FUNCTIONAL.md](docs/product/REQUIREMENTS_FUNCTIONAL.md) + [requirements/](docs/product/requirements/) | 기능 요구사항(FR-xx) 요약표 + 도메인별 수용 기준 |
| [REQUIREMENTS_NONFUNCTIONAL.md](docs/product/REQUIREMENTS_NONFUNCTIONAL.md) | 비기능 요구사항(NFR-xx): 성능·보안(위협 모델)·신뢰성·테스트 |
| [DESIGN.md](docs/product/DESIGN.md) + [adr/](docs/product/adr/) | 아키텍처 다이어그램·데이터 모델·흐름 시퀀스·Phase 계획 · 결정 이력(ADR-0001~) |
| [TRACEABILITY.md](docs/product/TRACEABILITY.md) | FR/NFR ↔ 갭 ↔ 설계 ↔ 단계 ↔ 테스트 ↔ 코드 매트릭스 |

**작업 중 참조**

| 문서 | 내용 |
|---|---|
| [GLOSSARY.md](docs/product/GLOSSARY.md) | 도메인·상태값·시스템 용어 |
| [DATA_DICTIONARY.md](docs/product/DATA_DICTIONARY.md) | DB 필드 단위 설명 (원천: `backend/db/schema.sql`) |
| [API_REFERENCE.md](docs/product/API_REFERENCE.md) | 백엔드 REST 엔드포인트별 요청/응답·검증·curl |
| [UI_SPEC.md](docs/product/UI_SPEC.md) | 화면·컴포넌트·스토어 계약, 와이어프레임 |
| [TEST_PLAN.md](docs/product/TEST_PLAN.md) | 테스트 레벨·케이스(TC-xx)·머지 게이트 |
| [DOC_PLAN.md](docs/product/DOC_PLAN.md) | 문서 세분화 계획·작성 프롬프트 (메타) |

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

전체 환경 구축 절차는 [SETUP.md](docs/setup/SETUP.md), 프로젝트 맥락은 [ONBOARDING.md](docs/ONBOARDING.md) 를 본다.

---

## 🗂️ 저장소 구조

```
my-setup-proj/
├─ frontend/   Electron + React 데스크톱 앱 (React 미연결 — G1)
├─ backend/    Node.js + Express API (tasks/projects CRUD 라우트 + db/schema.sql)
├─ agent/      Python Claude 에이전트 (뼈대 + 서비스 스텁)
├─ scripts/    작업로그·슬랙·다이어그램 자동화 스크립트
├─ tests/      테스트 (Phase A3 에서 채움)
├─ docs/       ONBOARDING + product / setup / progress
└─ .claude/    에이전트 팀 정의 + /feature 파이프라인
```

---

## 📊 현재 상태 (2026-09-02)

| 영역 | 상태 |
|---|---|
| 개념 설계 · 요구사항 · 아키텍처 문서 | ✅ 완료 (`docs/product/`) |
| 자동화 인프라 (에이전트 팀 · 작업로그 · CI · GIT_WORKFLOW) | ✅ 동작 |
| 로컬 개발 환경 (node 26 · python 3.14 · venv) | ✅ Phase A2 완료 (`verify.sh` 12/0/0) |
| 백엔드 tasks/projects CRUD 라우트 | 🚧 인메모리, 실행·CRUD curl 검증됨 |
| 프론트엔드 React | ❌ 미연결 (번들러 없음) — G1, Phase B1 |
| DB (SQLite) | ⏳ Phase B2 |
| AI 에이전트 | 🚧 뼈대 + 스텁 (모듈 import 확인) |
| 자동화 테스트 | ❌ 0개 — 다음 작업 (Phase A3) |

정확한 최신은 [AS_IS.md](docs/product/AS_IS.md) · [TRACEABILITY.md](docs/product/TRACEABILITY.md) · `git log`. 다음 할 일은 [PROGRESS.md](docs/progress/PROGRESS.md).

---

## 🔧 개발 방식

기능 하나를 `/feature <설명>` 으로 시작하면 네 에이전트가 순서대로 처리한다:

```
planner(계획) → developer(구현) → supervisor(리뷰·검증) → finisher(커밋·푸시)
```

`/build-next` 는 로드맵([DESIGN §8](docs/product/DESIGN.md))을 스스로 따라가며 이 파이프라인을 반복 실행하고,
사람이 결정할 지점(제안 ADR·API 키·대화형)에서만 멈춘다.

- 상태 그래프·정지 조건: [ORCHESTRATION.md](docs/setup/ORCHESTRATION.md)
- 규칙: [CONVENTIONS.md](docs/setup/CONVENTIONS.md) · 커밋·푸시: [GIT_WORKFLOW.md](docs/setup/GIT_WORKFLOW.md) · 전체: [AUTOMATION.md](docs/setup/AUTOMATION.md)
- 미결정 설계 사항은 제안 상태 [ADR](docs/product/adr/) (0009~0012) — 착수 전 결정.

---

## 📞 참고

- 강의 자료: https://wikidocs.net/book/10238
- Claude 문서: https://docs.claude.com
- 개인 학습 목적 프로젝트
