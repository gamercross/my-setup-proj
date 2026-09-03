# ADR-0023: 브랜치 모델 — `feature/* → PR → main` (Git Flow 미채택)

- 상태: 채택 (2026-09-03)
- 관련: [GIT_WORKFLOW.md](../../../setup/GIT_WORKFLOW.md) §2, [CONVENTIONS.md](../../../setup/CONVENTIONS.md) §6, NFR-MAINT-05

## 맥락
`ARCHITECTURE.md §버전 관리` 는 초안 단계에서 `main ← develop ← feature/*` + 릴리스 태그의 **Git Flow** 다이어그램을 담았다. 그러나 `develop` 브랜치는 만든 적이 없고, 실제 이력(PR #1~#4)은 전부 `feature/<이름> → PR → main` 이다. 문서와 실제가 갈라져 있어 어느 쪽이 규칙인지 혼동된다. 하나로 정한다.

## 결정
**`feature/<짧은-이름>` 에서 작업 → 푸시 → PR → `main`.** `develop` 브랜치·Git Flow 는 쓰지 않는다.

- `main` 직접 커밋 금지 (문서 전용 변경 포함). `main` 강제 푸시·`git push --force` 금지.
- `main` 병합 조건: CI(`Test & Build`) 통과 + 검증 게이트([GIT_WORKFLOW.md](../../../setup/GIT_WORKFLOW.md) §1) 통과.
- 브랜치명: `feature/<주제>` (예: `feature/c5-widget-shell`). Phase 이름을 접두어로 쓰면 로드맵과 맞물려 읽기 쉽다.
- 스택 PR: 의존하는 변경은 PR 을 쌓고 아래부터 병합, 병합 때마다 상위 PR base 를 `main` 으로 재지정 (PR #1→#2→#3 선례).
- `/feature`·`/build-next` 오케스트레이터는 단계 시작 시 브랜치를 확인하고, `main` 위면 먼저 `feature/*` 를 만든다.
- 태그: 릴리스 시점에 `main` 에 `v<major>.<minor>.<patch>` (+ `-alpha`/`-beta`).

## 근거
- **1인 + 14주 강의 프로젝트.** `develop` 은 여러 명이 통합 브랜치를 공유할 때 이득이 크다. 혼자면 `feature → main` PR 만으로 충분하고, 통합 브랜치를 하나 더 관리하는 비용만 남는다.
- 이미 그렇게 하고 있다 (PR #1~#4). 문서를 실제에 맞추는 것.
- GitHub PR 이 리뷰·CI 게이트·병합 이력을 다 제공하므로 `develop` 이 주던 "미완성 통합 지점" 역할이 불필요.

## 대안
- **Git Flow (`develop` + `release/*` + `hotfix/*`):** 통합 브랜치·릴리스 브랜치 관리 비용. 솔로에 과함.
- **GitHub Flow 그대로 (지금 결정과 거의 동일):** 사실상 이걸 택하는 것. 명시만 함.
- **Trunk-based (`main` 직접 + 피처 플래그):** 리뷰 게이트가 약해지고, 검증 안 된 변경이 `main` 에 들어갈 위험.

## 결과 / 트레이드오프
- `ARCHITECTURE.md §버전 관리` 의 `develop` gitGraph 를 실제 흐름으로 교체 (이 ADR 와 함께).
- `ONBOARDING.md`·`CONVENTIONS.md`·`GIT_WORKFLOW.md` 의 "초기 셋업엔 main 직접 커밋 허용" 문구를 **"feature 브랜치 + PR 이 기본"** 으로 통일 (Week 1 부터 이미 그렇게 운용 중 — 작업로그의 "B3 main 직접 커밋 = 정책 위반" 기록 참조).
- 여러 명이 합류하면 이 ADR 를 재검토한다 (그때 `develop` 또는 릴리스 브랜치 도입 여부).
