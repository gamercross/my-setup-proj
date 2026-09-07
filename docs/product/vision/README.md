# 🎯 vision/ — 왜 만드나, 완료의 정의

> 제품이 무엇이고, 누구를 위한 것이고, 지금 어디쯤이며, 무엇이 틀어질 수 있는지.
> 여기서 **왜**를 잡고 → [requirements/](../requirements/README.md) 에서 **무엇을**, → [architecture/](../architecture/README.md) 에서 **어떻게**.

**📂 이동:** [⬆ product/](../README.md) · [docs/](../../README.md) · [🚀 ONBOARDING](../../ONBOARDING.md)
**카테고리:** **🎯 vision** → [✅ requirements](../requirements/README.md) → [🏛 architecture](../architecture/README.md) → [📚 reference](../reference/README.md) · [🧪 testing](../testing/README.md)

---

## 이 폴더의 문서

| 문서 | 무엇 | 언제 참조 | ⚠️ 놓치기 쉬운 것 |
|---|---|---|---|
| [VISION.md](VISION.md) | 제품 한 줄 정의(**대시보드 OS**), 목표, 핵심 기능 4종, 완료 기준, 큰 그림 다이어그램 | 방향이 흔들릴 때, "이거 범위 맞나" 판단 | 완료 기준이 위젯 셸(FR-WIDGET-01·02·04·05)까지 포함하도록 갱신됨 (2026-09-03) |
| [DASHBOARD_OS.md](DASHBOARD_OS.md) | 위젯 셸 개념 분석 — 무엇을 바꾸나, 벤치마크 6종, 위젯 모델·`config` 스키마, 범위 경계, 공부 목록, **열린 질문 DO-1~6** | 위젯/셸 관련 작업 착수 전 | DO-1~6 은 **착수 전 사용자 결정** 필요 (배치 방식·저장 위치 등). 권고안 있음 |
| [PERSONAL_OS.md](PERSONAL_OS.md) | Phase D 이후 방향 — 개인 생산성 OS(단일 완료·자동 분류·OKR 주간 플래너·에이전트 활동 UI) + **라이트 테마 비주얼 시스템**. 역량 테마 T1~T6, 토큰 v2, 단계 계획 P0~P9, **열린 질문 PO-1~11** | 이 방향의 작업 착수 전, "이 기능 어느 테마인가" | 참조 스크린샷의 개별 위젯 소재(주식·금은 등)는 **스타일만** 참고 — 도메인 밖. 진행 다이어그램은 [../../progress/PROGRESS.md](../../progress/PROGRESS.md) |
| [AS_IS.md](AS_IS.md) | 현행 구현 상태(구성요소별 ✅/🚧/❌), 모듈 의존 그래프, **갭 G1~G9** | 작업 시작 시 "지금 실제로 뭐가 돼 있나" | 갭↔요구사항 매핑은 [../requirements/TRACEABILITY.md](../requirements/TRACEABILITY.md) §1 에. 스냅샷이라 `git log` 로 교차 확인 |
| [CONSTRAINTS.md](CONSTRAINTS.md) | 기술·자원 제약(T-*), 가정(A-*), 규모·비용 추정 | 새 의존성·서비스 도입 검토 시 | A-1(사용자 1명, Week 9까지), A-6(better-sqlite3 3-OS 빌드) 등 재검토 조건 명시됨 |
| [RISKS.md](RISKS.md) | 리스크 레지스터 R-1~R-16 (확률×영향×완화), Phase 축 타임라인 | 일정 계획, 무엇을 먼저 할지 | R-1(1인+시험기간 시간부족)이 🔴. 완화 = P0 우선 + Phase D 앞당김 |
| [USE_SCENARIOS.md](USE_SCENARIOS.md) | 이해관계자, 사용 여정 S-1~S-6 | 기능이 실제 흐름에 맞는지, UX 판단 | 각 시나리오에 관련 FR·ADR 링크 |

---

## 읽는 순서

1. **VISION** (+ DASHBOARD_OS) — 무엇을 만드나
2. **AS_IS** — 지금 어디까지
3. **CONSTRAINTS** + **RISKS** — 전제와 위험
4. **USE_SCENARIOS** — 실제 사용 흐름

## 다음으로

| 하려는 것 | 가는 곳 |
|---|---|
| 요구사항 ID·수용 기준 | [../requirements/README.md](../requirements/README.md) |
| 구조·설계·결정 이력 | [../architecture/README.md](../architecture/README.md) |
| 주차별 일정 | [../ROADMAP.md](../ROADMAP.md) |
| 현재 진행률 | [../../progress/README.md](../../progress/README.md) |

---

**작성:** 2026-09-04
