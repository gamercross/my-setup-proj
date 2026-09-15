# ADR-0037: 레퍼런스 자료 요약 절차 추적 — `reference_materials` + `reference_summary_steps`

- 상태: **채택** (2026-09-15). 백엔드/프런트 계약은 planner 가 확정한 계약을 그대로 구현.
- 관련: `requirements/REFERENCE.md`(신규, FR-REF-01~06), [ADR-0035](ADR-0035-expectation-checkin.md)
  (전용 테이블 선례·파생값 미계산 관례), [ADR-0030](ADR-0030-okr-data-model.md)(부모-자식 2테이블 선례),
  `docs/REVERSE_PLAN.md` §5-3(정합성 감사 마지막 공백)

## 맥락

`my-setup-proj-story` 저장소 `RAW_STORIES.md` #7 (`WEAK`, 대기):

> 강의나 내용 자료들은 언제하고 언제까지 완료해야할지 정하고 레프런스들은 카테고리로
> 정리하지만 이 내용들은 어떤 요약 절차를 밟았는지 확인이 필요해

지금 앱에는 강의 자료·참고 문서를 다루는 엔티티가 전혀 없다. 사용자가 원한 것은 세 가지다.

1. 카테고리로 정리
2. "언제까지 볼지" 마감
3. 그 자료를 **어떤 요약 절차로 소화했는지** 이력 추적

①②는 다른 도메인(tasks/projects)에도 있는 흔한 패턴이지만, ③이 REVERSE_PLAN §1-0 목적("경험을 지식으로")에
직접 답하는 핵심 갭이다. 단순히 "완료" 체크박스 하나로는 "어떤 절차를 밟았는지"가 사라진다 — 그래서 이력을
남기는 별도 하위 리소스가 필요하다.

## 결정

### 1) 부모-자식 2테이블 — `reference_materials` + `reference_summary_steps`
체크인(ADR-0035)처럼 원자 단위 1테이블로 묶을 수 없다. 자료 1건에 요약 절차가 여러 건 쌓이는 1:N 구조이고,
"언제 그 단계를 거쳤는지"가 정보 자체이므로 OKR(ADR-0030)의 목표-KR 관계처럼 부모-자식으로 나눈다.

### 2) 테이블명은 `reference_materials` — API 경로/JSON 키는 `references`/`reference` 그대로
`REFERENCES` 는 SQLite 예약어라 테이블명으로 쓸 수 없다. 이름 불일치가 생기지만, 응답 계약(경로·JSON 키)은
사용자·프런트가 보는 표면이므로 `references`/`reference` 를 그대로 쓰고, DB 내부 테이블명만
`reference_materials` 로 피한다(`key_results.current`/`"action"` 인용 관례와 같은 종류의 국지적 불일치).

### 3) 요약 단계는 추가·삭제만 — 수정 없음
"어떤 절차를 밟았는지"는 실제로 밟은 순서의 기록이다. 사후에 내용을 고쳐 쓰면 이력이 아니라 편집된 서술이
된다. 그래서 PUT(단계 수정) 엔드포인트를 만들지 않는다 — 잘못 적었으면 삭제 후 다시 추가한다.

### 4) 단계 삭제 후 `step_order` 재번호 매기지 않는다
삭제된 단계의 순번을 남은 행에 당겨 채우면 "3단계였던 게 실은 2단계였다"는 왜곡이 생긴다. 삭제는 그
자리를 비워 둔 채 이력만 지운다. 다음 추가 단계의 순번은 `MAX(step_order)+1`(남은 행 기준)로 계산하므로
삭제된 번호가 나중에 재사용될 수 있다 — 이것도 "재번호를 강제로 매기지 않는다"는 것과 모순되지 않는다
(과거 행을 건드리지 않을 뿐, 새 삽입값의 전역 유일성까지 보장하지는 않는다).

### 5) `due_date` 형식을 엄격히 검증한다 (`YYYY-MM-DD` 아니면 400)
`tasks.due_date` 는 형식을 강제하지 않지만, 레퍼런스는 "언제까지 완료해야 할지"가 원 진술의 핵심 요구이고
목록 정렬(`ORDER BY (due_date IS NULL), due_date, id`)이 API 계약의 일부다. 형식이 흔들리면 정렬이 깨지므로
여기서는 정규식(`/^\d{4}-\d{2}-\d{2}$/`)으로 막는다.

### 6) `SCHEMA_VERSION` 미상향
ADR-0030·0035 선례와 동일 — 신규 테이블 2개는 `schema.sql`(`CREATE TABLE IF NOT EXISTS`)에만 반영하고
`backend/db/index.js` 의 마이그레이션 경로는 건드리지 않는다.

### 7) 파생값(요약 진행도 %) 서버 미계산
ADR-0035 §5 관례 그대로 — `status`(4단계: todo/reading/summarizing/done)를 프런트가 `DotProgress` 점 개수로
환산해 보여줄 뿐, API 응답에는 진행률 필드가 없다.

### 8) 비목표 — 에이전트 자동 요약 없음
Python 에이전트(Claude)가 자료를 읽고 자동으로 요약 단계를 채우는 기능은 이번 범위가 아니다. 사용자가 직접
"이번에 뭘 했는지"를 짧게 남기는 수동 이력이다. Notion 연동도 하지 않는다.

## API 계약

| 메서드 | 경로 | 동작 |
|---|---|---|
| GET | `/api/references` | 200 `{ references: [...] }` (각 행에 `steps` 배열). `?category=`·`?status=`·`?project_id=<int\|none>`·`?limit=`(기본 50) |
| POST | `/api/references` | 201 `{ reference }` |
| PUT | `/api/references/:id` | 200 `{ reference }` (부분 병합) |
| DELETE | `/api/references/:id` | 200 `{ ok: true }` (steps 는 CASCADE) |
| POST | `/api/references/:id/steps` | 201 `{ reference }` — 갱신된 부모 행 전체 반환 |
| DELETE | `/api/references/:id/steps/:stepId` | 200 `{ reference }` |

`GET /api/references/:id` 는 만들지 않는다(목록으로 충분, 프런트는 단일캐시에서 찾는다 — ADR-0028 관례).
정렬: 레퍼런스는 `(due_date IS NULL), due_date, id`, 단계는 `step_order, id`.

## 대안 검토

- **레퍼런스 1테이블에 `summary_log` TEXT 컬럼(자유 서술 누적)** — 기각. 단계별로 개별 삭제가 안 되고,
  "몇 단계인지" 개수·순서를 구조적으로 셀 수 없다.
- **`tasks` 테이블을 재사용해 레퍼런스를 표현** — 기각. `priority`/`status`(todo/in_progress/done) 의미가
  다르고, 요약 절차 이력이라는 1:N 구조 자체가 tasks 에 없다.
- **요약 단계도 PUT 으로 수정 허용** — 기각. §결정3 사유(이력 왜곡) 그대로.
- **삭제 시 `step_order` 재계산(재번호)** — 기각. §결정4 사유(과거 서술 왜곡) 그대로.

## 결과 / 트레이드오프

- 신규 테이블 2개, 인덱스 5개(`due_date`·`status`·`category`·`project_id`·`(reference_id, step_order)`).
  마이그레이션 상향 없음(§결정6).
- 테이블명(`reference_materials`)과 API 표면(`references`)의 불일치는 국지적이며, `db.js` 상수·주석에만
  영향을 준다 — 응답 계약을 보는 프런트/사용자는 이 차이를 알 필요가 없다.
- 요약 단계 삭제가 번호를 재사용할 수 있다는 점(§결정4)은 "단계 번호가 전역적으로 유일하다"는 기대를
  갖고 설계하면 안 된다는 제약으로 남는다 — 필요해지면 후속 ADR 에서 `id` 기반 정렬로 전환할 수 있다.

## 채택 시 영향

`backend/db/schema.sql`(`reference_materials`·`reference_summary_steps` 테이블 + 인덱스 5개),
`backend/src/db.js`(`REFERENCE_COLS`·`STEP_COLS`·`REFERENCE_FIELDS`·prepared statement 9종·
`attachSteps`/`attachStepsOne`·`getReferences`/`getReference`/`addReference`/`updateReference`/
`deleteReference`/`addReferenceStep`/`removeReferenceStep`), `backend/src/services/references.js`(검증·정규화),
`backend/src/routes/references.js`(CRUD + 단계 라우트), `backend/src/routes/api.js`(`/references` 마운트),
`frontend/src/store/useReferenceStore.js`(zustand, 낙관적 갱신), `frontend/src/widgets/views/ReferenceWidgetView.jsx`
(카드·폼·필터), `frontend/src/widgets/registry.js`·`widgetMeta.js`·`defaultLayout.js`·`topics.js`(PLAN 그룹
등록), `frontend/src/components/TopicIcons.jsx`(아이콘), `frontend/src/api/demoClient.js`·`demoData.js`
(데모 패리티), `requirements/REFERENCE.md`(신규), `REQUIREMENTS_FUNCTIONAL.md`, `TRACEABILITY.md`,
`API_REFERENCE.md`, `DATA_DICTIONARY.md`, `UI_SPEC.md`, `TEST_PLAN.md`, `docs/REVERSE_PLAN.md`(§5-3 공백
1→0).
