# 🧪 testing/ — 어떻게 검증

> 무엇을·어떻게 검증하고, 무엇이 통과해야 `main` 에 병합되는지.
> 요구사항은 [requirements/](../requirements/README.md), 커밋 게이트 전문은 [../../setup/GIT_WORKFLOW.md](../../setup/GIT_WORKFLOW.md).

**📂 이동:** [⬆ product/](../README.md) · [docs/](../../README.md) · [🚀 ONBOARDING](../../ONBOARDING.md)
**카테고리:** [🎯 vision](../vision/README.md) → [✅ requirements](../requirements/README.md) → [🏛 architecture](../architecture/README.md) → [📚 reference](../reference/README.md) · **🧪 testing**

---

## 이 폴더의 문서

| 문서 | 무엇 | 언제 참조 | ⚠️ 놓치기 쉬운 것 |
|---|---|---|---|
| [TEST_PLAN.md](TEST_PLAN.md) | 테스트 피라미드(단위·통합·수동·E2E), 도구(node:test·supertest·pytest·CI), **케이스 표 TC-\***(전제·입력·기대), 픽스처 정책, 머지 게이트, "테스트 없이 머지 불가" 기준 | 기능 착수 시 필요 TC, PR 전 자기 점검 | §0 피라미드+게이트 다이어그램. 브라우저 E2E(TC-UI-10~16)는 로컬 수동 대기 상태. 위젯 = TC-WIDGET-* (예정) |

---

## 검증 도구 한눈에

| 무엇 | 명령 | 대상 |
|---|---|---|
| 환경 + 문법 + 테스트 | `bash verify.sh` | 로컬 전체 (현재 19/0/0) |
| 문법만 (문서 커밋) | `bash verify.sh --code-only` | 12개 검사 |
| 백엔드 테스트 | `cd backend && npm test` | supertest + node:test (TC-TASK/PROJ/DB/MW) |
| 에이전트 테스트 | `cd agent && pytest` | 순수 로직 (TC-AGENT-*) |
| CI | GitHub Actions `Test & Build` | node 22 / python 3.12, 모든 push·PR |

## 머지 게이트 (요약 — 전문은 [GIT_WORKFLOW.md](../../setup/GIT_WORKFLOW.md) §1)

- 실행돼서 **FAIL** 난 검사가 있으면 커밋 금지.
- **SKIP 은 SKIP 이라고 보고** — 실행 안 한 검사를 "통과" 로 말하지 않는다.
- `main` 병합 = CI green + 검증 게이트 통과.

## 다음으로

| 하려는 것 | 가는 곳 |
|---|---|
| 이 TC 가 어느 FR/NFR 인지 | [../requirements/TRACEABILITY.md](../requirements/TRACEABILITY.md) |
| 커밋·푸시·브랜치 절차 | [../../setup/GIT_WORKFLOW.md](../../setup/GIT_WORKFLOW.md) |
| NFR 측정 기준 | [../requirements/REQUIREMENTS_NONFUNCTIONAL.md](../requirements/REQUIREMENTS_NONFUNCTIONAL.md) §5 |

---

**작성:** 2026-09-04
