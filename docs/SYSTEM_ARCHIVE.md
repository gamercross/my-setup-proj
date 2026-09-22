# my-setup-proj — 시스템 아카이브

> 작성일 2026-09-22 (ADR-0016 2~4항·ADR-0017 채택·구현·병합 완료 시점 기준). 이 문서의
> 목적은 **다음 세션(다른 대화, 다른 Claude 인스턴스, 또는
> 시간이 지난 뒤의 사용자 본인)이 이 한 문서만 읽고** 이 시스템이 뭘 하는지, 왜 이렇게
> 만들어졌는지, 무엇이 이미 되어 있는지, 무엇이 남았는지 전체 그림을 빠르게 복원하도록
> 하는 것이다. 저장소의 정본 문서(README·PERSONAL_OS·REVERSE_PLAN·ADR 등)를 대체하지
> 않는다 — 그것들의 종합 요약 + 안내판이다. 세부가 어긋나면 원천 문서가 맞다.

---

## 1. 이게 뭔가 — 한 문단 요약

`my-setup-proj`는 1인 개발자(사용자)가 만든 **로컬 우선 개인 생산성 OS**다. Electron +
React 데스크톱 앱, Node.js/Express 로컬 API, Python Claude 에이전트, SQLite 로 구성되며,
할일·프로젝트·캘린더·OKR·기대정렬 체크인·에이전트 활동·문서 탐색을 위젯 셸 하나에
모은다. 우송대학교 2026-2학기 3개 강의(AI 컴퓨터 운영체제 실습 / AI시대소프트웨어공학 /
AITool기반소프트웨어공학)의 공통 실습 환경이자 제출 산출물이며, 동시에 실사용을 목표로
한다. 이 프로젝트의 진짜 목적은 겉보기의 "할일 관리"가 아니다 — REVERSE_PLAN §1-0의
재정의를 그대로 인용하면:

> **"우리의 목적은 진척도를 보는 것이 아닌, 자신의 프로젝트나 경험들이 모인 지식을
> 시각화하고 도식화해서 지식 가치를 올리는 것. 지식들이 모여서 자신의 역량을 증진시키고
> 그 방향을 빠르게 한눈에 보이게 하는 것."** — 사용자 진술, 2026-09-14

---

## 2. 왜 만들었나 (목적 서사)

시작은 "내가 뭐가 진척되는지 감이 안 온다"(2026-09-09 최초 인터뷰)는 표면적 불편이었다.
하지만 2026-09-14 사용자 스스로 이 문장을 더 근본적인 결핍으로 재정의했다: 문제는
**진척률이 안 보이는 것이 아니라, 경험이 지식으로 축적되지 않고 흩어지는 것**이었다.
고교 시절 PC방 알바·영상 편집·3년 방송부 등 실제 경험은 쌓였지만, 그걸 기록·정리하는
체계가 없었고 Notion으로 시도해도 페이지가 늘면 구조가 무너졌다.

이 재정의 이후 프로젝트의 메타 문장이 바뀌었다: **"이 저장소의 `PROGRESS.md`가
프로젝트에 해주는 일 — 흩어진 작업을 하나의 지식 서사로 엮는 일 — 을, 앱이 사용자
자신의 경험에도 해준다."** 즉 할일·프로젝트·OKR·에이전트 활동·문서 열람은 전부
"무엇을 겪었고 그로부터 무엇을 알게 됐는지"가 쌓여 보이게 하는 그릇이며, 그 축적이
역량으로 이어지는 방향을 한눈에 보여주는 것이 목적이다.

이 재정의 관점에서 Notion·Sunsama·Akiflow·Linear 같은 기존 도구와의 차별점은
"기능이 더 많다"가 아니라 **"다른 대상을 관리한다"**는 것이다 — 기존 도구는 *일*을
관리하고, 이 프로젝트는 *일에서 나온 지식*을 관리한다(REVERSE_PLAN §2-5).

세 부류의 독자(REVERSE_PLAN §1-2)가 이 하나의 산출물을 동시에 본다: ① 실사용자(자기
자신), ② 강의 평가자(3개 강의), ③ 향후 열람자(포트폴리오). 셋 모두 같은 답으로
풀린다 — "경험이 어떻게 지식이 되고, 그 지식이 어느 방향으로 역량을 키우는지 정직하게
보여라."

---

## 3. 무엇을 하는 시스템인가 — 기능 전체 지도

앱은 "대시보드 OS"다. 아래 기능들이 각각 **위젯**으로 위젯 셸(사이드바 + 그리드)에
올라가고, 사용자가 위치·크기·표시 옵션을 조정한다. P0~P12는 PERSONAL_OS.md의 빌드
단계 번호(전부 완료 ✅).

| 위젯/기능 | 한 줄 | 단계 |
|---|---|---|
| **할 일** | 리스트↔칸반 토글, 자유 태그(다중) + 에이전트 자동 태깅(사용자 태그 비침범) | B3·P5·P6 |
| **프로젝트** | 진행 바 + 기대정렬 체크인(시작 근거) → 내장 OKR(진행) → GitHub 최근 커밋(작업물 위치) | C2 |
| **일정** | 오늘·내일 일정, Google Calendar를 에이전트가 로컬 캐시에 동기화 | C3, D2-b |
| **기대정렬 체크인** | 뭘·왜·언제까지·목표·전략·구체적으로·상태 — 7질문 자기 점검 기록 | P10 |
| **지식 지도** | 체크인 빈도·OKR 평균 달성률·태그 분포를 한 화면에 — "지금까지 뭘 배웠나"를 추세로 | P11 |
| **레퍼런스 자료 요약** | 참고 자료별 요약 절차(추가·삭제 이력)를 상태 필터와 함께 추적 | P12 |
| **주간 플래너** | 지난주·이번주·다음주 버킷, 순수 SQL 집계(due_date ISO 주 3버킷) | P8 |
| **OKR** | 목표·핵심결과, 구글식 등급(committed/aspirational), 월별 라인차트 | P8, ADR-0034 |
| **에이전트 활동** | sync·분류·브리핑 실행 로그 + "지금 실행" 즉시 트리거(파일 플래그) | P7 |
| **진행 현황 · 파일 탐색** | 저장소를 열지 않고 앱 안에서 `docs/`·ADR·결정 과정을 그대로 읽음 | P9 |
| **다이어그램 뷰어** | `docs/**/*.md`의 mermaid 구조도를 읽기 전용으로 렌더 | C4 |
| **Daily Brief** | 매일 아침 Claude가 메일·일정·할일을 요약, Notion에도 저장 | D3 |
| **위젯 셸** | 배치·이동·리사이즈, 위젯별 테마·표시 옵션, 사이드바 + 주제별 레이아웃 | C5·C6·P4.5 |

데이터 흐름 한 줄: React 대시보드 ↔ Express REST(`:3000/api`) ↔ 로컬 SQLite. 외부
API(Gmail·Calendar·Notion·Claude)는 Python 에이전트가 전담해 SQLite 캐시에 쓴다.

**웹 데모** — `VITE_DEMO=1`로 빌드하면 인메모리 목 어댑터로 백엔드 없이 브라우저에서
바로 볼 수 있다(GitHub Pages 자동 배포). 실제 산출물은 어디까지나 **Electron 앱**이고,
데모는 미리보기일 뿐이라는 구분이 강조된다("웹 데모 ≠ 앱", NEXT_SESSION §4-3).

---

## 4. 아키텍처 한눈에

### 4-1. 구성요소

```
Electron + React 셸 (frontend/)         ← 사용자
   │ HTTP REST :3000/api
   ▼
Node.js + Express (backend/)  routes → services → db
   │ better-sqlite3
   ▼
로컬 SQLite (WAL) ← 진실의 원천                Supabase(연결 배선만, Week 10+ 보류)
   ▲
   │ 직접 접근(WAL), 캐시 테이블만 write
Python 에이전트 (agent/)  sync.py → daily_brief.py/classify.py
   │ OAuth/HTTPS 읽기전용             │ HTTPS
   ▼                                  ▼
Gmail · Google Calendar            Notion REST · Claude API
```

launchd(mac)/cron(Linux)가 매일 07:30 `sync.py`(수집) → `daily_brief.py`(생성, 캐시만
읽고 네트워크 미접촉) 순서로 실행한다. "지금 실행"은 백엔드가 `agent/.triggers/run-now`
파일을 쓰고 launchd WatchPaths가 감지해 트리거하는 방식(subprocess 직접 spawn 없음).

### 4-2. 핵심 아키텍처 원칙 (ASR급)

1. **로컬 우선(local-first)** — 로컬 SQLite가 사용자 데이터의 진실의 원천. 클라우드·외부
   API는 그 위에 얹는 캐시/백업(ADR-0015, 제안이지만 사실상 전 시스템이 이 원칙을 따름).
2. **프로세스 분리** — Electron(UI)·Express(로컬 API)·Python(에이전트)은 독립 프로세스.
   SQLite 파일과 HTTP로만 결합. 백엔드·에이전트는 Electron의 자식 프로세스가 **아니다**
   (RUNTIME_VIEW §1).
3. **외부 API는 에이전트가 유일하게 소유** — 백엔드는 Gmail/Calendar/Notion/Claude를
   직접 호출하지 않는다(ADR-0006). UI·API는 캐시만 읽어 외부 장애로부터 격리된다.
4. **단방향 캐시 동기화** — 외부 → 로컬 캐시 테이블 방향으로만 흐른다. 에이전트가 유일한
   유입 지점(ADR-0015).
5. **쓰기 주체 분리 + WAL** — 에이전트=캐시 테이블(emails/calendar_events/briefs/
   sync_logs) 쓰기, 백엔드=tasks/projects 쓰기. 에이전트는 tasks를 읽기 전용으로만 본다.
   유일한 명시적 예외: `task_tags`에 대한 에이전트 배치 쓰기(source='agent', ADR-0011·
   ADR-0029). 사용자 태그(source='user')는 DB 트리거로 침범 방지가 이중화되어 있다.
6. **렌더러 보안 경계** — `contextIsolation`, 렌더러에 시크릿·Node 노출 없음. 위젯
   커스터마이즈도 외부 코드 실행 없이 화이트리스트 CSS 변수만 허용(ADR-0022).
7. **오프라인 우선** — 네트워크 없어도 할일·프로젝트는 완전한 CRUD, 캘린더·메일·브리핑은
   마지막 동기화 결과를 조회만 가능.

### 4-3. 레이어

- **프론트**: `widgets/views/*WidgetView.jsx` → 도메인 zustand 스토어(`useTaskStore`·
  `useProjectStore`·`useCalendarStore`·`useOkrStore`·`useAgentStore`·`useCheckinStore`·
  `useKnowledgeStore`·`useReferenceStore`) + UI 스토어(`useLayoutStore`·`useUiStore`) →
  `api/client.js`. 셸 계층: `AppShell → Sidebar/TopicView → WidgetShell → WidgetHost
  (react-grid-layout) → WidgetFrame → 뷰`.
- **백엔드**: `server.js → routes/api.js → routes/* → services/* → db.js →
  db/index.js(커넥션 싱글턴) → schema.sql`.
- **에이전트**: `trigger.py → sync.py → services/{gmail,calendar}.py → agent/db.py`,
  `daily_brief.py → classify.py → services/{claude,notion}.py`.

---

## 5. 핵심 아키텍처 결정 (ADR 하이라이트)

전체 ADR은 **37건**(채택 다수, 제안/보류 소수) — 전체 목록·상태 요약은
[`docs/product/architecture/adr/README.md`](product/architecture/adr/README.md)를
참고. 아래는 시스템을 규정하는 핵심 결정만 추린 것이다.

| ADR | 결정 | 무엇을 왜 |
|---|---|---|
| 0006 | 외부 API는 에이전트가 전담 | 백엔드가 Gmail/Calendar/Notion/Claude를 직접 안 부른다 — 외부 장애를 UI/API에서 격리 |
| 0011 | 에이전트–백엔드 SQLite 동시 접근: WAL + 쓰기 주체 분리 | 두 프로세스가 같은 파일을 씀. API 경유 쓰기는 "앱 꺼져도 브리핑 생성"(ADR-0007)과 충돌해 기각, 직접 접근+WAL 채택 |
| 0015 | 아키텍처 스타일 = 로컬 우선 + 프로세스 분리 + 단방향 캐시 동기화 (제안) | 시스템 전체를 규정하는 스타일 선언. 분산 시스템 복잡도를 개인용 규모에서 회피 |
| 0016 | 데스크톱 프로세스 토폴로지 — 백엔드 실행 주체 | 1항(dev 통합 실행 `scripts/dev.sh`, 2026-09-09) + 2~4항(패키징 시 `child_process.fork`·헬스체크 10초 타임아웃·재기동 백오프 1s/2s/4s(최대 3회)·포트 폴백 3000~3010) 전부 **채택·구현·병합 완료**(2026-09-16, PR #83). 리뷰 중 동시성 버그(중복 기동, 자식 프로세스 방치, 종료 경합) 4라운드에 걸쳐 해소 |
| 0017 | REST 오류 응답 계약 (RFC 9457 problem+json) | `{type,title,status,detail,errors,request_id}` 6종 type. 클라이언트가 문자열 매칭 대신 type으로 분기. **채택·구현·병합 완료**(2026-09-16, PR #84) — REVERSE_PLAN §4-5 D2 해소 |
| 0020~0022 | 위젯 셸 아키텍처 + 레이아웃 영속화 + 위젯별 테마 | react-grid-layout 기반 그리드, `widgets/registry.js`에 항목 추가로 새 위젯 등록(플러그인 유사), localStorage 영속, 스코프 CSS 변수로 테마(외부 코드 실행 없음) |
| 0024 | OAuth 토큰은 Fernet 암호화 JSON 파일 | 평문 저장 금지(NFR-SEC-05), `TOKEN_ENCRYPTION_KEY` |
| 0025 | 브리핑 빈 결과는 404 아닌 200 + `{brief:null}` | 빈 브리핑은 오류가 아니라 "아침 스케줄 전"의 일상 상태 — 불필요한 에러 배너 방지 |
| 0026 | 웹 데모 모드 — `VITE_DEMO` 목 어댑터 + GitHub Pages | 풀스택 호스팅은 과함. `client.js` 한 곳만 분기해 브라우저에서 실제 클릭 가능한 프로토타입 제공 |
| 0028 | 단일 클라이언트 캐시(`byId`) | 뷰는 파생만, 완료·수정은 스토어를 한 번만 거침. 칸반은 별 위젯 아닌 tasks 위젯 내 토글 |
| 0029 | 할 일 자동 분류 — 자유 태그(다중) + 에이전트 배치 | `task_tags(source∈{user,agent})`. 가장 오래 고민한 결정 — "에이전트가 내 태그를 침범하면 어쩌지"라는 불안에서 `source` 구분 + DB 트리거 이중화로 귀결(§2-3 서사) |
| 0030 | OKR 데이터 모델 — 1급 엔티티 3테이블 | `objectives`/`key_results`/`kr_snapshots`, `projects`와 느슨 FK. 주간 요약은 Claude 아닌 순수 SQL 집계 |
| 0031 | 안전 마크다운 렌더 + 파일 트리 API | 서버가 의존성 0 토크나이저로 파싱 → JSON 토큰 배열. 클라이언트는 마크다운 파서도 `dangerouslySetInnerHTML`도 안 씀 — Electron RCE 표면 최소화. 허용 루트는 `docs/`+루트 `*.md`만, 소스 파일 제외 |
| 0032 | 사이드바 셸 + 주제별 위젯 레이아웃 | `activeTopic` state(라우터 없음), 레이아웃 v1→v2 마이그레이션 |

**아직 제안/보류 상태**: 0013(전체 에이전트 작업 큐, "지금 실행" 트리거만 채택),
0019(아키텍처 피트니스 함수), 0033(독립 위젯 창 — 방향만 유지).

---

## 6. 코드 구조

```
my-setup-proj/
├─ frontend/src/
│  ├─ main.js, preload.js, main/(backendSupervisor·portFinder·healthCheck·backoff·backendLog)
│  ├─ App.jsx → AppShell → Sidebar/TopicView → WidgetShell → WidgetHost → WidgetFrame
│  ├─ store/        도메인 zustand 스토어(server 상태) + useLayoutStore/useUiStore(UI 상태)
│  ├─ widgets/       registry.js(위젯 등록) · defaultLayout.js · layoutStorage.js ·
│  │                 themeVars.js/themePresets.js · views/*WidgetView.jsx
│  ├─ components/   WidgetShell/Host/Frame/Picker/Settings, TaskList/Form, ProjectCard,
│  │                 CalendarWidget, BriefCard, DiagramPanel, DocView/FileTree/MermaidBlock,
│  │                 StatTile/DotProgress/Chip(공통), ErrorBanner/ErrorBoundary
│  └─ api/          client.js(실 fetch) · demoClient.js/demoData.js(웹 데모 목 어댑터)
├─ backend/
│  ├─ db/            schema.sql(단일 원천 DDL) · index.js(커넥션 싱글턴 + 마이그레이션 러너)
│  ├─ src/
│  │  ├─ app.js       requestLogger → cors → json → routes → 404 → errorHandler
│  │  ├─ routes/      tasks·projects·calendar·mail·brief·sync·diagrams·docs·tree·okr·planner·
│  │  │               agent·checkins·references
│  │  ├─ services/    routes가 직접 db.js를 안 쓰도록 비즈니스 로직 계층 (계층 원칙: routes→services→db)
│  │  ├─ middleware/  requestId 등 횡단 관심사
│  │  ├─ errors.js, problem.js  오류 판정 + RFC 9457 포맷터(ADR-0017)
│  │  └─ lifecycle.js  안전 종료(uncaughtException/SIGTERM 시 WAL 체크포인트 후 exit)
│  └─ test/          supertest 스모크
├─ agent/
│  ├─ sync.py          수집 엔트리 (launchd/cron, brief보다 먼저)
│  ├─ daily_brief.py   생성 엔트리 (캐시만 읽음, 네트워크 미접촉)
│  ├─ classify.py      태그 자동분류 배치 (daily_brief 배선)
│  ├─ trigger.py        "지금 실행" 파일 플래그 소비
│  ├─ db.py             백엔드와 같은 SQLite, tasks 읽기 전용 + 캐시 테이블 write
│  ├─ services/         gmail.py·calendar.py·notion.py·claude.py·sanitize.py
│  ├─ auth/             google_oauth.py (토큰 획득·갱신·Fernet 암호화 저장)
│  └─ tests/            pytest
├─ scripts/            dev.sh(통합 실행) · worklog·slack-notify·다이어그램·launchd 설치 스크립트
├─ docs/               ONBOARDING + product(vision/requirements/architecture/reference/testing) /
│                       setup / progress
└─ .claude/            에이전트 팀 정의(planner/developer/supervisor/finisher) + /feature 파이프라인
```

계층 원칙(DESIGN.md §1): `routes → services → db` 고정, DB 인터페이스(`getX/addX/updateX/
deleteX`) 불변, 오프라인 우선, 최소 구현, "한 기능 = `/feature` 1회".

---

## 7. 지금까지 만든 것 — 진행 이력 요약

큰 단계로 묶으면(상세 타임라인은 `docs/progress/PROGRESS.md`, 서사는
`docs/REVERSE_PLAN.md` §6-1):

1. **Phase A (환경·자동화 인프라)** — setup.sh/verify.sh, CI(GitHub Actions), backend
   supertest·agent pytest 스모크, `/feature` 파이프라인 자체(4역할 에이전트 팀) 구축.
2. **Phase B (Vite+React 마운트 → SQLite → 할일 CRUD)** — B1 Vite/React 마운트, B2
   better-sqlite3로 db.js 교체, B3 할일 CRUD E2E 배선.
3. **Phase C (강의 동기화: 미들웨어·프로젝트·캘린더·다이어그램·위젯 셸·테마)** — C1
   CORS/로깅, C2 프로젝트 추적, C3 캘린더, C4 다이어그램 뷰어(mermaid), **C5 위젯 셸
   전환**(고정 패널 `Dashboard.jsx` → `react-grid-layout` 기반 위젯 셸, 강의 A "AI 컴퓨터
   운영체제 실습"의 미니 윈도우 매니저 실습과 겹치는 지점이라 크게 투자), C6 위젯별
   테마·표시 옵션.
4. **Phase D (에이전트)** — D2-b Google OAuth + Gmail/Calendar 실 수집, D3 Daily Brief
   생성 + Notion 저장 + 스케줄러.
5. **웹 데모 배포** (ADR-0026) — GitHub Pages에 `VITE_DEMO` 목 어댑터 빌드 자동 배포.
6. **개인 생산성 OS 방향 (P0~P12, 전부 완료 ✅)** — Phase D 완료 직후 사용자가 제시한
   확장 방향. P0 문서 → P1 ADR 초안 → P2 디자인 캔버스 → P3 라이트 테마 → P4 공통
   컴포넌트(StatTile/DotProgress/Chip) → P4.5 사이드바 셸 → P5 단일 캐시+칸반 → P6 자동
   분류(자유 태그) → P7 에이전트 활동 위젯 → P8 OKR+주간 플래너(+ADR-0034 구글식 등급) →
   P9 진행 현황·파일 탐색 뷰 → P10 기대정렬 체크인(ADR-0035) → P11 지식 축적 추세·역량
   지도(ADR-0036) → P12 레퍼런스 자료 요약 절차 추적(ADR-0037, §5-3 정합성 감사의 마지막
   공백을 닫음).
7. **보안 보완 일괄 해소 (2026-09-15~16)** — 백엔드 루프백 바인딩(S1)·CORS `Origin:null`
   패키징 환경 분기(S2)·task_tags 비침범 DB 트리거(S3)·OAuth 키 회전 런북(S4)·pre-commit
   시크릿 스캔(S5) 전부 해소.
8. **문서·서사 정리** — REVERSE_PLAN.md에 고객/니즈(§1-2)·니즈→기능 매핑(§2-5)·정합성
   감사(§5-3)·성과 수치(§6-4) 추가, 공개 쇼케이스 저장소(`my-setup-proj-story`) 분리.
9. **앱 통합 완료 + 기술부채 D2 해소 (2026-09-16)** — ADR-0016 2~4항(패키징 시 백엔드
   fork·헬스체크·재기동·포트 폴백) 구현·병합(PR #83, 리뷰 4라운드로 동시성 버그 전부
   해소). ADR-0017(REST 오류 계약 RFC 9457) 구현·병합(PR #84, 15개 라우트 파일 전환).
   이로써 PERSONAL_OS §4-3 "앱 통합"과 §4-5 기술부채 D2가 마무리됨 — 남은 건 D1·D3·D4.

**목적 재정의(2026-09-14)를 기점**으로, "진척 가시성"이라는 표면 문제에서 "경험의
지식화·역량 방향 가시화"라는 근본 목적으로 프로젝트 서사가 바뀌었고, 이후 기능은 §5-3
정합성 감사 기준으로 검토된다.

**수치 (2026-09-16 기준, 이 세션에서 재확인)**: 채택 ADR 37건 전부 DESIGN.md에 등재,
자동 테스트 backend 190건·frontend 151건·agent 82건, `verify.sh` 54/0/0, 실제 위젯 10종,
인프라 비용 0원.

---

## 8. 알려진 약점 · 남은 일

REVERSE_PLAN §4-5(구조가 아직 감당 못 하는 지점) 기준. 보안 항목(S1~S5)은 전부 해소됨,
D2(REST 오류 계약)도 이번 세션(2026-09-16)에 해소됨 — 남은 것은 **D1·D3·D4**뿐이다.
공통 원인은 "로컬 단일 사용자·1인 개발·마감" 아래 "지금은 안 해도 되는 것"으로 미룬 것들.

| ID | 약점 | 설계 보완(예정) |
|---|---|---|
| D1 | 데모↔실서버 패리티가 "경로 존재"까지만 자동화됨 (응답 스키마·상태코드 드리프트는 CI가 못 잡음) | `check-demo-parity.mjs`에 대표 엔드포인트 응답 형태 스냅샷 비교 2단계 추가 |
| D3 | 레이어·경계 규칙("렌더러는 REST로만" "에이전트는 tasks 읽기 전용" 등)에 자동 검사가 없음, 코드 리뷰로만 갈음 | ADR-0019(피트니스 함수, 제안) 채택 — import 방향·금지 의존성 CI 검사 |
| D4 | 수동 검증 백로그(TC-P3~P12-M, TC-DEV-M*, TC-TOPO-M*)가 실행 안 됨 — 자동 테스트는 통과하나 실제 Electron 앱에서 눈으로 확인한 기록 없음 | `scripts/dev.sh` 위에서 일괄 소화 |

**다음 세션 우선순위 (2026-09-16 세션 종료 시점 기준)**:
- **정합성 감사(B-1)**: 공백 0 — 확인된 새 기능마다 "§1-0 목적 중 어디에 답하는가"만
  체크하면 됨.
- **다음 우선순위**: D1(데모 응답 스키마 드리프트 검사) 또는 D3(ADR-0019 피트니스
  함수 채택) 중 택1 진행 여지, 로컬 수동 검증 백로그(TC-P3~P12-M, TC-DEV-M*, TC-TOPO-M*)
  는 이 환경(샌드박스)에서 실행 불가 — 실제 로컬 GUI에서 사용자가 직접 확인 필요.
- **미결 ADR**: 0013(전체 작업 큐), 0015, 0019, 0033(독립 위젯 창, 보류) + PO-10(개인
  OS 방향과 Phase E 다중 사용자의 순서 — 미결).

**리스크 레지스터(RISKS.md, 높음 등급)**: R-1(1인 개발+시험 기간 겹침), R-5(Google
OAuth 앱 검토 지연 — "테스트 사용자" 모드로 우회 중).

---

## 9. 개발 방식 — 어떻게 일하는가

1인 개발자가 **Claude Code 에이전트 파이프라인**으로 속도를 보완한다
(`docs/setup/ORCHESTRATION.md`). 핵심은 `/feature` 슬래시 커맨드 하나 = 기능 하나:

```
planner(계획, 코드 불수정) → developer(구현) → supervisor(리뷰+테스트, PASS/CHANGES_NEEDED)
   → [CHANGES_NEEDED면 developer가 수정, 최대 2회 루프] → finisher(verify.sh·커밋·푸시)
```

- **커밋은 finisher만** 한다. developer는 절대 커밋하지 않는다.
- CHANGES_NEEDED가 2회 반복돼도 안 풀리면 `STOP_REVIEW`로 멈추고 사용자에게 보고 —
  임의로 계속 진행하지 않는다.
- `/build-next`는 이 `/feature` 파이프라인을 로드맵(DESIGN.md §8, TRACEABILITY.md)을
  따라 자동 반복하는 상위 루프. 사람 결정이 필요한 지점(미확정 ADR, `.env` 키 누락 등)
  에서만 멈춘다(`STOP_DECISION`).
- **문서 주도 개발**: 계획에 없는 범위는 건드리지 않는다(과설계·미리 만들기 금지). ADR이
  제안 상태면 착수 전 사용자가 결정해야 한다.
- 모든 기능은 **Electron 앱 + 웹 데모 양쪽**에서 동작해야 한다 — 새 API 엔드포인트를
  추가하면 `demoClient.js`/`demoData.js` 목 어댑터도 함께 갱신하는 게 규율.
- 브랜치 모델: `feature/* → PR → main`(ADR-0023, Git Flow 미채택). **PR 병합은 사용자가
  한다.**

---

## 10. 다음 세션에서 참고할 문서 지도

| 알고 싶은 것 | 문서 |
|---|---|
| 처음 온보딩(15분) | `docs/ONBOARDING.md` |
| 전체 폴더 허브 | `docs/README.md` |
| "왜 만들었나"의 전체 서사 (목적·의사결정·설계·서비스·타임라인) | `docs/REVERSE_PLAN.md` — 이 아카이브 문서의 가장 가까운 원천 |
| 개인 생산성 OS 방향의 상세(T1~T6, PO-1~14) | `docs/product/vision/PERSONAL_OS.md` |
| 아키텍처 뷰 지도(드라이버·컨테이너·런타임·데이터·횡단·배포·진화) | `docs/product/architecture/ARCHITECTURE.md` §0 |
| 구현 관점 정확한 설계(계층·API·컴포넌트) | `docs/product/architecture/DESIGN.md` |
| 결정 이력 전체(37건) | `docs/product/architecture/adr/README.md` |
| 기능 요구사항 전체(FR-*) | `docs/product/requirements/REQUIREMENTS_FUNCTIONAL.md` |
| 지금 바로 다음에 뭘 해야 하는지(최신) | `docs/progress/NEXT_SESSION.md` §A/§B |
| 주차별 상세 진행 로그 | `docs/progress/PROGRESS.md` |
| 에이전트 파이프라인 상태 그래프 | `docs/setup/ORCHESTRATION.md` |
| 환경변수·키 발급 | `docs/setup/ENV_REFERENCE.md`, README "API 키 발급" |
| 실행 방법 | 루트 `README.md` "빠른 시작" |

**읽는 순서 제안(복귀 시)**: 이 아카이브 → `NEXT_SESSION.md` §A/§B(최신 상태 확인) →
필요한 세부는 REVERSE_PLAN.md 해당 절 또는 개별 ADR로 드릴다운.
