# FR-AGENT — AI 에이전트 (Daily Brief) 상세 명세

> [REQUIREMENTS_FUNCTIONAL.md](REQUIREMENTS_FUNCTIONAL.md) 의 AGENT 도메인 상세화.
> 설계는 [DESIGN.md](../architecture/DESIGN.md) §7, Claude 사용 규칙은 [CONVENTIONS.md](../../setup/CONVENTIONS.md) §4.

## 공통 규칙

- 엔트리는 `agent/daily_brief.py` — CLI 로도, 스케줄러로도 실행 가능.
- Claude 모델 `claude-sonnet-5`, `thinking:{type:"adaptive"}` + `output_config.effort:"low"` (비용 최적화) — 상수는 `agent/services/claude.py` `DEFAULT_MODEL`·`DEFAULT_EFFORT` 한 곳.
- **어떤 외부 호출 실패도 프로세스를 죽이지 않는다** (NFR-REL-02). 실패는 로그 + `sync_logs` 기록 + 사용자 메시지.
- 실행은 4단계를 로깅한다: 시작 → 수집 결과 → Claude 결과 → 저장 (NFR-OBS-02).

---

## FR-AGENT-01 — 컨텍스트 수집

**사용자 스토리:** 에이전트로서 나는 오늘의 할일·일정·미읽은 메일을 모아 Claude 에게 줄 입력을 만들어야 한다.

**우선순위** P0 · **목표 주차** W7 · **상태** ✅ (D1: 할일=실 SQLite / D2-b: 일정·메일도 로컬 캐시에서 읽음 — `build_context` 는 네트워크 호출 안 함)

### 수용 기준
- **AC-1** Given 로컬 DB 에 오늘 할일 2건·일정 1건·미읽은 메일 3건, When `build_context()`, Then 세 종류가 사람이 읽을 수 있는 텍스트 블록으로 합쳐지고 기준 시각이 포함된다.
- **AC-2** Given 어느 소스가 비어 있음, Then 해당 블록은 `"없음"` 으로 표기되고 예외가 나지 않는다.
- **AC-3** Given 할일 소스(로컬 DB) 조회 실패, Then 그 블록은 `"(할일을 불러오지 못함)"` 으로 대체하고 나머지로 진행한다.
- **AC-4** 수집 단계는 어떤 소스에서 몇 건을 읽었는지 로깅한다.

### 데이터 소스 (단계적)
| 소스 | 지금 (D2-b) | 적재 주체 |
|---|---|---|
| 할일 | 로컬 SQLite `tasks` (오늘 `due_date`) | 백엔드 |
| 일정 | 로컬 `calendar_events` 캐시 (`get_today_events`, 없으면 "없음") | `agent/sync.py` → `services/calendar.py` (D2-b 실배선) |
| 메일 | 로컬 `emails` 캐시 (`get_unread_emails`, 없으면 "없음") | `agent/sync.py` → `services/gmail.py` (D2-b 실배선) |

> `build_context()` 는 로컬 DB 만 읽는다 — Gmail·Calendar 네트워크 호출은 `agent/sync.py` 의 책임이며 브리핑 경로와 분리돼 있다. 이메일/일정 캐시 조회 실패는 각각 `"(이메일을 불러오지 못함)"` / `"(일정을 불러오지 못함)"` 로 격리한다.

### 관련
`agent/daily_brief.py` `build_context()` · `agent/db.py` (`get_today_tasks`, `get_unread_emails`, `get_today_events`) · `agent/sync.py` · DESIGN §7

---

## FR-AGENT-02 — Claude 로 브리핑 생성

**사용자 스토리:** 사용자로서 나는 아침에 "오늘 뭐부터 해야 하는지"를 정리된 형태로 받고 싶다.

**우선순위** P0 · **목표 주차** W7 · **상태** ✅ (D1: `SYSTEM_PROMPT` 보강 + `_run()` 배선)

### 수용 기준
- **AC-1** Given 유효한 컨텍스트, When `ask(context, system=SYSTEM_PROMPT)`, Then Claude 가 "오늘의 우선순위 TOP 3 + 주의점" 형식의 텍스트를 반환한다.
- **AC-2** 응답에서 텍스트 블록만 추출해 하나의 문자열로 만든다 (현재 `claude.py` 구현대로).
- **AC-3** `SYSTEM_PROMPT` 는 코드 상수로 관리하고, 역할("생산성 코치")·출력 형식·간결성 지침을 담는다.
- **AC-4** `max_tokens` 는 브리핑에 충분한 값(현재 1024)으로 두고, 초과 시 잘린 결과라도 저장한다.

### 관련
`agent/services/claude.py` · NFR-PERF-04(60초 이내) · CONVENTIONS §4

---

## FR-AGENT-03 — Notion 저장 (P1)

**우선순위** P1 · **목표 주차** W7 · **상태** ✅ (D3 — `agent/services/notion.py`, requests 직접 호출, `NOTION_VERSION=2022-06-28`)

### 수용 기준
- **AC-1** Given 생성된 브리핑, When `save_to_notion({title,content,date})`, Then `NOTION_PARENT_PAGE_ID` 아래에 새 페이지가 생기고 URL 을 반환한다. 본문 2000자 초과 시 paragraph 블록으로 분할.
- **AC-2** 저장 성공 시 `briefs.notion_url` 을 채운다 + `sync_logs('notion','success')`. 실패 시 NULL 유지 + `sync_logs('notion','failed', <마스킹된 사유>)` 기록 + 브리핑 자체는 로컬에 이미 저장돼 있으므로 손실 없음.
- **AC-3** `NOTION_API_KEY` **또는** `NOTION_PARENT_PAGE_ID` 미설정 시 이 단계를 건너뛰고(`NotionNotConfigured`) 안내만 로깅한다 — 실패로 치지 않으며 `sync_logs` 에도 남기지 않는다.
- **AC-4** 429·5xx 는 최대 3회 지수 백오프 재시도(1s·2s), 401·400 등은 즉시 실패.

### 한계 (v1)
- 하루 재실행 시 같은 날짜의 Notion 페이지가 **중복 생성**될 수 있다. 로컬 `briefs` 는 `date` upsert 라 1건이지만 Notion 측 중복 제거는 하지 않는다.

---

## FR-AGENT-04 — 로컬 캐시 + UI 조회 (P1)

**우선순위** P1 · **목표 주차** W7 · **상태** ✅ (D3)

### 수용 기준
- **AC-1** 생성된 브리핑은 `briefs` 테이블에 `date` 기준 upsert 된다(같은 날 재실행 시 갱신).
- **AC-2** `GET /api/brief/today` → 오늘 `briefs` 행을 `{ brief: {...} }` 로 반환. **없으면 200 + `{ brief: null }`** (404 아님 — [ADR-0025](../architecture/adr/ADR-0025-brief-empty-response.md)).
- **AC-3** 대시보드 `BriefCard` 가 이 API 를 호출해 **plain text(pre-wrap)** 로 렌더한다(마크다운 파서 없음 — NFR-SEC-04). 없으면 "오늘 브리핑이 아직 없습니다".

### 관련
API `GET /api/brief/today` · UI `BriefCard`(+`BriefWidgetView`·`useBriefStore`) · 데이터 `briefs` · [ADR-0025](../architecture/adr/ADR-0025-brief-empty-response.md)

---

## FR-AGENT-05 — 자동 실행 (스케줄)

**사용자 스토리:** 사용자로서 나는 매일 아침 브리핑이 내가 아무것도 안 해도 준비돼 있길 바란다.

**우선순위** P0 · **목표 주차** W7 · **상태** ✅ (D3)

### 수용 기준
- **AC-1** macOS: launchd plist 로 매일 지정 시각(**기본 07:30**)에 `scripts/daily-brief-run.sh`(→ `sync.py` → `daily_brief.py`)가 실행된다. 설치: `bash scripts/install-dailybrief-launchd.sh`.
- **AC-2** Linux: cron 항목으로 동일 동작 (`30 7 * * * .../scripts/daily-brief-run.sh`). 설치 방법이 [AUTOMATION.md](../../setup/AUTOMATION.md) 에 문서화된다.
- **AC-3** 실행 로그가 파일로 남는다 (`scripts/daily-brief.log`, 1MB 초과 시 `.log.1` 회전. `.gitignore` 에 `scripts/daily-brief.log*` 포함).
- **AC-4** 이미 worklog 에 쓰는 launchd 패턴을 재사용한다 (별도 상주 프로세스 없음, ADR-07). 래퍼가 `.env` 를 명시 로딩한다(launchd 는 셸 프로파일 미로딩).
- **AC-5** 실행 실패(비정상 종료)해도 다음 날 스케줄은 정상 동작한다 (`KeepAlive` 미설정 — 재시도 안 함).

### 관련
`scripts/daily-brief-run.sh` · `scripts/install-dailybrief-launchd.sh` · `scripts/com.aicomputeros.dailybrief.plist` · ADR-07 · NFR-DEPLOY-03 · [AUTOMATION.md](../../setup/AUTOMATION.md)

---

## FR-AGENT-06 — 실패 격리

**사용자 스토리:** 사용자로서 나는 Claude 나 외부 API 가 죽어도 앱은 멀쩡하길 바란다.

**우선순위** P0 · **목표 주차** W7 · **상태** ✅ (D3 — AC-5 `/api/brief/today` 완료)

### 수용 기준
- **AC-1** Given `ANTHROPIC_API_KEY` 없음/무효, When 실행, Then `⚠️ Claude 호출 실패: <원인>` 을 반환하고 종료 코드는 비정상이지만 스택 트레이스로 죽지 않는다.
- **AC-2** Given Notion 저장 실패, Then 브리핑은 로컬에 저장된 상태로 남고 사용자에게 "Notion 저장만 실패" 로 구분해 알린다.
- **AC-3** Given 네트워크 타임아웃, Then 최대 3회 지수 백오프 재시도 후 실패 처리 (NFR-REL-05).
- **AC-4** 모든 실패는 `sync_logs` 또는 로그에 원인과 함께 기록된다. (D1: 로깅만 — `sync_logs.service` CHECK 가 `claude` 를 허용하지 않아 Claude 실패는 로그에만 남긴다.)
- **AC-5** 백엔드 API(`/api/brief/today`)는 에이전트 상태와 무관하게 항상 응답한다(있으면 `{brief:{...}}`, 없으면 200 + `{brief:null}` — ADR-0025).

### 관련
NFR-REL-02, NFR-REL-05, NFR-OBS-02

---

## 할 일 자동 분류 배치 (FR-TASK-08 / ADR-0029)

**엔트리:** `agent/classify.py` — `daily_brief._run()` 이 `ensure_schema` 직후·`build_context` 전에 `classify_untagged()` 를 호출한다.

- 대상: 태그가 0개인 미완료 할 일(`agent/db.py:get_untagged_tasks`, 최대 30건). 0건이면 Claude 호출 없이 종료.
- 1회 Claude 호출(`services/claude.py:ask` 재사용)로 `{"tags": {"<id>": ["태그"]}}` JSON 을 받아 파싱(`parse_tags`).
- 저장: `agent/db.py:add_agent_tags` — 저장 시점에도 태그 0개이고 `source='user'` 없는 할 일에만 `INSERT ... source='agent'`. `tasks` 행은 UPDATE 안 함(ADR-0011 예외 — `task_tags` 쓰기만).
- 성공 → `sync_logs('classify','success')`. 예외 → `logger.warning` + `sync_logs('classify','failed', sanitize_error(...))` + 반환 0(브리핑 계속 진행).

---

## FR-AGENT-07 — 스케줄 제안 (P2)

**우선순위** P2 · **목표 주차** W11 · **상태** ⏳ (상세화 예정)

바쁜 시간대를 분석해 회의 가능 시간을 제안한다. 별도 엔트리(`agent/schedule_advisor.py`).

---

## FR-AGENT-08 — 에이전트 활동 위젯 + 지금 실행 (P1)

**우선순위** P1 · **목표 주차** W8 · **상태** ✅ (P7, 2026-09-08) · **결정** [ADR-0013](../architecture/adr/ADR-0013-dashboard-agent-queue.md) 부분 채택(PO-9)

**사용자 스토리:** 사용자로서 나는 대시보드에서 에이전트가 마지막으로 언제 무엇을 했는지, 다음 실행은 언제인지 보고, 필요하면 지금 바로 실행을 요청하고 싶다.

### 구현
- **활동 위젯**(`activity` 주제 기본 위젯 `agent`): 최근 `sync_logs`(성공/실패·시각·오류), Supabase 연결 상태, 다음 예약 시각, "지금 실행" 버튼.
- **API**: `GET /api/agent/activity`(조립·읽기 전용), `POST /api/agent/run-now`(트리거 플래그 생성, 멱등). [API_REFERENCE.md](../reference/API_REFERENCE.md) 참조.
- **트리거 방식**: 백엔드는 파이썬을 띄우지 않는다(ADR-0011). `agent/.triggers/run-now` 플래그 파일만 쓰고, launchd `WatchPaths`(`scripts/install-runnow-launchd.sh`)가 감지해 `agent/trigger.py` → `sync.sync_all()` 을 실행한다. `daily-brief-run.sh` 도 시작 시 밀린 플래그를 소비한다(폴백).
- **예약 시각 표시**: plist 를 파싱하지 않고 `.env` 의 `DAILY_BRIEF_HOUR`/`MINUTE`(기본 07:30)로 계산한다. 시각을 바꿀 때는 launchd 재설치와 `.env` 를 함께 고친다 ([AUTOMATION.md](../../setup/AUTOMATION.md)).

### 수용 기준
1. 활동 위젯이 최근 실행 이력(서비스·상태·시각)을 최신순으로 보여준다.
2. "지금 실행"을 누르면 요청이 저장되고, 버튼은 요청 중/대기 중 상태를 표시한다.
3. 같은 요청을 두 번 눌러도 플래그는 하나다(멱등, `alreadyPending`).
4. 백엔드는 어떤 경우에도 파이썬 프로세스를 직접 실행하지 않는다.
5. Supabase 연결 확인이 실패해도 위젯은 200 으로 나머지 정보를 보여준다.
6. `agent/` 폴더를 못 찾으면 "지금 실행"은 503 으로 안내하고 위젯은 계속 동작한다.
7. 다음 실행 시각이 `.env` 기준으로 표시된다.
8. 데모 모드에서도 위젯이 샘플 이력과 함께 동작한다.

---

## FR-AGENT-09 — 대시보드 기반 작업 큐 (P2, 향후 확장)

**우선순위** P2 · **목표 주차** W11+ · **상태** ⏳ (자리표시 — [VISION.md](../vision/VISION.md) 향후 확장, [ADR-0013](../architecture/adr/ADR-0013-dashboard-agent-queue.md))

**사용자 스토리:** 사용자로서 나는 대시보드에 요청을 입력하면 에이전트가 처리해 결과를 돌려주길 원한다 (Daily Brief 의 일반화).

### 방향 (착수 시 상세화)
- `agent_jobs` 큐 테이블, `agent/runner.py`, `POST/GET /api/agent/jobs`, UI 입력창+결과 패널.
- 프롬프트 범위는 **생산성 데이터 분석·요약·제안**으로 제한 (파일·셸·git 접근 없음).
- 핵심 4기능(FR-TASK/PROJ/CAL/MAIL + FR-AGENT-01~06) 완성 후 착수.

---

**작성:** 2026-09-02
