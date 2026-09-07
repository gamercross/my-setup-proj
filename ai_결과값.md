# 현재 프로젝트 점검 결과

## 점검 기준

- 기준일: 2026-09-06
- 점검 대상: C3~C6 구현, Supabase 부트스트랩, D1 Daily Brief 변경분, 요구사항·아키텍처·환경 문서
- 목적: 현재 완료된 범위와 아직 위반·미검증인 항목을 구분해 다음 작업을 결정하는 것

## 현재 상태 요약

### 완료 또는 반영된 사항

- C3: 캘린더 더미 API와 캘린더 위젯
- C4: Mermaid 다이어그램 API와 다이어그램 위젯
- C5: 위젯 셸, 레이아웃 저장, 위젯 추가·삭제·이동 구조
- C6: 위젯 테마·표시 옵션·설정 모달
- Supabase: 실제 동기화가 아닌 선택적 클라이언트 부트스트랩과 `/api/sync/health` 진단
- D1 진행: SQLite의 오늘 할일 조회, `briefs` upsert, Daily Brief 실행 흐름과 실패 격리
- 환경 문서: OS별 설치 절차, `.env` 로딩 차이, 개발 포트 3000 규칙, 서비스 smoke 검증
- 문서 점검: 링크·ADR·FR 추적·드리프트 자동 검사

### 현재 검증 상태

- backend 테스트: 70개 통과 (`fix/ai-results-cleanup` 기준, +TC-MAINT-01~05 +TC-REL-01~06)
- frontend 테스트: 9개 통과
- agent 테스트: `pytest -m "not network"` 통과 (무변경 회귀)
- `verify.sh`: 30/0/0 통과 기록
- 문서 정합성 검사: 11/0/0 통과 기록
- `render-diagrams.sh`: 27개 문서, 실패 0
- frontend production build: 성공
- 미완료: Electron 창, 브라우저 UI, 위젯 상호작용, Mermaid 렌더링의 로컬 수동 확인

자동 검증은 양호하지만, 테스트 통과만으로 모든 비기능 요구사항과 실제 화면 동작이 완료된 것은 아닙니다.

## 확인된 문제와 해결책

### 1. 높음: `uncaughtException` 처리 누락

[NFR-REL-03](docs/product/requirements/REQUIREMENTS_NONFUNCTIONAL.md)은 backend가 `unhandledRejection`과 `uncaughtException`을 모두 기록하도록 요구합니다. 현재 [backend/src/server.js](backend/src/server.js#L15-L17)에는 `unhandledRejection` 처리만 있습니다.

**위험**

- 동기 예외가 최상위 로그 정책을 거치지 않음
- 예외 발생 후 프로세스를 계속 유지할지 안전 종료할지 정책이 없음
- 강제 예외 주입 및 graceful shutdown 검증이 없음

**해결책**

`uncaughtException` 처리 정책을 ADR-0016 실행 구조와 함께 결정합니다. 일반적으로 로그 기록 후 안전 종료·재시작을 기본으로 검토하고, 단순히 프로세스를 계속 살리는 방식은 피합니다. 예외 주입 테스트와 SIGTERM 종료 테스트를 추가합니다.

**상태:** 해결됨 (`fix/ai-results-cleanup`) — `backend/src/lifecycle.js`(`logFatal`/`createShutdown`/`registerProcessHandlers`), `server.js` 배선, `db/index.js` `checkpointAndClose`, `test/lifecycle.test.js` TC-REL-01~06. `uncaughtException` 은 로그(1줄+스택) 후 HTTP close·WAL 체크포인트·`exit 1`, SIGTERM/SIGINT 는 `exit 0`, `unhandledRejection` 은 로그만(회귀 0). NFR-REL-03 문구 개정(프로세스 유지 → 안전 종료), ADR-0016 "실패·종료 정책" 절 추가.

### 2. 중간: tasks/projects 라우트가 DB를 직접 호출함

[NFR-MAINT-02](docs/product/requirements/REQUIREMENTS_NONFUNCTIONAL.md)와 [CONVENTIONS.md](docs/setup/CONVENTIONS.md)는 `routes → services → db` 계층을 요구합니다. 그러나 [tasks.js](backend/src/routes/tasks.js#L3-L16)와 [projects.js](backend/src/routes/projects.js#L3-L10)는 라우트에서 DB를 직접 호출하며 입력 검증·도메인 검증도 함께 수행합니다.

C3의 `services/calendar.js`, C4의 `services/diagrams.js`와 달리 기존 도메인의 계층이 일관되지 않습니다. 기능 테스트는 통과하지만 구조 요구사항은 부분 충족입니다.

**해결책**

`backend/src/services/tasks.js`와 `backend/src/services/projects.js`를 추가하고, 라우트는 요청 검증과 HTTP 응답 매핑에 집중하게 합니다. 기존 `backend/src/db.js` 공개 함수 시그니처는 유지합니다.

**상태:** 해결됨 (`fix/ai-results-cleanup`) — `backend/src/services/{tasks,projects}.js` 신규, `errors.js` 에 `ValidationError`/`NotFoundError` + `isNotFoundError`(기존 SQLite 코드·정규식 판정 유지), 라우트에서 `require('../db')` 제거. `db.js` 시그니처 불변. 기존 backend 테스트(tasks 15·projects 10·db·middleware·calendar·diagrams·sync·supabase) 무수정 통과 + `test/services.test.js` TC-MAINT-01~05. NFR-MAINT-02 ✅.

### 3. 중간: D1 Daily Brief은 아직 완성 기능이 아님

D1 변경으로 다음 범위는 구현됐습니다.

- 오늘 마감이고 미완료인 할일을 SQLite에서 조회
- 우선순위 정렬
- `briefs` 날짜 기준 upsert
- Claude 호출 실패와 Notion 저장 실패 격리
- `.env`의 `DATABASE_PATH`를 agent가 읽는 구조

해소된 항목:

- 일정·이메일 실데이터: D2-b `agent/sync.py` → `emails`·`calendar_events` 캐시 (Google OAuth 데스크톱 흐름 + Fernet 토큰)
- `FR-AGENT-06 AC-3` 지수 백오프 재시도: D2-a `agent/services/retry.py` (`call_with_retry`)
- `sync_logs` 기록: D2-a `agent/db.py` `log_sync()` + 백엔드 `GET /api/sync/logs`

아직 남은 항목:

- `FR-AGENT-03` Notion 저장 계약과 `briefs.notion_url` 갱신 미완료
- `GET /api/brief/today`와 BriefCard 미구현
- `FR-AGENT-05` launchd/cron 자동 실행 미구현

**해결책**

D3에서 Notion 계약·Brief API·BriefCard·스케줄러를 완성합니다.

**상태:** D2-a·D2-b 완료, Notion·Brief API·스케줄러는 D3

### 4. 중간: Supabase 부트스트랩을 동기화 완료로 오해할 위험

현재 Supabase 구현은 연결 객체 생성과 `/api/sync/health` 진단만 제공합니다. SQLite와 Supabase 사이의 데이터 동기화, 인증, `user_id`, 충돌 해결은 구현하지 않았습니다.

**해결책**

문서와 UI에서 `/api/sync/health`를 “연결 진단”으로만 표시합니다. FR-SYNC-01/02, 인증, 동기화 로그, 충돌 정책은 Phase E에서 별도 구현합니다. `SUPABASE_KEY`는 `anon public` 키만 사용하고 `service_role` 키는 사용하지 않습니다.

**상태:** 부트스트랩 완료, 동기화 미착수

### 5. 중간: 문서 상태를 기능 구현과 수동 검증으로 분리해야 함

C3~C6와 D1 작업으로 구현 범위가 빠르게 변했기 때문에 README·TRACEABILITY·PROGRESS·UI_SPEC의 상태가 서로 늦게 갱신될 위험이 있습니다. 특히 자동 테스트 통과와 Electron·브라우저 확인 완료는 다른 상태입니다.

**해결책**

모든 기능에 다음 세 상태를 따로 기록합니다.

1. 코드 구현
2. 자동 테스트
3. 브라우저·Electron 수동 검증

기능 완료 시 finisher가 관련 요구사항·테스트·문서 상태를 같은 변경에서 갱신합니다. `scripts/check_docs.py`는 링크·ADR·FR 추적·드리프트를 계속 실행합니다.

**상태:** 자동 검사로 일부 방지, UI 수동 검증 대기

### 6. 낮음에서 중간: Mermaid 번들 크기 경고

frontend build는 성공하지만 Mermaid core와 일부 다이어그램 chunk가 500KB를 초과합니다. 기능 실패는 아니지만 다이어그램 위젯의 최초 로딩 시간과 NFR-PERF-01에 영향을 줄 수 있습니다.

**해결책**

실제 Electron 환경에서 초기 화면과 다이어그램 위젯의 로딩 시간을 측정한 뒤 최적화 여부를 결정합니다. 동적 import는 유지하고, 측정 없이 warning만 숨기지 않습니다.

**상태:** 성능 측정 대기

### 7. 낮음: tasks/projects 계층 외에도 운영 경계 검증이 남음

자동 테스트가 API와 DB 중심으로 구성되어 있어 다음 경계는 실제 실행 확인이 필요합니다.

- Electron이 production `dist`를 정상 로드하는지
- backend 중단 시 위젯별 ErrorBoundary와 ErrorBanner가 정상 동작하는지
- 위젯 레이아웃 저장·복원·훼손 데이터 폴백
- 다이어그램 SVG 렌더링과 개별 블록 실패 폴백
- D1 agent와 backend가 같은 `DATABASE_PATH`를 사용할 때의 WAL 동시 접근
- macOS 외 Windows/Linux 실행

**해결책**

로컬 UI 체크리스트를 수행하고, 필요한 항목은 Playwright 또는 Electron smoke test로 자동화합니다. agent/backend DB 경계는 임시 DB와 별도 프로세스 테스트로 검증합니다.

**상태:** 사용자 로컬 검증 대기

## 환경 구성에서 기억할 점

- backend는 `.env`를 자동 로드하지 않으므로 `PORT`, `DATABASE_PATH`, `SUPABASE_*`는 셸에서 export해야 합니다.
- agent는 `python-dotenv`로 `.env`를 읽습니다.
- Slack 스크립트는 `.env`를 직접 읽습니다.
- frontend preload와 production CSP가 backend 포트 3000을 사용하므로 개발 포트는 현재 3000으로 고정합니다.
- `SUPABASE_KEY`는 `anon public` 키만 사용합니다.
- Node·Python 버전과 native `better-sqlite3` 빌드 도구는 OS별로 확인해야 합니다.
- `npm ci`, agent 가상환경, `verify.sh`, 문서 정합성 검사를 설치 후 기본 검증으로 사용합니다.

## 다음 작업 순서

| 순서 | 작업 | 완료 기준 | 상태 |
|---:|---|---|---|
| 1 | `uncaughtException` 정책·테스트 | NFR-REL-03 충족 | ✅ `fix/ai-results-cleanup` |
| 2 | tasks/projects services 분리 | routes의 DB 직접 호출 제거 | ✅ `fix/ai-results-cleanup` |
| 3 | D2 외부 데이터·재시도 | Gmail·Calendar 실데이터와 백오프 테스트 | ✅ D2-a·D2-b |
| 4 | 다이어그램 내용 정합 | sync.py·캐시 구조 다이어그램 반영, 렌더 실패 0 | ✅ `fix/ai-results-cleanup` |
| 5 | D3 Brief API·UI·스케줄·Notion 계약 | Daily Brief 자동 실행 및 화면 조회 | ⏳ |
| 6 | 브라우저·Electron 검증 | C3~C6 UI 체크와 production 실행 기록 | ⏳ 사용자 로컬 |
| 7 | Phase E 동기화·패키징 | Supabase 동기화, 인증, electron-builder 검증 | ⏳ |

## 최종 결론

현재 프로젝트는 C6까지의 데스크톱 위젯 기반, D2-b 까지의 에이전트 수집·재시도·sync_logs, 그리고 `fix/ai-results-cleanup` 의 백엔드 안전 종료·서비스 계층 분리·다이어그램 정합이 완료된 상태입니다. C1(`uncaughtException`)·C2(계층 위반)·다이어그램 감사는 모두 해소됐습니다.

남은 핵심은 **D3**(Notion `briefs.notion_url` 계약, `GET /api/brief/today` + BriefCard, launchd/cron 스케줄러 FR-AGENT-05), **Electron·브라우저 수동 검증**(C3~C6 UI, production `dist`), **Phase E**(Supabase 실동기화·인증·패키징) 입니다.

## 다이어그램·링크 정합성 감사 (2026-09-07)

### 자동 검증 결과

문서 구조와 Mermaid 렌더링을 확인했습니다 (아래 내용상 불일치는 `fix/ai-results-cleanup` 에서 모두 수정됨).

- 문서 정합성 검사: **11/0/0 통과**
- 상대 링크: 깨진 링크 없음
- Mermaid fence·다이어그램 타입 검사: 통과
- 폴더 README 커버리지: 10개 폴더 전체 통과
- ADR 교차참조: 24개 전체 연결
- FR 추적: 43개 전체 연결
- 실제 Mermaid 렌더링: 27개 문서, 실패 0

따라서 링크 경로와 Mermaid 문법 자체에는 문제가 없습니다. 다만 문법 검사는 다이어그램의 의미가 실제 코드와 맞는지까지 확인하지 않으므로, 아래 내용상 불일치를 별도로 수정해야 합니다.

### 내용상 불일치

#### 1. 높음: Daily Brief 다이어그램이 현재 실행 구조와 다름

[DESIGN.md](docs/product/architecture/DESIGN.md#L300)의 Daily Brief 시퀀스는 `daily_brief.py`가 Gmail·Calendar를 직접 호출하는 것처럼 표현합니다.

현재 구현은 다음과 같이 분리되어 있습니다.

```text
sync.py
	→ Gmail / Calendar API
	→ emails / calendar_events 캐시

daily_brief.py
	→ SQLite 캐시 조회
	→ Claude 분석
	→ briefs 저장
```

따라서 현재 다이어그램의 `DB2 -> GM: 수집 요청` 흐름은 실제 코드와 맞지 않습니다. 다이어그램을 `sync.py` 동기화 흐름과 `daily_brief.py` 캐시 조회 흐름으로 분리해야 합니다.

**상태:** 해결됨 (`fix/ai-results-cleanup`) — D2-b 이후에도 미반영이었음. `DESIGN.md` §7 Daily Brief 시퀀스를 `sync.py`(07:50 수집)와 `daily_brief.py`(08:00, 캐시만 조회) 로 분리, §3 흐름 서술·목표 아키텍처 다이어그램에 `sync.py` 추가.

#### 2. 높음: `sync.py` 프로세스가 런타임 다이어그램에서 빠짐

[RUNTIME_VIEW.md](docs/product/architecture/RUNTIME_VIEW.md#L16-L30)는 Python 에이전트를 `daily_brief.py` 하나로만 표현합니다. 하지만 현재는 다음 두 배치 작업이 존재합니다.

- `daily_brief.py`: 로컬 캐시 조회와 브리핑 생성
- `sync.py`: Gmail·Calendar 동기화와 캐시 저장

프로세스 목록, 실행 주체, 외부 API 흐름에 `sync.py`를 별도 항목으로 추가해야 합니다. 현재 `launchd/cron 08:00` 표현도 실제로 `sync.py`와 `daily_brief.py` 중 무엇을 실행하는지 명확히 해야 합니다.

**상태:** 해결됨 (`fix/ai-results-cleanup`) — `RUNTIME_VIEW.md` §1 프로세스 표·다이어그램에 `sync.py`(수집)·`daily_brief.py`(생성) 2개 배치 분리 + 실행 순서(sync 먼저) + 스케줄 주체(launchd/cron, FR-AGENT-05 미구현이라 현재 수동) 명시. §3 종료 표에 Express 수명주기 반영.

#### 3. 중간: UI가 SQLite에 직접 접근하는 것처럼 표현됨

[ARCHITECTURE.md](docs/product/architecture/ARCHITECTURE.md#L205-L224)의 브리핑 시퀀스는 `UI -> DB: GET /api/brief/today`로 되어 있습니다.

실제 구조는 다음입니다.

```text
UI → Express API → SQLite
SQLite → Express API → UI
```

UI가 SQLite에 직접 접근하지 않으므로, 시퀀스의 DB 참여자를 backend API로 교체해야 합니다.

**상태:** 해결됨 (`fix/ai-results-cleanup`) — `ARCHITECTURE.md` §1 브리핑 시퀀스에 `participant API as Express API` 추가, `UI->>API: GET /api/brief/today` → `API->>DB: briefs 조회` → `DB-->>API` → `API-->>UI` 로 교체. 제목에 `(D3 목표)` 라벨 추가.

#### 4. 중간: Notion이 캐시 테이블에 연결된 것처럼 표현됨

[DATA_ARCHITECTURE.md](docs/product/architecture/DATA_ARCHITECTURE.md#L11)의 데이터 수명주기 다이어그램은 Gmail·Calendar·Notion을 모두 `emails·calendar_events` 캐시로 연결합니다.

실제 책임은 다음과 같이 나눠야 합니다.

- Gmail → `emails`
- Google Calendar → `calendar_events`
- Claude → `briefs`
- Notion → 외부 페이지 저장 및 `briefs.notion_url`

Notion은 이메일·일정 캐시의 입력원이 아니므로 별도 흐름으로 분리해야 합니다.

**상태:** 해결됨 (`fix/ai-results-cleanup`) — `DATA_ARCHITECTURE.md` 데이터 수명주기 다이어그램을 `Gmail → emails`, `Google Calendar → calendar_events`(각 sync.py ACL), `emails·calendar_events·로컬소유 → briefs`, `Claude → briefs`, `briefs → Notion 외부 페이지`(daily_brief.py 저장) → `briefs.notion_url`(page url) 로 재작성. §5 소유권 표와 정합.

#### 5. 중간: 현재 구조와 목표 구조가 한 다이어그램에 혼재함

[DESIGN.md](docs/product/architecture/DESIGN.md#L90-L110)의 목표 아키텍처는 `routes → services → db` 구조를 표시하지만, 현재 tasks/projects 라우트는 DB를 직접 호출합니다.

해당 다이어그램이 TO-BE라면 제목과 주석에 “목표 구조”임을 명확히 표시하고, 현재 구조를 설명하는 다이어그램에는 `routes → db`를 반영하거나 AS-IS/TO-BE를 분리해야 합니다.

**상태:** 해결됨 (`fix/ai-results-cleanup`) — C2 로 tasks/projects 도 `routes → services → db` 가 실제 구조가 됨. `DESIGN.md` §3 TO-BE 다이어그램의 `RT → SVC` 라벨을 `services/ tasks · projects · calendar · diagrams` 로, 다이어그램 위에 "AS-IS 는 AS_IS.md" 안내 추가. 짝 AS-IS 다이어그램(`AS_IS.md` §현재 모듈 의존 관계)도 `routes → services → db.js → db/index.js` 로 갱신.

#### 6. 낮음: 미구현 Supabase·마이그레이션 흐름이 실제 완료처럼 보일 수 있음

[DATA_ARCHITECTURE.md](docs/product/architecture/DATA_ARCHITECTURE.md#L11)의 마이그레이션 러너와 Supabase 동기화 흐름은 아직 제안·미구현 범위입니다. Supabase는 현재 연결 진단만 구현됐고, 실제 동기화·RLS·충돌 해결은 Phase E 범위입니다.

다이어그램에 `제안`, `Week 10+`, `미구현` 표기를 추가해 현재 구현과 목표 설계를 구분해야 합니다.

**상태:** 해결됨 (`fix/ai-results-cleanup`) — `DATA_ARCHITECTURE.md` 수명주기 다이어그램에서 동기화 계층 `🔷 제안 · Week 10+ · 미구현`, Supabase `🔷 현재는 연결 진단만`, 마이그레이션 러너 `🔷 제안(ADR-0018) · 미구현` 으로 라벨 + 점선(`-.->`) 처리, "실선=구현됨, 점선=제안/미구현" 범례 추가.

### 보안 긴급 조치

이번 검수 과정에서 `.env`의 Google·Notion·Slack·Claude 자격 증명이 대화에 노출되었습니다. 값 자체는 이 문서에 기록하지 않지만, 이미 노출된 것으로 간주해 아래와 같이 조치했습니다.

- Slack Webhook: 재발급 완료 (사용자, HTTP 200 확인)
- Supabase: 키 확인 완료 (`/api/sync/health` ok)
- Anthropic API Key: 재발급했으나 org-레벨 키라 워크스페이스 스코프 키로 재발급 필요 — 진행 중
- Google Client ID/Secret: 등록 완료, 최초 OAuth 로그인 대기
- Notion API Key: 재발급 완료. 추가로 Notion MCP 도구를 `.claude/settings.json` `permissions.deny` 로 차단 (PR #24 병합, `0cd75e2`)
- `.claude/settings.json` 의 `permissions.deny` 는 Notion MCP 도구 **호출**을 막지만, MCP 서버가 컨텍스트에 주입하는 **지시문 자체**는 막지 못한다 (세션 중 실제로 주입 시도 관찰·무시). 근본 차단은 커넥터 연결 해제(claude.ai 설정) 필요.
- 새 값은 채팅이나 저장소에 입력하지 않고 로컬 `.env`에만 저장

### 다이어그램 수정 우선순위

| 순서 | 수정 대상 | 조치 | 상태 |
|---:|---|---|---|
| 1 | `DESIGN.md` Daily Brief 흐름 | `sync.py`와 `daily_brief.py` 흐름 분리 | ✅ |
| 2 | `RUNTIME_VIEW.md` | `sync.py` 프로세스와 실행 스케줄 추가 | ✅ |
| 3 | `ARCHITECTURE.md` | UI → API → SQLite 흐름으로 수정 + `(D3 목표)` 라벨 | ✅ |
| 4 | `DATA_ARCHITECTURE.md` | Gmail·Calendar·Claude·Notion 데이터 흐름 분리 | ✅ |
| 5 | 목표 구조 다이어그램 | TO-BE·미구현·Week 10+ 라벨 명확화 + services 라벨 | ✅ |
| 6 | 문서 재검증 | `check-docs.sh` 11/0/0, `render-diagrams.sh` 27/실패 0 | ✅ |

**판정:** `fix/ai-results-cleanup` 에서 위 6개 항목을 모두 반영했습니다. `sync.py`(수집)와 캐시 중심 `daily_brief.py`(생성) 구조가 DESIGN·RUNTIME_VIEW·ARCHITECTURE·DATA_ARCHITECTURE·AS_IS 에 일관되게 나타납니다.
