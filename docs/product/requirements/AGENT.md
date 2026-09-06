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

**우선순위** P0 · **목표 주차** W7 · **상태** ✅ (D1: 할일=실 SQLite, 일정/메일은 더미 유지 — D2 배선)

### 수용 기준
- **AC-1** Given 로컬 DB 에 오늘 할일 2건·일정 1건·미읽은 메일 3건, When `build_context()`, Then 세 종류가 사람이 읽을 수 있는 텍스트 블록으로 합쳐지고 기준 시각이 포함된다.
- **AC-2** Given 어느 소스가 비어 있음, Then 해당 블록은 `"없음"` 으로 표기되고 예외가 나지 않는다.
- **AC-3** Given 할일 소스(로컬 DB) 조회 실패, Then 그 블록은 `"(할일을 불러오지 못함)"` 으로 대체하고 나머지로 진행한다.
- **AC-4** 수집 단계는 어떤 소스에서 몇 건을 읽었는지 로깅한다.

### 데이터 소스 (단계적)
| 소스 | W7 초기 | 이후 |
|---|---|---|
| 할일 | 로컬 SQLite `tasks` (오늘 `due_date`) | 동일 |
| 일정 | 로컬 `calendar_events` 캐시 (없으면 "없음") | Google Calendar 실시간 (FR-CAL-01) |
| 메일 | 로컬 `emails` 캐시 | Gmail 실시간 (FR-MAIL-01) |

### 관련
`agent/daily_brief.py` `build_context()` · `agent/db.py` (`get_today_tasks`) · DESIGN §7

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

**우선순위** P1 · **목표 주차** W7 · **상태** ⏳

### 수용 기준
- **AC-1** Given 생성된 브리핑, When `save_to_notion({title,content,date})`, Then 지정 Notion DB/페이지에 새 페이지가 생기고 URL 을 반환한다.
- **AC-2** 저장 성공 시 `briefs.notion_url` 을 채운다. 실패 시 NULL 유지 + `sync_logs('notion','failed',...)` 기록 + 브리핑 자체는 로컬에 이미 저장돼 있으므로 손실 없음.
- **AC-3** `NOTION_API_KEY` 미설정 시 이 단계를 건너뛰고 경고만 로깅한다.

---

## FR-AGENT-04 — 로컬 캐시 + UI 조회 (P1)

**우선순위** P1 · **목표 주차** W7 · **상태** ⏳

### 수용 기준
- **AC-1** 생성된 브리핑은 `briefs` 테이블에 `date` 기준 upsert 된다(같은 날 재실행 시 갱신).
- **AC-2** `GET /api/brief/today` → 오늘 `briefs` 행을 반환, 없으면 404.
- **AC-3** 대시보드 `BriefCard` 가 이 API 를 호출해 마크다운을 렌더한다. 없으면 "오늘 브리핑이 아직 없습니다".

### 관련
API `GET /api/brief/today` · UI `BriefCard` · 데이터 `briefs`

---

## FR-AGENT-05 — 자동 실행 (스케줄)

**사용자 스토리:** 사용자로서 나는 매일 아침 브리핑이 내가 아무것도 안 해도 준비돼 있길 바란다.

**우선순위** P0 · **목표 주차** W7 · **상태** ⏳

### 수용 기준
- **AC-1** macOS: launchd plist 로 매일 지정 시각(기본 08:00)에 `daily_brief.py` 가 실행된다.
- **AC-2** Linux: cron 항목으로 동일 동작 (`0 8 * * * ...`). 설치 방법이 문서화된다.
- **AC-3** 실행 로그가 파일로 남는다 (`scripts/*.log` 규약, `.gitignore` 에 `*.log` 포함).
- **AC-4** 이미 worklog 에 쓰는 launchd 패턴을 재사용한다 (별도 상주 프로세스 없음, ADR-07).
- **AC-5** 실행 실패(비정상 종료)해도 다음 날 스케줄은 정상 동작한다.

### 관련
`scripts/` · ADR-07 · NFR-DEPLOY-03 · [AUTOMATION.md](../../setup/AUTOMATION.md)

---

## FR-AGENT-06 — 실패 격리

**사용자 스토리:** 사용자로서 나는 Claude 나 외부 API 가 죽어도 앱은 멀쩡하길 바란다.

**우선순위** P0 · **목표 주차** W7 · **상태** 🚧 (AC-1/2/4 완료, AC-3 재시도·지수 백오프 D2-a 완료 [`agent/services/retry.py`] / AC-5 는 D3 `/api/brief/today` 대기)

### 수용 기준
- **AC-1** Given `ANTHROPIC_API_KEY` 없음/무효, When 실행, Then `⚠️ Claude 호출 실패: <원인>` 을 반환하고 종료 코드는 비정상이지만 스택 트레이스로 죽지 않는다.
- **AC-2** Given Notion 저장 실패, Then 브리핑은 로컬에 저장된 상태로 남고 사용자에게 "Notion 저장만 실패" 로 구분해 알린다.
- **AC-3** Given 네트워크 타임아웃, Then 최대 3회 지수 백오프 재시도 후 실패 처리 (NFR-REL-05).
- **AC-4** 모든 실패는 `sync_logs` 또는 로그에 원인과 함께 기록된다. (D1: 로깅만 — `sync_logs.service` CHECK 가 `claude` 를 허용하지 않아 Claude 실패는 로그에만 남긴다.)
- **AC-5** 백엔드 API(`/api/brief/today`)는 에이전트 상태와 무관하게 항상 응답한다(있으면 데이터, 없으면 404).

### 관련
NFR-REL-02, NFR-REL-05, NFR-OBS-02

---

## FR-AGENT-07 — 스케줄 제안 (P2)

**우선순위** P2 · **목표 주차** W11 · **상태** ⏳ (상세화 예정)

바쁜 시간대를 분석해 회의 가능 시간을 제안한다. 별도 엔트리(`agent/schedule_advisor.py`).

---

## FR-AGENT-08 — 대시보드 기반 작업 큐 (P2, 향후 확장)

**우선순위** P2 · **목표 주차** W11+ · **상태** ⏳ (자리표시 — [VISION.md](../vision/VISION.md) 향후 확장, [ADR-0013](../architecture/adr/ADR-0013-dashboard-agent-queue.md))

**사용자 스토리:** 사용자로서 나는 대시보드에 요청을 입력하면 에이전트가 처리해 결과를 돌려주길 원한다 (Daily Brief 의 일반화).

### 방향 (착수 시 상세화)
- `agent_jobs` 큐 테이블, `agent/runner.py`, `POST/GET /api/agent/jobs`, UI 입력창+결과 패널.
- 프롬프트 범위는 **생산성 데이터 분석·요약·제안**으로 제한 (파일·셸·git 접근 없음).
- 핵심 4기능(FR-TASK/PROJ/CAL/MAIL + FR-AGENT-01~06) 완성 후 착수.

---

**작성:** 2026-09-02
