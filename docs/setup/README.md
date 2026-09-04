# 🔧 setup/ — 어떤 세팅·규칙인가

> 개발 환경, 코드·커밋·브랜치 규칙, 에이전트 파이프라인, 자동화, 다이어그램 작성법.
> 제품 자체는 [../product/](../product/README.md), 진행 상태는 [../progress/](../progress/README.md).

**📂 이동:** [⬆ docs/](../README.md) · [🚀 ONBOARDING](../ONBOARDING.md) · [product/](../product/README.md) · [progress/](../progress/README.md)

---

## 이 폴더의 문서

| 문서 | 무엇 | 언제 참조 | ⚠️ 놓치기 쉬운 것 |
|---|---|---|---|
| [SETUP.md](SETUP.md) | 개발 환경 완전 설정 (Node·Python·Git·API 키) | 새 머신, `bash setup.sh` 전후 | 개발 머신은 Phase A2 로 이미 구축됨 |
| [ENV_REFERENCE.md](ENV_REFERENCE.md) | `.env.example` 의 모든 키 — 용도·발급법·없을 때 동작·보안 규칙 | API 키 추가, 환경변수 확인 | **`.env` 는 절대 커밋 금지**. `.env.example` 에도 실제 시크릿을 넣지 않는다 (NFR-SEC-01) |
| [CONVENTIONS.md](CONVENTIONS.md) | 코드·구조·커밋·브랜치·에이전트 규칙의 **단일 원천** | 코드 작성/리뷰 전 | §6 브랜치 = `feature/* → PR → main` ([ADR-0023](../product/architecture/adr/ADR-0023-branch-model.md)) |
| [GIT_WORKFLOW.md](GIT_WORKFLOW.md) | finisher 커밋·푸시 절차, **검증 게이트 해석**, 스테이징 규칙, 체크리스트 | 커밋 직전 | FAIL 검사 있으면 커밋 금지 / SKIP 명시 / `main` 직접·`--force` 금지 |
| [ORCHESTRATION.md](ORCHESTRATION.md) | 에이전트 파이프라인 **상태 그래프**, `/feature`·`/build-next` 정지 조건 | 파이프라인 동작 이해 | 결정 지점(제안 ADR·API 키·대화형)에서 STOP |
| [AUTOMATION.md](AUTOMATION.md) | 에이전트 팀 · `/feature` · `/build-next` · 작업로그 · 슬랙 · CI 전체 개요 | 자동화가 어떻게 도는지 | 슬랙은 `SLACK_WEBHOOK_URL` 없으면 조용히 스킵 |
| [DIAGRAMS.md](DIAGRAMS.md) | Mermaid 작성·열람·SVG 내보내기 (`scripts/render-diagrams.sh`) | 다이어그램 추가 시 | GitHub 는 자동 렌더. 로컬 이미지는 Node 필요 |
| [CLAUDE_INTEGRATION.md](CLAUDE_INTEGRATION.md) | Claude API·MCP 설정, Daily Brief 에이전트 | Phase D 에이전트 착수 시 | 모델 `claude-opus-5`, 상수는 `agent/services/claude.py` 한 곳 |

---

## 자주 쓰는 것

| 하려는 것 | 문서 / 명령 |
|---|---|
| 새 머신 세팅 | [SETUP.md](SETUP.md) → `bash setup.sh` → `bash verify.sh` |
| 커밋해도 되나 판단 | [GIT_WORKFLOW.md](GIT_WORKFLOW.md) §1 |
| 브랜치 정책 | [CONVENTIONS.md](CONVENTIONS.md) §6 · [ADR-0023](../product/architecture/adr/ADR-0023-branch-model.md) |
| 기능 하나 개발 | `/feature <설명>` → [ORCHESTRATION.md](ORCHESTRATION.md) |

## 다음으로

| 하려는 것 | 가는 곳 |
|---|---|
| 무엇을 만드나 | [../product/README.md](../product/README.md) |
| 지금 어디까지 | [../progress/README.md](../progress/README.md) |
| 테스트·머지 게이트 | [../product/testing/README.md](../product/testing/README.md) |

---

**작성:** 2026-09-04
