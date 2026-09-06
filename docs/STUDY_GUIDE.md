# 📖 아키텍처 학습 가이드

> "프로세스는 잡혀 있는데 더 큰 틀의 아키텍처가 부족하다" 는 피드백에 대응하기 위한 공부 목록.
> 이 프로젝트의 어느 문서가 그 개념을 쓰는지 같이 표시한다.

**📂 이동:** [⬆ docs/](README.md) · [🚀 ONBOARDING](ONBOARDING.md) · [🏛 architecture/](product/architecture/README.md) · [📐 adr/](product/architecture/adr/README.md)

---

## 1. 지금 부족한 것 (한눈에)

이 저장소의 문서는 **요구사항 분해·추적성·테스트 계획·작업 프로세스** 는 탄탄하다.
부족한 건 "아키텍처를 하나의 분야로서 다루는 층" 이다. 구체적으로:

| 부족한 영역 | 왜 문제인가 | 보강 문서 |
|---|---|---|
| **아키텍처 뷰 분리 (C4 / arc42)** | `ARCHITECTURE.md` 의 다이어그램 1장이 컨텍스트·컨테이너·컴포넌트를 한 그림에 섞음. 층을 나눠 봐야 큰 틀이 보인다 | [ARCHITECTURE.md](product/architecture/ARCHITECTURE.md) §0 (뷰 지도) |
| **품질 속성이 아키텍처를 견인하지 않음** | NFR 이 체크리스트로만 존재. "이 NFR 때문에 이 구조를 택했다" 라는 연결(ASR·품질 시나리오)이 없음 | [ARCHITECTURE_DRIVERS.md](product/architecture/ARCHITECTURE_DRIVERS.md) |
| **런타임/프로세스 뷰 없음** | Electron·백엔드·에이전트가 각각 프로세스인데 누가 누구를 띄우고, 죽으면 어떻게 되는지 설계가 없음 (프로젝트가 이미 미결로 표시) | [RUNTIME_VIEW.md](product/architecture/RUNTIME_VIEW.md) |
| **횡단 관심사 통합 설계 없음** | 오류 계약·로깅 포맷·설정 우선순위·재시도/타임아웃이 ADR·DESIGN 여기저기 흩어져 있음 | [CROSSCUTTING.md](product/architecture/CROSSCUTTING.md) |
| **데이터 아키텍처가 ER 스케치 수준** | 스키마 마이그레이션 경로 없음(`IF NOT EXISTS` 만으로는 `ALTER` 불가), 캐시 신선도/보관 기간·동기화 충돌 모델 미정 | [DATA_ARCHITECTURE.md](product/architecture/DATA_ARCHITECTURE.md) |
| **아키텍처 진화 계획 없음** | 단일 사용자 로컬 → 다중 사용자 클라우드는 큰 구조 전환인데 "그때 가서" 로만 있음 | [ARCHITECTURE_EVOLUTION.md](product/architecture/ARCHITECTURE_EVOLUTION.md) |
| **의존성 규칙이 강제되지 않음** | `routes→services→db` 는 문장으로만 존재. 깨져도 아무도 안 막음 | [ARCHITECTURE_DRIVERS.md](product/architecture/ARCHITECTURE_DRIVERS.md) §4 (피트니스 함수) |
| **큰 결정의 ADR 부재** | ADR 1~14 는 대부분 전술적(SQLite 드라이버·상태 라이브러리). "로컬 우선을 아키텍처 스타일로 채택" 같은 근본 결정이 기록 안 됨 | ADR-0015~0019 |

---

## 2. 공부할 것 (우선순위 순)

> 이 목록의 상당수는 **강의 C**(정통 SW공학, 최은만/Sommerville)와 겹치고, §2.8·프로세스 항목은 **강의 B**(AI시대소프트웨어공학)와 겹친다. 3강의 매핑은 [COURSE_MAPPING.md](progress/COURSE_MAPPING.md).
>
> **강의 교재 (원서 목록과 별개, 시험 출제 근거):** 우분투 리눅스 (이종원, 한빛미디어) = 강의 A / 쉽게 배우는 소프트웨어 공학 (한빛미디어) = 강의 B / 새로 쓴 소프트웨어 공학 (최은만, 정익사) + 소프트웨어 공학 (Sommerville, 권기태 역) = 강의 C.

### 2.1 먼저 — 아키텍처를 "문서화하는 법"

- **C4 model** — <https://c4model.com> (Simon Brown). Context → Container → Component → Code 4단계.
  이 프로젝트에 바로 적용: 컨텍스트(사용자·Google·Notion·Claude), 컨테이너(Electron·Express·Python 에이전트·SQLite), 컴포넌트(routes/services/db, store/api/components).
- **arc42** — <https://arc42.org>. 12개 섹션 템플릿(맥락·제약·솔루션 전략·빌딩블록·런타임·배포·횡단개념·결정·품질·리스크).
  우리 `docs/product/` 를 arc42 섹션에 매핑하면 빈칸(런타임 뷰·배포 뷰·횡단개념)이 바로 드러난다.
- **Documenting Software Architectures: Views and Beyond** (Clements 외) — "뷰" 개념의 원전.

### 2.2 핵심 — 품질 속성 주도 설계

- **Software Architecture in Practice** (Bass·Clements·Kazman, 4판) — 품질 속성 시나리오(자극·환경·응답·응답 측정), ASR(아키텍처상 중요한 요구사항), 전술(tactics), ATAM 평가.
  → [ARCHITECTURE_DRIVERS.md](product/architecture/ARCHITECTURE_DRIVERS.md) 가 이 방식으로 작성됨. 읽고 비교해 볼 것.
- **Fundamentals of Software Architecture** (Richards·Ford) — 아키텍처 특성(-ility), 스타일 비교, **아키텍처 피트니스 함수**(구조 규칙을 테스트로 강제).

### 2.3 안정성·복원력

- **Release It!** (Michael Nygard) — 타임아웃·서킷 브레이커·벌크헤드·백프레셔. ADR 개념의 출처이기도 함.
  → [CROSSCUTTING.md](product/architecture/CROSSCUTTING.md) §4, [RUNTIME_VIEW.md](product/architecture/RUNTIME_VIEW.md) 의 연결 상태 머신에 반영.
- **The Twelve-Factor App** — <https://12factor.net>. 설정/로그/프로세스/백킹 서비스. 특히 III(설정), XI(로그), IX(폐기 가능성).

### 2.4 데이터·동기화

- **Designing Data-Intensive Applications** (Kleppmann) — 5장(복제), 7장(트랜잭션), 9장(일관성). Supabase 동기화 충돌 해결의 기반.
- **Local-first software** (Ink & Switch 에세이) — <https://www.inkandswitch.com/local-first/>. 오프라인 우선 + 동기화의 7가지 이상 조건, CRDT 소개.
- 스키마 마이그레이션: 어떤 ORM 이든 마이그레이션 툴의 개념(버전 테이블·up/down·순방향 전용) — 예: Flyway, Alembic, node-pg-migrate 문서의 "개념" 부분.

### 2.5 보안 아키텍처

- **Threat Modeling: Designing for Security** (Adam Shostack) — STRIDE, 신뢰 경계, 데이터 흐름 다이어그램(DFD).
  → [REQUIREMENTS_NONFUNCTIONAL.md](product/requirements/REQUIREMENTS_NONFUNCTIONAL.md) §3.1 의 경량 위협 모델을 DFD + 신뢰 경계로 승격.
- **OWASP ASVS** (레벨 1) 항목 훑기 — 무엇을 검증해야 하는지 체크리스트.
- **Electron Security** — <https://www.electronjs.org/docs/latest/tutorial/security>. 프로세스 모델(main/renderer/utility), IPC, `contextIsolation`.

### 2.6 API·관측성

- **RFC 9457 — Problem Details for HTTP APIs** — 표준 오류 응답 형식. → [ADR-0017](product/architecture/adr/ADR-0017-rest-error-contract.md).
- **structured logging / correlation id** 개념, **OpenTelemetry** 의 signal 3종(logs·metrics·traces) 개요.

### 2.7 도메인 경계

- **Domain-Driven Design Distilled** (Vaughn Vernon) — 바운디드 컨텍스트, 안티커럽션 레이어(ACL).
  → 외부 API(Google/Notion) 모델을 내부 스키마로 번역하는 계층이 곧 ACL. [DATA_ARCHITECTURE.md](product/architecture/DATA_ARCHITECTURE.md) §5.

### 2.8 대시보드 OS · 위젯 셸 (기능 방향)

각 데이터가 위젯으로 움직이고 위젯마다 디자인하는 방향. 개념·벤치마크·공부 목록은 **[DASHBOARD_OS.md](product/vision/DASHBOARD_OS.md) §7**, 요구사항은 [requirements/WIDGET.md](product/requirements/WIDGET.md).

- **react-grid-layout** README·예제 (드래그·리사이즈·레이아웃 직렬화의 표준), Grafana 패널 문서 → [ADR-0020](product/architecture/adr/ADR-0020-widget-shell-architecture.md)
- **윈도우 매니저 개념** — tiling WM(i3/sway) 설정 문서의 *개념* 파트 (z-order·포커스·레이아웃 직렬화)
- **MDN "Using CSS custom properties"** — 위젯별 스코프 테마 → [ADR-0022](product/architecture/adr/ADR-0022-per-widget-theming.md)
- **레지스트리/플러그인 패턴**, **UI state vs server state 분리** (zustand) → `useLayoutStore` ↔ 도메인 스토어

### 2.9 대시보드 UI/UX · 화면 룩 (참조 틀)

우리 화면의 **골격·컴포넌트 패턴·시각 톤**은 릴스 "Claude 워크스페이스 대시보드" 를 참조 틀로 삼는다
([reference/UI_STYLE.md](product/reference/UI_STYLE.md)). 그 틀을 스스로 판단·수정하려면 아래를 안다:

| 주제 | 자료 | 이 저장소 적용 |
|---|---|---|
| **대시보드 정보 설계** | *Information Dashboard Design* (Stephen Few) — 한 화면에 무엇을 넣고 뺄지, 지표 카드의 함정 | [UI_STYLE.md](product/reference/UI_STYLE.md) §2 레이아웃 골격, §5 "안 가져오는 것" |
| **데이터 밀도·시각화 윤리** | Edward Tufte, *The Visual Display of Quantitative Information* (개념: data-ink ratio, chartjunk) | 진행도 바·숫자 카드(P1)를 과하게 꾸미지 않기 |
| **탭 vs 단일 뷰 / 점진적 공개** | NN/g "Progressive Disclosure", "Tabs, Used Right" 아티클 | [UI_STYLE.md](product/reference/UI_STYLE.md) §7 US-2·US-3 (모니터·위젯 셸을 탭으로 뺄지) |
| **컴포넌트 패턴 + 접근성** | [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) — accordion(P3), dialog/모달 focus trap(P6), badge 의 스크린리더 텍스트 | [UI_STYLE.md](product/reference/UI_STYLE.md) §3 패턴 P1~P6 |
| **다크 테마 대비·색 시스템** | WCAG 2.2 대비비(1.4.3/1.4.11), "단일 강조색(single-accent) 디자인" 사례 | [UI_STYLE.md](product/reference/UI_STYLE.md) §6 — 앰버→보라 전환 시 우선순위 배지와 충돌 |
| **디자인 토큰 / 테마 계층** | "Design Tokens" (W3C CG 개요), 전역 토큰 → 컴포넌트 토큰 → 인스턴스 오버라이드 | [UI_SPEC.md](product/reference/UI_SPEC.md) §1, [ADR-0022](product/architecture/adr/ADR-0022-per-widget-theming.md) |
| **React 화면 구조** | React 공식 문서 — 합성(composition), `ErrorBoundary` per subtree, `Suspense`, 리스트 상태 관리 | [UI_SPEC.md](product/reference/UI_SPEC.md) §0 4상태, FR-WIDGET-07 격리 |
| **Electron 렌더러 보안** | <https://www.electronjs.org/docs/latest/tutorial/security> — `contextIsolation`, CSP, 1st-party 코드만 | [UI_STYLE.md](product/reference/UI_STYLE.md) §5 (외부 위젯 로딩 안 함), NFR-SEC-04 |

**먼저 읽을 저장소 파일 (순서):**
[reference/UI_STYLE.md](product/reference/UI_STYLE.md) → [reference/UI_SPEC.md](product/reference/UI_SPEC.md) §0~2 →
[requirements/UI.md](product/requirements/UI.md) · [requirements/WIDGET.md](product/requirements/WIDGET.md) →
[architecture/DESIGN.md](product/architecture/DESIGN.md) §6 → `frontend/src/components/` 실제 코드 →
[ADR-0020~0022](product/architecture/adr/) → [ai_결과값.md](../ai_결과값.md) (미결·리스크).

---

## 3. 학습 → 산출물 로드맵

| 주차 (강의 태그) | 공부 | 이 저장소에 반영 |
|---|---|---|
| 지금 | C4, arc42, 품질 시나리오 | 신규 문서 5종 리뷰·보완, ADR-0015~0019 채택 결정 |
| A-W4~5 / C-W3~4 (Phase C) | Release It! 안정성 패턴 | [CROSSCUTTING.md](product/architecture/CROSSCUTTING.md) 재시도·타임아웃을 `api/client.js`·에이전트에 실제 구현 |
| A-W5~6 (패키징 전) | Electron 프로세스 모델, 12-factor | [RUNTIME_VIEW.md](product/architecture/RUNTIME_VIEW.md) 미결 항목 확정 → [ADR-0016](product/architecture/adr/ADR-0016-desktop-process-topology.md) 채택 |
| A-W6~7 / B-W9 (Phase D) | 위협 모델링, OAuth 토큰 수명주기 | 보안 뷰를 DFD 로 승격, 토큰 저장/갱신/폐기 시퀀스 |
| A-W6 / C-W5~6 (Phase C5~C6) | react-grid-layout, WM 개념, CSS 변수 스코프 | [DASHBOARD_OS.md](product/vision/DASHBOARD_OS.md) DO-1~6 결정 → [ADR-0020~0022](product/architecture/adr/) 채택 → 위젯 셸 구현 |
| C-W6~7 / B-W4 (화면 착수 전) | 대시보드 정보 설계, ARIA 패턴, 다크 테마 대비, 디자인 토큰 계층 (§2.9) | [UI_STYLE.md](product/reference/UI_STYLE.md) 캡처 5장 채우기 → US-1(강조색) 결정 → [UI_SPEC.md](product/reference/UI_SPEC.md) §1 토큰 반영 |
| A-W10 전 (Phase E) | DDIA 복제·일관성, local-first | [ARCHITECTURE_EVOLUTION.md](product/architecture/ARCHITECTURE_EVOLUTION.md) 확정 → 동기화 충돌 ADR |

---

**작성:** 2026-09-03
