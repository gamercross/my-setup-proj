# 🗂️ 문서 세분화 계획 및 작성 프롬프트

> 목적: 지금까지 만든 문서([AS_IS](vision/AS_IS.md) · [FR](requirements/REQUIREMENTS_FUNCTIONAL.md) · [NFR](requirements/REQUIREMENTS_NONFUNCTIONAL.md) · [DESIGN](architecture/DESIGN.md))가
> **처음 보는 에이전트/사람이 바로 개발에 착수할 수 있을 만큼 자세한가**를 점검하고,
> 부족한 부분을 카테고리로 나눠 "무슨 내용이 필요한지"를 프롬프트 형태로 정리한다.

---

## 0. 진행 상황 (2026-09-02)

| 순서 | 항목 | 상태 |
|---|---|:---:|
| 1 | GLOSSARY, CONVENTIONS, ENV_REFERENCE | ✅ |
| 2 | schema.sql + DATA_DICTIONARY | ✅ |
| 3 | FR 보강 (requirements/TASK·UI·AGENT) | ✅ (P0) |
| — | GIT_WORKFLOW + verify.sh --code-only (계획 외 추가) | ✅ |
| 4 | API_REFERENCE | ✅ |
| 4 | UI_SPEC | ✅ |
| 5 | DESIGN 보강 + ADR 분리 (adr/0001~0012) | ✅ |
| — | Mermaid 다이어그램 도입 (DIAGRAMS.md, render-diagrams.sh) | ✅ |
| 6 | TRACEABILITY, TEST_PLAN | ✅ |
| 7 | ONBOARDING, planner.md·supervisor.md 갱신 | ✅ |

DOC_PLAN 1~7 완료. 이후 문서 작업은 각 Phase 착수 시 해당 도메인 requirements 상세화 +
제안 ADR 결정 + TEST_PLAN 케이스 추가로 이어간다.

**후속 보강 (시스템 분석 완성도):**
- ✅ CONSTRAINTS.md (제약·가정·규모/비용 추정)
- ✅ RISKS.md (리스크 레지스터 R-1~R-16)
- ✅ USE_SCENARIOS.md (이해관계자·사용 여정)
- ✅ REQUIREMENTS_NONFUNCTIONAL §3.1 경량 위협 모델
- ✅ 텍스트 다이어그램 → Mermaid 일괄 전환 (ARCHITECTURE, AS_IS §2.7, ROADMAP, COURSE_MAPPING)
- ✅ ORCHESTRATION.md (파이프라인 상태 그래프) + `/build-next` 커맨드
- ✅ 제안 ADR 0009~0012 채택, ADR-0013(에이전트 작업 큐) 신설
- ✅ Phase A2 완료 (환경 구축) — 코드 작업은 Phase A3 부터
- ✅ 3강의 구조 반영 — COURSE_MAPPING 을 강의 A·B·C 3개 층으로 재작성, 강의 태그(`A-W#`/`B-W#`/`C-W#`) 체계 도입 (렌즈 표 + ADR 목록 열 + Phase↔주차 대응)

> **아래 §1~§4 는 2026-09-02 초기 스냅샷이다.** 지적된 부족분은 위 목록으로 대부분 해소됨.
> 현재 상태는 [AS_IS.md](vision/AS_IS.md) · [TRACEABILITY.md](requirements/TRACEABILITY.md) 를 본다.

---

## 1. 종합 평가

**방향은 맞지만 "요약" 수준에서 멈춰 있다.** 현재 문서는 *무엇을* 만드는지는 알려주지만,
새 에이전트가 코드를 쓰려면 필요한 *구체적 계약*(수용 기준, API 요청/응답 예시, 화면 요소,
데이터 필드 규칙, 처리 흐름)이 비어 있다.

| 문서 | "이게 뭔지" 이해 | "이대로 만들 수 있음" | 부족한 것 |
|---|:---:|:---:|---|
| AS_IS.md | ✅ | 🚧 | 각 주장의 검증 명령, `파일:라인` 근거, 모듈 의존 그래프 |
| REQUIREMENTS_FUNCTIONAL.md | ✅ | ❌ | FR별 수용 기준(Given/When/Then), 엣지 케이스, 입력 규칙, 화면 연결 |
| REQUIREMENTS_NONFUNCTIONAL.md | ✅ | 🟡 | 현재 측정 baseline, 일부 목표치 근거 |
| DESIGN.md | ✅ | 🚧 | API 요청/응답 예시·에러코드표, 시퀀스 다이어그램, 컴포넌트 props/state 계약, 열린 질문 3개 미해결 |

---

## 2. 연결(traceability) 상태 점검

### 잘 연결된 것 ✅
- README "문서 지도" → 7개 product 문서 전부 링크
- DESIGN.md §8 단계표 → 각 단계가 커버하는 `FR-xx` / `NFR-xx` / `G` 명시
- FR/NFR → ID 체계(`FR-<도메인>-<번호>`, `NFR-<범주>-<번호>`) 일관

### 끊겼거나 부족한 것 ❌

| # | 문제 | 영향 | 해소 방법 |
|---|---|---|---|
| C1 | **역방향 링크 없음** — FR/NFR 문서에서 "이 요구사항은 DESIGN 어디서 구현되나"를 못 찾음 | 에이전트가 요구사항→설계를 매번 수동 추적 | `TRACEABILITY.md` 매트릭스 신설 |
| C2 | **넘버링 3중** — ROADMAP "Week", FR "목표 주차", DESIGN "Phase A~E" 가 서로 안 맞음 | 어느 게 기준인지 모름 | DESIGN §8에 Week↔Phase 대응표, ROADMAP에 Phase 태그 |
| C3 | **스키마 중복** — DB DDL 이 ARCHITECTURE.md 와 DESIGN.md 두 곳에 다르게 존재 | 드리프트(불일치) 발생 | `backend/db/schema.sql` 을 **단일 원천**으로, 문서는 링크만 |
| C4 | **에이전트가 새 문서를 안 읽음** — `planner.md` 는 `ARCHITECTURE.md`·`ROADMAP.md`·`PROGRESS.md` 만 읽으라고 지시 | planner 가 FR/NFR/DESIGN 을 무시 | `planner.md` 진행방식에 새 문서 추가 |
| C5 | **G1~G8 ↔ FR 매핑이 한쪽에만** — AS_IS 갭이 어느 FR로 해소되는지 FR 문서엔 없음 | 갭 추적 어려움 | TRACEABILITY 에 G→FR→Phase 열 |
| C6 | **용어 정의 없음** — brief, sync_log, task status, "핵심 기능 4종" 등이 문서마다 산발적 | 새 사람이 용어 오해 | `GLOSSARY.md` 신설 |

---

## 3. 신규 문서 카테고리 + 작성 프롬프트

각 항목은 `/feature` 또는 직접 작성 시 그대로 붙여 쓸 수 있는 프롬프트다.
공통 규칙: **한국어 · 표와 예시 중심 · 추측 금지(모르면 "확인 필요") · 관련 문서 상호 링크**.

### 3.1 `docs/product/reference/GLOSSARY.md` — 용어집

```
프로젝트 전반의 도메인 용어를 정의하는 GLOSSARY.md 를 만든다.
- 대상 독자: 이 프로젝트를 처음 보는 에이전트/사람
- 형식: | 용어 | 정의 | 관련 문서·코드 | 표
- 반드시 포함할 용어:
  * 도메인: 할일(task), 프로젝트(project), 브리핑(brief/Daily Brief),
    일정(calendar event), 미읽은 메일(unread email)
  * 상태값: task.status(todo/in_progress/done), task.priority(high/medium/low),
    project.status, sync_logs.status
  * 시스템: 에이전트 팀(planner/developer/supervisor/finisher), /feature 파이프라인,
    작업로그, EOD, Stop 훅, 인메모리 DB, 증분 동기화
  * 제품: "핵심 기능 4종"이 정확히 무엇인지 (VISION.md 기준으로 확정)
- 각 용어는 1~3문장. 코드에서 쓰이는 정확한 문자열(예: 'in_progress')을 명시.
```

### 3.2 `docs/product/reference/DATA_DICTIONARY.md` — 데이터 사전 (필드 단위)

```
schema.sql 의 모든 테이블·컬럼을 필드 단위로 설명하는 DATA_DICTIONARY.md 를 만든다.
- 테이블별로 섹션. 각 섹션에 표: | 컬럼 | 타입 | 제약(NULL/기본값/CHECK) | 의미 | 예시 값 | 비고 |
- 대상 테이블: tasks, projects, calendar_events, emails, briefs, sync_logs
- 컬럼마다:
  * 날짜/시간 컬럼의 포맷 규칙 (ISO8601, 타임존 처리)
  * 외부 id 컬럼(event_id, email_id, notion_id)의 출처와 유일성
  * 상태/우선순위 enum 의 허용값 전체
  * created_at/updated_at 을 누가 언제 채우는지
- schema.sql 이 단일 원천임을 명시하고, DDL 자체는 여기 복붙하지 말고 링크.
- Week 10+ Supabase 추가 컬럼(user_id, is_synced)은 "향후" 표시.
```

### 3.3 `docs/product/reference/API_REFERENCE.md` — API 상세 명세

```
백엔드 REST API 의 엔드포인트별 상세 레퍼런스 API_REFERENCE.md 를 만든다.
DESIGN.md §5 의 요약표를 대체하지 않고 확장한다.
- 공통: base URL, 인증(현재 없음), Content-Type, 공통 에러 응답 형태, 상태코드 정책
- 엔드포인트마다:
  * 메서드 + 경로 + 한 줄 설명 + 해당 FR ID
  * 경로/쿼리 파라미터 표 (이름/타입/필수/설명/예시)
  * 요청 본문 JSON 예시 (정상 1개 + 검증실패 유발 1개)
  * 응답 예시: 200/201 정상 JSON, 400/404/500 각각 JSON
  * 검증 규칙 (필드별): 필수, 타입, 범위(priority enum, progress 0~100 등)
  * 부작용 (DB 어느 테이블에 무엇이 쓰이는지)
- 대상: /health, /tasks(GET목록·GET단건·POST·PUT·DELETE), /projects(동일),
  /calendar/events, /mail/unread, /brief/today, /sync/logs
- curl 예시 1세트 포함.
```

### 3.4 `docs/product/reference/UI_SPEC.md` — 화면 명세

```
Electron 앱의 화면을 컴포넌트 단위로 명세하는 UI_SPEC.md 를 만든다.
- 화면 목록: 대시보드(단일 화면). 하위 영역: 헤더, 할일 패널, 프로젝트 패널,
  캘린더 위젯, 브리핑 카드, 에러 배너
- 영역마다:
  * 목적 + 관련 FR ID
  * 표시 요소 (필드, 버튼, 배지) 와 데이터 출처(어느 API)
  * 상태별 렌더: 로딩 / 비어있음 / 정상 / 에러 (4가지 모두)
  * 사용자 인터랙션 → 결과 (예: 체크박스 클릭 → PUT /tasks/:id → 목록 갱신)
  * 반응형/창 크기 최소값
- 컴포넌트 계약표: | 컴포넌트 | props | 내부 state | 방출 이벤트(onXxx) |
  대상: App, Dashboard, TaskList, TaskForm, ProjectCard, CalendarWidget,
       BriefCard, ErrorBanner
- ASCII 와이어프레임 1개(대시보드 전체 레이아웃).
- zustand store 계약: 각 store 의 상태 shape + 액션 시그니처.
```

### 3.5 `docs/product/testing/TEST_PLAN.md` — 테스트 계획

```
프로젝트 테스트 전략과 케이스 목록 TEST_PLAN.md 를 만든다.
- 레벨별 범위: 단위(agent 순수 로직), 통합(backend API + SQLite),
  수동(Electron 화면), E2E(향후)
- 도구: backend=supertest+node:test, agent=pytest, CI=GitHub Actions
- 테스트 케이스 표: | ID(TC-xx) | 대상 FR/NFR | 전제 | 입력 | 기대 결과 |
  * tasks CRUD 정상/검증실패/404 각각
  * db 모듈: 인메모리→SQLite 교체 후에도 동일 동작(회귀)
  * agent build_context: 이메일/일정 없을 때 "없음" 처리
  * agent claude 실패 시 앱 영향 없음(NFR-REL-02)
- 픽스처 정책: SQLite 는 테스트마다 임시 파일 또는 :memory:, 외부 API 는 모킹
- "테스트 없이 머지 불가" 기준(어떤 변경에 어떤 테스트가 필수인지)
- verify.sh 와의 관계.
```

### 3.6 `docs/setup/CONVENTIONS.md` — 코딩·구조·커밋 규칙

```
지금 planner.md / developer.md / AUTOMATION.md / PROGRESS.md 에 흩어져 있는 규칙을
한 곳에 모은 CONVENTIONS.md 를 만든다. (원본들은 이 문서를 링크로 참조하도록 축소)
- 코드: 한국어 주석, 최소 구현, try/catch 필수 범위, .env 하드코딩 금지,
  계층 분리(routes→services→db)
- 네이밍: 파일/함수/변수, DB 컬럼(snake_case), API 필드
- 폴더 책임표: | 경로 | 책임 | 여기 두면 안 되는 것 |
- Claude 사용: 모델 claude-sonnet-5, thinking adaptive + effort low, 상수 1곳 관리
- 커밋: 컨벤션(feat/fix/docs/...), 메시지 언어, main 직접 커밋 금지, --force 금지
- 브랜치 전략 (현재/목표)
- 에이전트 파이프라인 규칙(한 기능=/feature 1회)
```

### 3.7 `docs/setup/ENV_REFERENCE.md` — 환경 변수 레퍼런스

```
.env.example 의 모든 키를 설명하는 ENV_REFERENCE.md 를 만든다.
- 표: | 키 | 필수? | 용도 | 발급/획득 방법 | 예시(마스킹) | 사용하는 컴포넌트 |
- 대상: ANTHROPIC_API_KEY, GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI, NOTION_API_KEY,
  SUPABASE_URL/KEY/JWT_SECRET, DATABASE_URL, SLACK_WEBHOOK_URL, PORT, NODE_ENV
- 각 키가 없을 때 시스템 동작(예: SLACK_WEBHOOK_URL 없으면 조용히 스킵)
- 보안 규칙(NFR-SEC-01, 03): 어느 키가 프론트에 절대 안 가는지
- .env.example 과 이 문서의 동기화 책임 명시.
```

### 3.8 `docs/product/architecture/adr/ADR-0001-*.md …` — 결정 기록

```
DESIGN.md §2 의 AD-01~AD-08 을 각각 개별 ADR 파일로 분리한다.
- 파일명: adr/ADR-0001-frontend-react-vite.md 형식
- 템플릿: 제목 / 상태(제안·채택·폐기) / 맥락 / 결정 / 근거 / 고려한 대안 / 결과·트레이드오프 / 날짜
- DESIGN.md §2 는 ADR 목록 표(번호·제목·상태·링크)로 축소
- 앞으로 설계 결정은 ADR 추가로만.
```

### 3.9 `docs/product/requirements/TRACEABILITY.md` — 추적 매트릭스

```
요구사항–설계–테스트–코드 연결을 한 표로 보여주는 TRACEABILITY.md 를 만든다.
- 표: | FR/NFR ID | 관련 갭(G) | DESIGN 섹션/ADR | 구현 Phase·단계 | 테스트 ID | 코드 위치 | 상태 |
- 모든 FR-xx, 주요 NFR-xx 를 행으로
- AS_IS 의 G1~G8 이 각각 어느 FR로 닫히는지 포함
- ROADMAP Week ↔ DESIGN Phase 대응표도 여기 또는 DESIGN §8
- 이 문서는 기능 완료 시 finisher 가 상태 열을 갱신.
```

### 3.10 `docs/ONBOARDING.md` — 새 에이전트/사람 시작 가이드

```
처음 합류하는 에이전트/사람이 15분 안에 맥락을 잡도록 ONBOARDING.md 를 만든다.
- "이 프로젝트가 뭔가" 3문장
- 읽는 순서: VISION → AS_IS → ROADMAP → FR/NFR → DESIGN → CONVENTIONS
  (각 링크 + "여기서 얻을 것" 한 줄)
- 지금 어디까지 됐나 (PROGRESS.md·AS_IS §2 요약, 자동 갱신 아님 주의)
- 작업하는 법: /feature 파이프라인 흐름도, 각 에이전트 역할 1줄
- 절대 규칙 요약 (커밋/보안/모델/범위)
- 자주 쓰는 명령: setup.sh, verify.sh, 백엔드/프론트 실행법
- "막히면": 확인 필요 표시하고 멈추기
```

---

## 4. 기존 문서 보강 프롬프트

### 4.1 AS_IS.md 보강

```
AS_IS.md 를 새 에이전트가 스스로 검증할 수 있게 보강한다.
- §2 각 구성요소 표에 "근거(파일:라인)" 열 추가
- §3 환경 상태에 "확인 명령" 열 (예: python3 존재 → `python3 --version`)
- "확인 필요" 항목(python3 설치 여부 등)을 실제로 확인해 채우거나, 확인 방법 명시
- §2 끝에 모듈 의존 그래프(누가 누구를 import/호출하는지) 추가
- 날짜와 커밋 해시 병기(어느 시점의 스냅샷인지)
```

### 4.2 REQUIREMENTS_FUNCTIONAL.md 보강 (가장 시급)

```
각 FR 을 한 줄에서 "구현 가능한 명세"로 확장한다. 도메인이 커지면 requirements/ 폴더로 분리.
- FR 마다 다음을 추가:
  * 사용자 스토리: "<역할>로서 나는 <행동>을 원한다, <이유> 때문에"
  * 수용 기준: Given/When/Then 최소 1~3개 (정상 + 엣지)
  * 입력/검증 규칙 (필드 단위)
  * 오류 시나리오와 기대 동작
  * 관련 화면(UI_SPEC) · API(API_REFERENCE) 링크
- P0 FR(TASK-01~05, UI-01/02, AGENT-01/02/05/06)부터 우선.
- P1/P2 는 한 줄 유지하고 "상세화 예정" 표시.
```

### 4.3 DESIGN.md 보강

```
DESIGN.md 를 구현 착수 가능한 수준으로 보강한다.
- §5 API: 요약표는 API_REFERENCE.md 로 이관, 여기엔 링크 + 설계 원칙만
- 주요 흐름 2개에 시퀀스 다이어그램(텍스트/mermaid): (1) 할일 생성 (2) Daily Brief 생성
- §6 프론트: 각 컴포넌트 props/state 계약을 UI_SPEC 로 이관, 여기엔 폴더 구조와 데이터 흐름만
- §4 스키마: backend/db/schema.sql 로 이관, 여기엔 링크 + ERD(관계) + 설계 의도
- §9 열린 질문 3개를 결정으로 전환(ADR 추가) 또는 "결정 필요 - 담당/기한" 명시
- Week ↔ Phase 대응표 추가
```

### 4.4 planner.md / supervisor.md 갱신

```
.claude/agents/planner.md 의 "진행 방식 1" 에 읽을 문서를 추가한다:
README, docs/product/{VISION, AS_IS, ARCHITECTURE, ROADMAP,
REQUIREMENTS_FUNCTIONAL, REQUIREMENTS_NONFUNCTIONAL, DESIGN}, docs/setup/CONVENTIONS,
그리고 작업과 관련된 TRACEABILITY 행.
supervisor.md 점검 항목에 "요구사항 수용 기준 충족 여부"와 "TRACEABILITY 상태 갱신 여부"를 추가.
```

---

## 5. 권장 실행 순서

| 순서 | 문서 | 이유 |
|---|---|---|
| 1 | GLOSSARY, CONVENTIONS, ENV_REFERENCE | 다른 문서가 참조할 기반. 빠르게 작성 가능 |
| 2 | schema.sql(코드) + DATA_DICTIONARY | 스키마 단일 원천 확정 (C3 해소) |
| 3 | FR 보강 (수용 기준) | 개발 착수 전 필수 |
| 4 | API_REFERENCE, UI_SPEC | FR 기반 상세 계약 |
| 5 | DESIGN 보강 + ADR 분리 | 위 내용 반영해 정리 |
| 6 | TRACEABILITY, TEST_PLAN | 연결·검증 체계 |
| 7 | ONBOARDING, planner.md 갱신 | 마지막에 전체 진입점 정리 |

각 단계는 문서 작업이므로 `/feature` 가 아니라 직접 작성 + 사용자 리뷰로 진행하는 편이 빠르다.

---

**작성:** 2026-09-02
