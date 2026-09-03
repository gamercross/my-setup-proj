# ADR-0012: 할일–프로젝트 연결 (`tasks.project_id`)

- 상태: 채택 (2026-09-02)
- 관련: FR-PROJ, FR-TASK, [DATA_DICTIONARY.md](../DATA_DICTIONARY.md)

## 맥락
`tasks` 와 `projects` 가 무관하다. GLOSSARY 는 "프로젝트 = 여러 할일을 묶는 상위 단위" 로 정의한다.

## 결정
**`tasks.project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL` (NULL 허용) 를 추가한다.**
- NULL = "프로젝트 없음(단독 할일)".
- 프로젝트 삭제 시 하위 할일은 삭제하지 않고 `project_id` 를 NULL 로 (`ON DELETE SET NULL`).
- `progress` 는 **당분간 수동 입력** 유지. 하위 할일 완료율 자동 계산은 하지 않는다(나중에 선택적으로).
- 스키마(`schema.sql`)에는 지금 반영. 라우트·API 배선은 **Phase C2** (완료 2026-09-03). 필터(`GET /api/tasks?project_id=`)는 **C2 범위 제외 — FR-TASK-06 정렬·필터와 함께 이월**.

## 근거
- 정의상 이미 상위/하위 관계다.
- NULL 허용이면 기존·단독 할일과 호환.
- `SET NULL` 이 데이터 손실 없이 가장 안전.

## 대안
- 연결 안 함: 프로젝트 개념이 반쪽이 된다.
- `ON DELETE CASCADE`: 프로젝트 지우면 할일이 사라져 위험.
- 별도 조인 테이블(다대다): 할일이 한 프로젝트에만 속하면 과설계.

## 결과 / 트레이드오프
- `backend/db/schema.sql`: `tasks` 에 `project_id` 컬럼 + `idx_tasks_project` 인덱스 + FK.
- `db.js` `TASK_FIELDS`·`TASK_COLS` 에 `project_id` 추가 (C2). API 응답에 `project_id` 노출 (NULL = 단독 할일).
- `POST /api/tasks` / `PUT /api/tasks/:id` 에서 `project_id` 검증 (C2, `routes/tasks.js` `checkProjectId`): 존재하는 프로젝트 id 또는 NULL 만 통과. 없는 id → 400 `"연결할 프로젝트를 찾을 수 없습니다."`, 정수/NULL 아님 → 400 `"project_id 는 프로젝트 id(정수) 또는 null 이어야 합니다."`. 라우트가 FK 위반 도달 전에 사전 검증.
- `PRAGMA foreign_keys = ON` 이 이미 `schema.sql` 에 있어 FK 가 강제된다. FK 위반이 라우트를 뚫을 경우 `backend/src/errors.js` 가 `SQLITE_CONSTRAINT_FOREIGNKEY` → 400 한국어로 매핑.
- **C2 범위 제외 (이월):** `GET /api/tasks?project_id=` 쿼리 필터, `TaskForm` 프로젝트 선택 드롭다운, `TaskList` 프로젝트 배지. `project_id` 는 현재 API(POST/PUT)로만 배선됨.

## 구현 현황 (2026-09-03, Phase C2)
- ✅ `tasks.project_id` API 배선 + 검증 (POST/PUT), API 응답 노출, 프로젝트 삭제 시 SET NULL 동작 (TC-PROJ-10)
- ⏳ 이월: `?project_id=` 필터, TaskForm 드롭다운, TaskList 배지
