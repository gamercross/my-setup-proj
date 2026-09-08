# ADR-0029: 할 일 자동 분류 — 주체·시점·스키마

- 상태: **채택** (2026-09-08, 개인 OS P6). 사용자 결정: PO-3(자유 태그·다중), PO-4(에이전트 배치). [ADR-0018](ADR-0018-schema-migration-strategy.md) 최소안을 선행 확정했다.
- 관련: [PERSONAL_OS.md](../../vision/PERSONAL_OS.md) T2, [ADR-0006](ADR-0006-agent-owns-external-apis.md), [ADR-0011](ADR-0011-agent-backend-db-access.md), FR-TASK-08(신규), CONSTRAINTS 비용

## 맥락
사용자는 "한 가지 일에 카테고리가 자동으로" 달리길 원한다. 지금 `tasks` 에는
category/tag 컬럼이 없고, `project_id`(수동)만 있다. 에이전트는 `agent/db.py` 에서
`tasks` 를 **읽기 전용**으로만 본다.

## 결정

### PO-3 — 자유 문자열 태그, 다중 (`tasks.category` 폐기)
- 한 할 일에 태그 **여러 개**, 자유 문자열(1~20자). 고정 taxonomy 없음.
- 별도 테이블 `task_tags(task_id, tag, source, created_at)`, PK `(task_id, tag)`,
  `source IN ('user','agent')`. `tasks.category` 컬럼은 **만들지 않는다**(초안의 단일 카테고리안 폐기).
- 근거: 사용자가 원하는 유연성 + 고정 목록 유지보수 회피. `source` 로 수동/자동을 구분해
  에이전트가 사용자 태그를 침범하지 않게 한다.

### PO-4 — 에이전트 배치 분류
- **주체:** 에이전트(`agent/classify.py` 신규). 백엔드 POST 경로에 Claude 호출을 넣지 않는다
  (모든 생성에 지연·비용·실패 지점 추가 — 기각). 수동 태그는 백엔드 `POST/DELETE /api/tasks/:id/tags`.
- **시점:** `daily_brief` 실행 시 `ensure_schema` 직후·`build_context` 전에, 태그가 0개인
  미완료 할 일을 모아 1회 Claude 호출로 일괄 분류(배치, 최대 30건). 실패는 브리핑을 막지 않는다.
- **쓰기:** 에이전트가 `task_tags` 에만 INSERT(`source='agent'`). 저장 시점에도 태그 0개이고
  `source='user'` 가 없는 할 일에만 넣는다. `tasks` 행 자체는 여전히 UPDATE 안 함 —
  ADR-0011 "에이전트는 tasks 읽기 전용" 의 **명시적 예외**(`task_tags` 쓰기만, `daily_brief` 컨텍스트).
  AS_IS 다이어그램에 점선(쓰기)으로 표기.
- **스키마:** `task_tags` 는 `schema.sql` 에 추가. 신규 필요한 마이그레이션은 `sync_logs` CHECK 에
  `'classify'` 추가뿐 → ADR-0018 최소안(`PRAGMA user_version` + `db/index.js` 인라인)으로 처리.

### FR-TASK-08 수용 기준
- **AC-1** 사용자는 위젯에서 할 일에 태그를 추가/삭제할 수 있다(다중, 1~20자).
- **AC-2** 태그는 `POST /api/tasks/:id/tags` / `DELETE /api/tasks/:id/tags/:tag` 로 저장되고 목록·단건 응답의 `tags: []` 에 실린다(`source` 는 미노출).
- **AC-3** 태그가 0개인 미완료 할 일은 다음 `daily_brief` 실행에서 에이전트가 태그를 붙인다(할 일당 1~3개).
- **AC-4** 에이전트는 이미 태그(수동 포함)가 있는 할 일을 건드리지 않는다.
- **AC-5** 분류 실패 시 태그 없음 유지 + `sync_logs('classify','failed')` 기록, 브리핑은 계속 진행.
- **AC-6** 성공 시 `sync_logs('classify','success')` 1행.
- **AC-7** 위젯에 태그 필터 바가 있고, 칩을 눌러 그 태그의 할 일만 볼 수 있다(재클릭 해제).
- **AC-8** 필터 결과 0건이면 전용 안내 + [필터 해제].
- **AC-9** 태그 검증: 트림 후 1~20자·개행/콤마 금지, 위반 시 400 "태그는 1~20자여야 합니다."
- **AC-10** 없는 할 일에 태그 조작은 404, 중복 추가·없는 태그 삭제는 멱등(200/201).
- **AC-11** 할 일 삭제 시 태그도 함께 삭제된다(`ON DELETE CASCADE`).

## 결과 / 트레이드오프
- Claude 비용: 배치라 하루 1회 추가 호출(수십 개 할 일 = 짧은 프롬프트). `services/claude.py:ask` 재사용.
- 백엔드 응답에 `tags: []` 노출. `TASK_COLS` 는 불변 — 별도 쿼리 + JS 조인으로 부착.
- 분류 품질은 프롬프트에 달림 — 오분류해도 사용자가 칩 옆 `×` 로 즉시 교정.
- `ON DELETE CASCADE` 로 할 일 삭제 시 태그 정리.

## 채택 시 영향
`backend/db/schema.sql`(`task_tags` + `sync_logs` CHECK), `backend/db/index.js`(마이그레이션 러너),
`backend/src/db.js`(`attachTags`, `addTaskTag`/`removeTaskTag`, `SYNC_SERVICES`),
`backend/src/services/tasks.js`·`routes/tasks.js`(태그 엔드포인트 2개),
`agent/classify.py`(신규), `agent/daily_brief.py`(배선), `agent/db.py`(`task_tags` 쓰기),
`frontend/src/store/taskTags.js`(신규)·`useTaskStore.js`·`components/TaskTags.jsx`(신규)·`TaskCard.jsx`·`TasksWidgetView.jsx`,
`requirements/AGENT.md`·`TASK.md`, `TRACEABILITY.md`(FR-TASK-08), `DATA_DICTIONARY.md`, `API_REFERENCE.md`, `UI_SPEC.md`, `AS_IS.md` 다이어그램.
ADR-0018 상태 → 채택(최소안).
