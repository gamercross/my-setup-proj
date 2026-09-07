# 📈 progress/ — 얼마나 됐는가

> 주간 진행 상황과 3강의(A·B·C) 주차 매핑. "지금 실제로 뭐가 돼 있나" 는 [../product/vision/AS_IS.md](../product/vision/AS_IS.md) 와 `git log` 로도 교차 확인한다.

**📂 이동:** [⬆ docs/](../README.md) · [🚀 ONBOARDING](../ONBOARDING.md) · [product/](../product/README.md) · [setup/](../setup/README.md)

---

## 이 폴더의 문서

| 문서 | 무엇 | 언제 참조 | ⚠️ 놓치기 쉬운 것 |
|---|---|---|---|
| [PROGRESS.md](PROGRESS.md) | 주간 진행·체크리스트·마일스톤 (매주 월요일 갱신) | 이번 주 목표, 다음 할 일 | 스냅샷 — 상세는 [../product/requirements/TRACEABILITY.md](../product/requirements/TRACEABILITY.md)(FR별 상태), [../product/architecture/DESIGN.md](../product/architecture/DESIGN.md) §8(Phase) |
| [COURSE_MAPPING.md](COURSE_MAPPING.md) | 3강의(A·B·C) 주차 ↔ 프로젝트 산출물 매핑 | 강의 진도·발표와 맞추기 | 강의 A 는 주차별 기술 종속, 강의 B·C 는 W8·W15 마감만 제약 |
| [NEXT_SESSION.md](NEXT_SESSION.md) | 세션 인계 스냅샷 — 컨텍스트 clear 직전 "지금 어디까지 왔나 / 다음 첫 작업" 기록 | 새 세션 시작 시 **가장 먼저** | 스냅샷이라 갱신 시점 이후 상태는 PROGRESS·git 로 교차 확인 |
| [DEMO_FEEDBACK.md](DEMO_FEEDBACK.md) | 라이브 웹 데모(<https://gamercross.github.io/my-setup-proj/>) 체크 시나리오·한계·피드백 로그 | 데모를 보고 버그·개선점을 남길 때, 밀려 있던 브라우저 수동 체크(TC-UI/TC-WIDGET) 진행 | 데모 한계(§3)와 실제 버그를 구분 — 새로고침 초기화·빈 위젯은 의도된 동작 |

관련 (progress/ 밖):

| 문서 | 위치 | 내용 |
|---|---|---|
| 작업로그.md | 저장소 루트 | 날짜별 요약(작성) + 커밋(자동). 매 턴 갱신, 매일 23:50 커밋·슬랙 |
| ROADMAP.md | [../product/ROADMAP.md](../product/ROADMAP.md) | 전체 일정(계획) — 실시간 상태는 아님 |
| TRACEABILITY.md | [../product/requirements/TRACEABILITY.md](../product/requirements/TRACEABILITY.md) | FR/NFR별 상태 (finisher 가 갱신) |

---

## 진척 확인 순서 (권위 순)

1. `git log` — 가장 정확
2. [../product/vision/AS_IS.md](../product/vision/AS_IS.md) §2 — 구성요소별 상태
3. [../product/requirements/TRACEABILITY.md](../product/requirements/TRACEABILITY.md) — FR별
4. [../product/architecture/DESIGN.md](../product/architecture/DESIGN.md) §8 — Phase 표
5. PROGRESS.md — 주간 요약

## 다음으로

| 하려는 것 | 가는 곳 |
|---|---|
| 무엇을 만드나 | [../product/README.md](../product/README.md) |
| 규칙·환경 | [../setup/README.md](../setup/README.md) |

---

**작성:** 2026-09-04
