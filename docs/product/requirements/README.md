# ✅ requirements/ — 무엇을 만족해야 하나

> 시스템이 **무엇을 해야 하고**(FR) **어떤 품질로 동작해야 하는지**(NFR), 그리고 그것이 갭·설계·테스트·코드에 어떻게 연결되는지(TRACEABILITY).
> 왜는 [vision/](../vision/README.md), 어떻게는 [architecture/](../architecture/README.md).

**📂 이동:** [⬆ product/](../README.md) · [docs/](../../README.md) · [🚀 ONBOARDING](../../ONBOARDING.md)
**카테고리:** [🎯 vision](../vision/README.md) → **✅ requirements** → [🏛 architecture](../architecture/README.md) → [📚 reference](../reference/README.md) · [🧪 testing](../testing/README.md)

---

## 이 폴더의 문서

| 문서 | 무엇 | 언제 참조 | ⚠️ 놓치기 쉬운 것 |
|---|---|---|---|
| [REQUIREMENTS_FUNCTIONAL.md](REQUIREMENTS_FUNCTIONAL.md) | FR 요약표 (도메인 8 + WIDGET), 도메인 지도 다이어그램, 우선순위(P0/P1/P2)·목표 주차·상태 | 기능 착수 전 "이게 어느 FR인가", 완료 기준 | 요약표일 뿐 — 수용 기준은 도메인별 상세 문서(아래). §9 WIDGET 은 대시보드 OS |
| [REQUIREMENTS_NONFUNCTIONAL.md](REQUIREMENTS_NONFUNCTIONAL.md) | NFR 8범주(PERF·REL·SEC·MAINT·TEST·PORT·DEPLOY·OBS), 각 항목의 **측정 기준 + 검증 방법**, 경량 위협 모델 §3.1 | 리뷰(supervisor), 보안·성능 판단 | 맨 아래 "지금 강제할 것" 매트릭스. §3.1 위협 모델은 [../architecture/](../architecture/README.md) 로 승격 예정 |
| [TRACEABILITY.md](TRACEABILITY.md) | 갭 G → FR/NFR → 설계/ADR → Phase → 테스트 TC → 코드 위치 → **상태** 한 줄 매트릭스, 추적 사슬 다이어그램 | 작업 시작 시 해당 행, finisher 가 상태 갱신 | **finisher 가 기능 완료 시 상태·코드 위치를 갱신**(GIT_WORKFLOW). "착수 전 결정할 사항" 표 포함 |
| [TASK.md](TASK.md) | 할일 도메인 상세 — 사용자 스토리·Given/When/Then·입력 규칙·오류 시나리오 (P0 완료) | FR-TASK-* 구현/리뷰 | — |
| [UI.md](UI.md) | 대시보드 공통 UI 상세 (FR-UI-01·04 의 "영역별 4상태·격리" 원칙) | FR-UI-* 및 위젯 격리(FR-WIDGET-07) | 위젯 셸이 이 원칙을 위젯 단위로 계승 |
| [AGENT.md](AGENT.md) | Daily Brief 에이전트 상세 (수집·Claude·실패 격리) (P0 완료, P1 초안) | Phase D 착수 시 | FR-AGENT-08(작업 큐)는 [ADR-0013](../architecture/adr/ADR-0013-dashboard-agent-queue.md) 제안 상태 |
| [PROJ.md](PROJ.md) | 프로젝트 도메인 상세 (P0 완료, C2) | FR-PROJ-* | `tasks.project_id` 는 [ADR-0012](../architecture/adr/ADR-0012-task-project-link.md) |
| [CAL.md](CAL.md) | 캘린더/일정 도메인 상세 — FR-CAL-01~03 (조회 API·날짜 배지·캐시) (C3 — 더미 데이터) | FR-CAL-* 구현/리뷰 | C3 는 `services/calendar.js` 더미, 실 데이터는 D2 ([ADR-0011](../architecture/adr/ADR-0011-agent-backend-db-access.md)); `from > to` 는 400 아닌 200 |
| [MAIL.md](MAIL.md) | 이메일 도메인 상세 — FR-MAIL-01 (Gmail 미읽은 메일 수집·캐시) (D2-b — agent 측 완료) | FR-MAIL-* 구현/리뷰 | 조회 API `GET /api/mail/unread` 는 아직 미구현 (별도 Phase). 캐시는 `emails` — 에이전트 소유([ADR-0011](../architecture/adr/ADR-0011-agent-backend-db-access.md)) |
| [AUTH.md](AUTH.md) | 인증 도메인 상세 — FR-AUTH-01 (Google OAuth 데스크톱 흐름 + 암호화 토큰 저장) (D2-b 완료) | Phase D·E 착수 시 | 토큰 저장은 [ADR-0024](../architecture/adr/ADR-0024-oauth-token-storage.md) (Fernet). `GOOGLE_REDIRECT_URI` 는 미사용 |
| [WIDGET.md](WIDGET.md) | 🆕 위젯 셸 상세 — FR-WIDGET-01~08 (배치·생명주기·z-order·영속화·위젯별 테마·표시 옵션·격리·레지스트리) | Phase C5~C6 착수 시 | 전부 **제안** — 착수 전 [../vision/DASHBOARD_OS.md](../vision/DASHBOARD_OS.md) §8 DO-1~6 결정 |

---

## ID 체계

- 기능: `FR-<도메인>-<번호>` (도메인: TASK·PROJ·CAL·MAIL·AGENT·AUTH·SYNC·UI·WIDGET)
- 비기능: `NFR-<범주>-<번호>` (범주: PERF·REL·SEC·MAINT·TEST·PORT·DEPLOY·OBS)
- 우선순위: **P0**(완료 기준) · P1(있어야) · P2(선택)
- 상태: ⏳ 예정 · 🚧 진행 · ✅ 완료

## 다음으로

| 하려는 것 | 가는 곳 |
|---|---|
| 이 요구사항을 어떻게 구현하나 | [../architecture/DESIGN.md](../architecture/DESIGN.md) · [../architecture/adr/](../architecture/adr/README.md) |
| API/화면 계약 | [../reference/README.md](../reference/README.md) |
| 테스트 케이스 | [../testing/TEST_PLAN.md](../testing/TEST_PLAN.md) |
| 일정 | [../ROADMAP.md](../ROADMAP.md) |

---

**작성:** 2026-09-04
