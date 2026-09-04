# 🏛 architecture/ — 어떻게 만드나 (구조·결정)

> 구조를 관점(뷰)별로 나눠 본다 — C4/arc42 방식. **[ARCHITECTURE.md](ARCHITECTURE.md) §0 뷰 지도**가 여기서 아래로 분기하는 진입점이다.
> 무엇을 만족해야 하는지는 [requirements/](../requirements/README.md), 정확한 계약은 [reference/](../reference/README.md).

**📂 이동:** [⬆ product/](../README.md) · [docs/](../../README.md) · [🚀 ONBOARDING](../../ONBOARDING.md)
**카테고리:** [🎯 vision](../vision/README.md) → [✅ requirements](../requirements/README.md) → **🏛 architecture** → [📚 reference](../reference/README.md) · [🧪 testing](../testing/README.md)

---

## 이 폴더의 문서 (뷰별)

| 문서 | 뷰 / 무엇 | 언제 참조 | ⚠️ 놓치기 쉬운 것 |
|---|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | **§0 뷰 지도**(어디를 봐야 하나), 개념 레벨 시스템 구조, 기술 스택, 배포, **§버전 관리**(브랜치 모델) | 전체 그림, 스택 확인, 처음 진입 | §0 표에서 원하는 뷰로 바로 이동. §버전관리는 [adr/ADR-0023](adr/ADR-0023-branch-model.md) 반영됨(`develop` 안 씀) |
| [DESIGN.md](DESIGN.md) | 설계 원칙, **§2 ADR 목록표**, 목표 구조(TO-BE) 다이어그램, 데이터 모델 관계, API 설계 규칙, 프론트/에이전트 컴포넌트, **§8 Phase A~E 표**, 흐름 시퀀스 | 구현 착수 전, 어느 Phase 인지 | §8 이 Week↔Phase 대응의 단일 원천. 위젯 셸 = C5·C6. `routes→services→db` 계층은 목표(services 아직 없음) |
| [ARCHITECTURE_DRIVERS.md](ARCHITECTURE_DRIVERS.md) | 왜 이 구조인가 — ASR-1~8, 품질 속성 시나리오 QAS-1~8, **피트니스 함수 FF-1~9**, 트레이드오프 레지스터 | "이거 과설계 아닌가", 구조 규칙 확인 | FF-* 는 구조 규칙을 테스트로 강제하자는 것 ([ADR-0019](adr/ADR-0019-architecture-fitness-functions.md), 제안) |
| [RUNTIME_VIEW.md](RUNTIME_VIEW.md) | 실행 중 프로세스(Electron·Express·에이전트), 시작/종료 순서, **연결 상태 머신**(백엔드 다운 ≠ 오프라인), 미결 RT-1~5 | 앱 실행·패키징·장애 대응 설계 | 백엔드 자동 기동 여부는 [ADR-0016](adr/ADR-0016-desktop-process-topology.md)(제안, Week 5 확정) |
| [DATA_ARCHITECTURE.md](DATA_ARCHITECTURE.md) | 데이터 분류(비밀/민감/개인/UI상태/운영), 쓰기 소유권(테이블당 1), 스키마 마이그레이션, 캐시 신선도·보관, 동기화 충돌 모델, 수명주기 다이어그램 | 스키마 변경, 캐시·동기화 작업 | `IF NOT EXISTS` 만으론 컬럼 변경 불가 → [ADR-0018](adr/ADR-0018-schema-migration-strategy.md)(제안). 위젯 레이아웃은 UI 상태(별도 계층) |
| [CROSSCUTTING.md](CROSSCUTTING.md) | 설정 우선순위, **오류 계약**(problem+json), 로깅·상관 id, 복원력(타임아웃·재시도표), 멱등성, 시간(ISO8601 UTC) | 오류 처리·로깅·외부 호출 구현 | 오류 응답 확장은 [ADR-0017](adr/ADR-0017-rest-error-contract.md)(제안). 재시도는 멱등 연산만 |
| [ARCHITECTURE_EVOLUTION.md](ARCHITECTURE_EVOLUTION.md) | 로컬 단일 사용자 → 다중 사용자/클라우드 진화 경로, Stage 1~3, **지금 만들어 둘 이음새**, 되돌리기 어려운 결정 | Week 10 전 Supabase·인증 설계 | "지금 만들어 둘 이음새" 표 — `user_id` 자리, db 인터페이스 고정 등 |
| [adr/](adr/README.md) | **결정 이력 ADR-0001~0023** (하나 = 파일 하나). 목록·상태·템플릿은 [adr/README.md](adr/README.md) | "왜 이렇게 정했나", 새 결정 추가 시 | 0001~0012 채택 / 0013~0022 제안 / 0023 채택. 착수 전 제안 ADR 결정 필요 |

---

## 뷰 지도 (ARCHITECTURE.md §0 요약)

| 뷰 | 질문 | 문서 |
|---|---|---|
| 드라이버 | 왜 이 구조인가 | [ARCHITECTURE_DRIVERS.md](ARCHITECTURE_DRIVERS.md) |
| 컨텍스트/컨테이너 | 무엇이 있고 어떻게 연결되나 | [ARCHITECTURE.md](ARCHITECTURE.md) §1, [DESIGN.md](DESIGN.md) §3 |
| 컴포넌트 | 각 컨테이너 내부 | [DESIGN.md](DESIGN.md) §6·§7, [../reference/UI_SPEC.md](../reference/UI_SPEC.md) |
| 런타임 | 실행 중 프로세스·장애 | [RUNTIME_VIEW.md](RUNTIME_VIEW.md) |
| 데이터 | 스키마 진화·캐시·충돌 | [DATA_ARCHITECTURE.md](DATA_ARCHITECTURE.md) |
| 횡단 관심사 | 오류·로깅·설정·복원력 | [CROSSCUTTING.md](CROSSCUTTING.md) |
| 진화 | 로컬 → 다중 사용자/클라우드 | [ARCHITECTURE_EVOLUTION.md](ARCHITECTURE_EVOLUTION.md) |
| 결정 이력 | 무엇을 언제 왜 | [adr/](adr/README.md) |

## 다음으로

| 하려는 것 | 가는 곳 |
|---|---|
| API/화면/DB 필드 정확한 계약 | [../reference/README.md](../reference/README.md) |
| 테스트 케이스·머지 게이트 | [../testing/TEST_PLAN.md](../testing/TEST_PLAN.md) |
| 요구사항 ID | [../requirements/README.md](../requirements/README.md) |
| 아키텍처 학습 자료 | [../../STUDY_GUIDE.md](../../STUDY_GUIDE.md) |

---

**작성:** 2026-09-04
