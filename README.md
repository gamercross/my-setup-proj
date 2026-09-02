# 🤖 my-setup-proj

> Windows / macOS / Linux 어디서든 켜는 생산성 대시보드 + Claude AI 에이전트.
> 우숭대학교 "AI 컴퓨터 운영체제 실습" 강의(14주)의 실습 환경 겸 최종 프로젝트.

**시작** 2026-09-02 · **목표 완성** 2026-11-30

---

## 📚 문서 지도

문서는 목적별로 세 갈래로 나뉜다.

### 1. 무엇을 만드는가 — [`docs/product/`](docs/product/)

| 문서 | 내용 |
|---|---|
| [VISION.md](docs/product/VISION.md) | 제품 정의, 목표, 핵심 기능, 완료 기준 |
| [ARCHITECTURE.md](docs/product/ARCHITECTURE.md) | 시스템 구조, 기술 스택, 데이터 흐름, DB 스키마 |
| [ROADMAP.md](docs/product/ROADMAP.md) | Phase 1~4 개발 로드맵, 주차별 일정 |
| [AS_IS.md](docs/product/AS_IS.md) | 현행 시스템 분석 (구현 상태, 갭) |
| [REQUIREMENTS_FUNCTIONAL.md](docs/product/REQUIREMENTS_FUNCTIONAL.md) | 기능 요구사항 (FR-xx) 요약표 + [requirements/](docs/product/requirements/) 도메인별 상세 |
| [REQUIREMENTS_NONFUNCTIONAL.md](docs/product/REQUIREMENTS_NONFUNCTIONAL.md) | 비기능 요구사항 (NFR-xx) |
| [DESIGN.md](docs/product/DESIGN.md) | 아키텍처 결정, 데이터 모델, API 명세, 단계별 구현 계획 |
| [DOC_PLAN.md](docs/product/DOC_PLAN.md) | 문서 세분화 계획 및 작성 프롬프트 |
| [GLOSSARY.md](docs/product/GLOSSARY.md) | 도메인·상태·시스템 용어 정의 |
| [DATA_DICTIONARY.md](docs/product/DATA_DICTIONARY.md) | DB 필드 단위 설명 (`backend/db/schema.sql` 기준) |
| [API_REFERENCE.md](docs/product/API_REFERENCE.md) | 백엔드 REST 엔드포인트별 요청/응답·검증·curl |
| [UI_SPEC.md](docs/product/UI_SPEC.md) | 화면·컴포넌트·스토어 계약, 와이어프레임 |

### 2. 어떤 세팅이 필요한가 — [`docs/setup/`](docs/setup/)

| 문서 | 내용 |
|---|---|
| [SETUP.md](docs/setup/SETUP.md) | 개발 환경 구축 (Node.js / Python / Git / API 키) |
| [CONVENTIONS.md](docs/setup/CONVENTIONS.md) | 코드·구조·커밋·에이전트 작업 규칙 (단일 원천) |
| [GIT_WORKFLOW.md](docs/setup/GIT_WORKFLOW.md) | 에이전트 커밋·푸시 절차, 검증 게이트 해석 |
| [ENV_REFERENCE.md](docs/setup/ENV_REFERENCE.md) | `.env` 키별 용도·발급 방법·보안 규칙 |
| [CLAUDE_INTEGRATION.md](docs/setup/CLAUDE_INTEGRATION.md) | Claude API·MCP 설정, Daily Brief 에이전트 |
| [AUTOMATION.md](docs/setup/AUTOMATION.md) | Claude Code 자동화 (에이전트 팀 · `/feature` · 작업로그 · 슬랙 · CI) |

### 3. 얼마나 됐는가 — [`docs/progress/`](docs/progress/)

| 문서 | 내용 |
|---|---|
| [PROGRESS.md](docs/progress/PROGRESS.md) | 주간 진행 상황, 체크리스트, 마일스톤 (매주 월요일 갱신) |
| [COURSE_MAPPING.md](docs/progress/COURSE_MAPPING.md) | 강의 주차 ↔ 프로젝트 작업 매핑 |
| [작업로그.md](작업로그.md) | 날짜별 커밋 기록 (매 턴 자동 갱신, 매일 23:50 커밋) |

---

## ⚡ 빠른 시작

```bash
git clone git@github.com:gamercross/my-setup-proj.git
cd my-setup-proj
bash setup.sh     # frontend/backend npm install + agent venv + .env 준비
bash verify.sh    # 환경·문법 점검
```

전체 환경 구축 절차는 [SETUP.md](docs/setup/SETUP.md) 를 따른다.

---

## 🗂️ 저장소 구조

```
my-setup-proj/
├─ frontend/   Electron + React 데스크톱 앱 (스캐폴드)
├─ backend/    Node.js + Express API (CRUD 라우트 골격)
├─ agent/      Python Claude 에이전트 (서비스 스텁)
├─ scripts/    작업로그·슬랙 자동화 스크립트
├─ tests/      테스트
├─ docs/       product / setup / progress
└─ .claude/    에이전트 팀 정의 + /feature 파이프라인
```

---

## 📊 현재 상태 (2026-09-02)

| 영역 | 상태 |
|---|---|
| 개념 설계 · 강의 매핑 | ✅ 완료 |
| 자동화 인프라 (에이전트 팀 · 작업로그 · CI) | ✅ 동작 중 |
| 백엔드 CRUD 라우트 | 🚧 골격만 (실행 검증 전) |
| 프론트엔드 컴포넌트 | 🚧 스캐폴드 (번들러 미연결) |
| AI 에이전트 | ⏳ 스텁 |
| DB (SQLite / Supabase) | ⏳ 예정 |

다음 할 일은 [PROGRESS.md](docs/progress/PROGRESS.md) 의 이번 주 항목 참고.

---

## 🔧 개발 방식

기능 하나를 `/feature <설명>` 으로 시작하면 네 에이전트가 순서대로 처리한다:

```
planner(계획) → developer(구현) → supervisor(리뷰·검증) → finisher(커밋·푸시)
```

자세한 규칙은 [AUTOMATION.md](docs/setup/AUTOMATION.md).

---

## 📞 참고

- 강의 자료: https://wikidocs.net/book/10238
- Claude 문서: https://docs.claude.com
- 개인 학습 목적 프로젝트
