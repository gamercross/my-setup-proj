# ADR-0035: 기대정렬 체크인 — 전용 테이블 1개 + 7질문 자유 서술

- 상태: **채택** (2026-09-14). 백엔드/프런트 계약은 planner 가 확정한 계약을 그대로 구현.
- 관련: `requirements/CHECKIN.md`(신규, FR-CHECKIN-01~05), [ADR-0030](ADR-0030-okr-data-model.md)(OKR 3테이블 선례),
  [ADR-0018](ADR-0018-schema-migration-strategy.md)(마이그레이션 최소안)

## 맥락

이 기능의 "왜"는 사용자가 직접 진술한 내용(`my-setup-proj-story` 저장소 `RAW_STORIES.md` #8·#9·#10·#11·#12)에서
나왔다.

- #8: "이 프로젝트에서 내가 어떤 도전이냐면 지금까지의 나의 공부에 대한 지식들을 모아서 내가 성장할 발판을
  만들고 이내용들이 추후 프로젝트를 해결해 감에 있어 모든 능력에 대한 피드백들을 정리하고 싶었어"
- #9: "언제까지 할것이냐면 내가 작업하는 모든 내용에 대해서 정리가 될때까지 해보고 싶어"
- #11: "기대정렬은 내가 뭘하고 있지, 이걸 왜하지?, 언제까지 할것인지?, 어떤 목표지?, 어떤 전략이지?, 무엇을
  구체적으로 할것인지?, 어떤 상태인지? 에 대한 모든 피드백 과정이 있어야해"

즉 이 기능은 성과를 채점하는 도구가 아니라, 스스로에게 7개 질문을 던지고 그 답을 시점별로 남겨 "내가 지금
뭘 왜 하고 있는지"를 주기적으로 점검하는 자기 서술 기록이다. 날짜를 강제하거나 점수를 매기면 원 진술의
"모든 피드백 과정"이라는 의도(자유로운 자기 점검)와 어긋난다.

## 결정

### 1) 전용 테이블 1개 — `expectation_checkins`
OKR(ADR-0030)이 목표·KR·스냅샷 3테이블로 나뉜 것과 달리, 체크인은 한 시점의 답변 묶음이 원자 단위이므로
분할할 이유가 없다. `period`(자유 라벨) + 7개 답변 컬럼(what/why/until/goal/strategy/action/status,
전부 nullable TEXT) + `project_id`/`objective_id`(선택적 연결, `ON DELETE SET NULL`) 하나로 구성한다.

### 2) period 는 자유텍스트, 날짜 강제 금지
`period`(예: "1주차", "2026-Q3")는 표시용 라벨일 뿐 파싱하거나 검증하지 않는다. 원 진술이 "언제까지
할것인지"를 질문 항목(`until`) 자체로 이미 받으므로, 레코드 자체에 시작/종료일 컬럼을 추가로 강제하면
중복이자 원 서술과 불일치하는 형식 강요가 된다.

### 3) 최소 1개 답변 필수
7개 질문(what~status) 모두 nullable 이지만, 전부 비어 있으면 "체크인"이라 부를 내용이 없다. API 검증에서
POST/PUT(병합 결과 기준) 둘 다 최소 1개 이상을 요구한다(400 "최소 한 개 질문에는 답해야 합니다.").

### 4) `SCHEMA_VERSION` 미상향
OKR 3테이블(ADR-0030) 선례와 동일하게, 신규 테이블 추가는 `schema.sql`(`CREATE TABLE IF NOT EXISTS`)에만
반영하고 `backend/db/index.js` 의 `PRAGMA user_version` 마이그레이션 경로는 건드리지 않는다(기존 DB 파일도
다음 부팅 시 `IF NOT EXISTS` 로 테이블이 자연히 추가된다 — 컬럼 추가가 아니라 테이블 추가라 ALTER 불필요).

### 5) 파생값·점수 계산 없음
"답변 개수 / 7" 같은 완성도 수치나 등급(OKR 의 `grade` 류)을 서버가 계산하지 않는다. 이 기능은 채점 도구가
아니라 서술 기록이다. 위젯이 답변 개수를 보여주더라도(`DotProgress`) 이는 순수 프런트 표시이며 API 응답
계약에는 없다.

## API 계약

| 메서드 | 경로 | 동작 |
|---|---|---|
| GET | `/api/checkins` | 최신순(`created_at DESC, id DESC`). `?project_id=<int\|none>` · `?objective_id=<int\|none>` · `?limit=<int>`(기본 50) |
| POST | `/api/checkins` | 201 `{ checkin }` |
| PUT | `/api/checkins/:id` | 200 `{ checkin }` (부분 병합) |
| DELETE | `/api/checkins/:id` | 200 `{ ok: true }` |

검증: 7개 답변 중 최소 1개 필수(비면 400), 없는 `project_id`/`objective_id` → 400, 없는 `id` → 404.
`action` 은 SQLite 예약어라 DDL·SQL 에서 항상 인용(`"action"`)하지만 응답 JSON 키는 `action` 그대로다
(`db.js` 의 `KR_COLS`·`current` 별칭 관례와 동일).

## 대안 검토

- **OKR 3테이블처럼 답변을 별도 테이블로 정규화** — 기각. 7개 답변은 한 시점에 함께 입력·조회되는 원자
  단위라 분할하면 조인만 늘고 얻는 이점이 없다.
- **period 를 날짜 컬럼(`start_date`/`end_date`)으로 강제** — 기각. 원 진술 어디에도 정해진 기간 형식이
  없고, `until` 질문이 이미 종료 조건을 자유 서술로 받는다.
- **완성도 점수를 서버에서 계산해 저장** — 기각. `kr_snapshots` 류의 "파생값은 저장하지 않는다" 관례와
  같은 이유로, 필요하면 조회 시(혹은 프런트에서) 계산한다. 지금은 그 요구조차 없다(원 진술은 점수화를
  요청하지 않았다).
- **`status` 컬럼을 다른 테이블처럼 enum CHECK 로 제약** — 기각. 이 `status` 는 "어떤 상태인지"라는
  자유 서술 답변이지 워크플로 상태 머신이 아니다. 다른 테이블의 enum `status`(tasks/projects/objectives)와
  이름만 같을 뿐 의미가 다르므로 CHECK 를 걸지 않는다.

## 결과 / 트레이드오프

- 신규 테이블 1개, 인덱스 3개(`created_at`·`project_id`·`objective_id`). 마이그레이션 상향 없음(4항).
- 위젯은 답변 개수 기반 진행 표시(`DotProgress`)를 프런트에서만 계산 — API 응답 스키마와 분리되어 있어
  향후 계산 로직이 바뀌어도 백엔드 변경이 필요 없다.
- `project_id`/`objective_id` 연결은 선택 사항이라, 프로젝트·목표 없이도 순수 자기 점검 기록으로 쓸 수
  있다(연결된 리소스가 삭제되면 `SET NULL`로 체크인 자체는 보존).

## 채택 시 영향

`backend/db/schema.sql`(`expectation_checkins` 테이블 + 인덱스 3개), `backend/src/db.js`(`CHECKIN_COLS`·
`CHECKIN_FIELDS`·prepared statement·`getCheckins`/`getCheckin`/`addCheckin`/`updateCheckin`/`deleteCheckin`),
`backend/src/services/checkins.js`(검증·정규화), `backend/src/routes/checkins.js`(CRUD 라우트),
`backend/src/routes/api.js`(`/checkins` 마운트), `frontend/src/store/useCheckinStore.js`(zustand,
낙관적 갱신), `frontend/src/widgets/views/CheckinWidgetView.jsx`(카드·폼), `frontend/src/widgets/registry.js`·
`widgetMeta.js`·`defaultLayout.js`·`topics.js`(위젯 등록), `frontend/src/components/TopicIcons.jsx`(아이콘),
`frontend/src/api/demoClient.js`·`demoData.js`(데모 패리티), `requirements/CHECKIN.md`(신규),
`REQUIREMENTS_FUNCTIONAL.md`, `TRACEABILITY.md`, `API_REFERENCE.md`, `DATA_DICTIONARY.md`, `UI_SPEC.md`,
`TEST_PLAN.md`.
