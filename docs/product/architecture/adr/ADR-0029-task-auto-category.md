# ADR-0029: 할 일 자동 분류 — 주체·시점·스키마

- 상태: **제안** (2026-09-07) — P1. 사용자 결정: PO-3, PO-4. **[ADR-0018](ADR-0018-schema-migration-strategy.md) 결정을 선행 강제.**
- 관련: [PERSONAL_OS.md](../../vision/PERSONAL_OS.md) T2, [ADR-0006](ADR-0006-agent-owns-external-apis.md), [ADR-0011](ADR-0011-agent-backend-db-access.md), FR-TASK-08(신규), CONSTRAINTS 비용

## 맥락
사용자는 "한 가지 일에 카테고리가 자동으로" 달리길 원한다. 지금 `tasks` 에는
category/tag 컬럼이 없고, `project_id`(수동)만 있다. 에이전트는 `agent/db.py` 에서
`tasks` 를 **읽기 전용**으로만 본다.

## 결정

### PO-3 — 고정 taxonomy, 단일 카테고리
- 카테고리 집합: `업무` · `학습` · `개인` · `건강` · `잡무` · `미분류` (6종, 조정 가능).
- 한 할 일에 **하나**. 자유 태그·다중은 범위 밖(나중에 `task_labels` 로 확장 가능).
- 근거: 개인용이고 위젯 필터가 목적이라 소수 고정이 UI·프롬프트 모두 단순.

### PO-4 — 에이전트 배치 분류, `tasks.category` 컬럼
- **주체:** 에이전트(`agent/classify.py` 신규). 백엔드 POST 경로에 Claude 호출을 넣지 않는다
  (모든 생성에 지연·비용·실패 지점 추가 — 기각).
- **시점:** ① `daily_brief` 실행 시 `category IS NULL OR category = '미분류'` 인 할 일을 모아
  1회 Claude 호출로 일괄 분류(배치). ② 사용자가 위젯에서 수동 지정하면 그 값 고정(에이전트가
  덮지 않음 — `category_locked` 또는 수동표시).
- **쓰기:** 에이전트가 `tasks.category` 를 직접 UPDATE. 이건 ADR-0011 의 "에이전트는 tasks 읽기 전용"
  의 **명시적 예외** — `category` 컬럼만, 그리고 `daily_brief` 컨텍스트에서만. AS_IS 다이어그램에
  점선으로 표기(D2-b 의 `sync 읽기 전용 직접 조회` 예외와 같은 방식).
- **스키마:** `ALTER TABLE tasks ADD COLUMN category TEXT NOT NULL DEFAULT '미분류'
  CHECK (category IN (...))`. → **첫 실제 `ALTER` 이므로 ADR-0018(마이그레이션 전략) 을 여기서 확정.**
  최소안: `schema.sql` 에 컬럼 추가 + `backend/db/index.js` 가 기동 시 `PRAGMA table_info` 로
  없으면 `ALTER` (멱등). 버전 테이블은 도입하되 단순 정수.

### FR-TASK-08 (신규)
- **AC-1** 새 할 일이 생기면 다음 `daily_brief` 실행에서 카테고리가 붙는다(6종 중 하나).
- **AC-2** 사용자가 위젯에서 카테고리를 바꾸면 에이전트가 다시 덮지 않는다.
- **AC-3** Claude 호출 실패 시 `미분류` 유지, `sync_logs('...','failed')` 또는 로그.
- **AC-4** 위젯에서 카테고리 칩으로 필터.

## 결과 / 트레이드오프
- Claude 비용: 배치라 하루 1회 추가 호출(수십 개 할 일 = 짧은 프롬프트). Sonnet·effort low.
- 백엔드 응답에 `category` 노출(`TASK_COLS` 추가).
- 분류 품질은 프롬프트에 달림 — 6종이라 오분류해도 사용자가 칩으로 즉시 교정.

## 채택 시 영향
`backend/db/schema.sql`, `backend/db/index.js`(멱등 ALTER), `backend/src/db.js`(`TASK_COLS` + 수동 지정 액션),
`agent/classify.py`(신규), `agent/daily_brief.py`(배선), `agent/db.py`(category UPDATE),
`requirements/AGENT.md`·`TASK.md`, `TRACEABILITY.md`(FR-TASK-08), `DATA_DICTIONARY.md`, `AS_IS.md` 다이어그램,
ADR-0018 상태 → 채택.
