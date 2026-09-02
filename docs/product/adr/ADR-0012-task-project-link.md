# ADR-0012: 할일–프로젝트 연결 (`tasks.project_id`)

- 상태: **제안** (2026-09-02) — 결정 필요, FR-PROJ 세부화(Week 4) 시
- 관련: FR-PROJ, FR-TASK, [DATA_DICTIONARY.md](../DATA_DICTIONARY.md)

## 맥락
현재 `tasks` 와 `projects` 는 무관하다. 할일을 프로젝트에 소속시킬지 정해야 한다. GLOSSARY 는 "프로젝트 = 여러 할일을 묶는 상위 단위" 로 정의한다.

## 제안
**Week 4 에 `tasks.project_id INTEGER REFERENCES projects(id)` (NULL 허용) 추가.** NULL 이면 "프로젝트 없음(단독 할일)".

## 근거
- 정의상 이미 상위/하위 관계다.
- NULL 허용이면 기존 할일·단독 할일과 호환.
- 프로젝트 진행도(`progress`)를 하위 할일 완료율로 자동 계산할 여지가 생긴다(선택).

## 미결
- 지금 추가할지, 실제 UI 요구가 나올 때 추가할지 (YAGNI 관점).
- 프로젝트 삭제 시 하위 할일 처리: `SET NULL` vs `CASCADE` vs 삭제 차단.
- `progress` 를 수동 입력으로 둘지, 할일 완료율로 자동 계산할지.

## 결정 시 영향
- `schema.sql`, `db.js`(`addTask`/`updateTask` 허용 필드), API_REFERENCE(`POST /api/tasks` 필드), 필터(`GET /api/tasks?project_id=`).
