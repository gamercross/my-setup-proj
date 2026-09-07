# FR-MAIL — 이메일 도메인 상세 명세

> [REQUIREMENTS_FUNCTIONAL.md](REQUIREMENTS_FUNCTIONAL.md) §4 의 MAIL 도메인 상세화.
> 용어 [GLOSSARY.md](../reference/GLOSSARY.md) · 데이터 [DATA_DICTIONARY.md](../reference/DATA_DICTIONARY.md) · API [API_REFERENCE.md](../reference/API_REFERENCE.md).
> 관련 결정: [ADR-0006](../architecture/adr/ADR-0006-agent-owns-external-apis.md) (외부 API 는 에이전트 전담), [ADR-0011](../architecture/adr/ADR-0011-agent-backend-db-access.md) (`emails` 캐시는 에이전트 소유·백엔드 읽기 전용), [ADR-0024](../architecture/adr/ADR-0024-oauth-token-storage.md) (토큰 저장).

## 공통 규칙

- Gmail 접근은 **읽기 전용**(`gmail.readonly`). 메일을 수정·삭제·발송하지 않는다.
- 수집 주체는 `agent/sync.py`(엔트리포인트) → `agent/services/gmail.py`. 백엔드·브리핑은 `emails` 캐시만 읽는다.
- 네트워크 호출은 `execute_with_retry` 로 감싼다 — 429/5xx 3회 백오프(1s·2s), 401/403/400 즉시 실패(NFR-REL-05).
- 동기화 성공·실패는 `sync_logs('gmail', ...)` 에 1행 기록(NFR-OBS-03, FR-SYNC-03). 실패 메시지는 토큰류 마스킹 + 500자 절단.

---

## FR-MAIL-01 — Gmail 미읽은 메일 수집

**사용자 스토리:** 사용자로서 나는 미읽은 메일을 한눈에 보고 브리핑에 반영하고 싶다.

**우선순위** P1 · **목표 주차** W6 · **상태** ✅ Phase D2-b (2026-09-07) — agent 측 수집·캐시. 조회 API(`GET /api/mail/unread`)는 이번 범위 밖.

### 수용 기준
- **Given** 유효한 Google 토큰, **When** `sync_gmail()` 실행, **Then** 미읽은 메일 최대 N건(기본 10)을 `email_id / from_address / subject / snippet / received_at` 로 정규화해 `emails` 에 upsert 한다. `received_at` 은 `internalDate`(ms)→ISO8601 로컬.
- **Given** 이미 한 번 동기화한 상태, **When** 다시 동기화, **Then** `email_id` UNIQUE 로 행이 늘지 않고 필드만 갱신된다.
- **Given** 직전 동기화에 있던 메일이 이번 결과에 없음, **When** 동기화, **Then** 그 기존 미읽음 행은 `is_read=1` 로 바뀐다(캐시에서 "읽음"으로 내려감).
- **Given** Gmail 호출이 실패, **When** `sync_gmail()`, **Then** 예외를 전파하지 않고 `sync_logs('gmail','failed',원인)` 기록 후 `False` 를 반환한다. 캘린더 동기화·브리핑 생성은 계속된다.
- **Given** 개별 메일 상세 조회 1건이 실패, **When** `fetch_unread()`, **Then** 그 1건만 건너뛰고 나머지를 반환한다.

### 관련
`agent/services/gmail.py` · `agent/services/google_common.py` · `agent/db.py` (`upsert_emails`, `mark_emails_read_except`, `get_unread_emails`)
TC: TC-MAIL-01~09

---

## 이월

- **FR-MAIL-02 / FR-MAIL-03** (다중 계정, 상세·답장·삭제) — W9 이후.
- **조회 API `GET /api/mail/unread`** — 백엔드가 `emails` 캐시를 읽어 노출하는 엔드포인트는 별도 Phase.
