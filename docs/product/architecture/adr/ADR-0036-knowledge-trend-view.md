# ADR-0036: 지식 축적 추세·역량 지도 — 읽기 전용 파생 뷰

- 상태: **채택** (2026-09-15).
- 관련: `requirements/KNOWLEDGE.md`(신규, FR-KNOW-01~04), [ADR-0030](ADR-0030-okr-data-model.md)
  (OKR 데이터 모델·순수 SQL 집계 선례), [ADR-0029](ADR-0029-task-auto-category.md)(`task_tags`),
  [ADR-0035](ADR-0035-expectation-checkin.md)(`expectation_checkins`), `docs/REVERSE_PLAN.md` §5-3

## 맥락

`docs/REVERSE_PLAN.md` §5-3 정합성 감사는 §1-0 목적("완료율이 아니라 지식 — 지식이 쌓여 역량이
느는 방향을 한눈에")에 직접 답하는 화면이 없다고 지적했다("공백 2개" 중 하나). 그런데 이 목적을
뒷받침할 데이터는 이미 3곳에 흩어져 있다 — 언제 자기 점검을 했는지(`expectation_checkins`),
목표 달성률이 어떻게 변해왔는지(`kr_snapshots`), 무엇에 시간을 썼는지(`task_tags`). 없는 것은
**이 셋을 시계열로 종합해 한 화면에 보여주는 뷰**뿐이다. 새 테이블이나 새 입력 흐름을 만들
이유가 없다.

## 결정

### 1) 1급 기능으로 다룬다 — §1-0 목적·§5-3 공백에 직접 답한다
완료율(퍼센트 하나)이 아니라, 시간에 따라 지식이 쌓이는 **방향**(체크인 빈도 추세·OKR 달성률
추세·태그로 본 관심 분포)을 보여주는 것이 이 프로젝트의 핵심 주장이다. 그래서 "나중에 붙이는
부가 위젯"이 아니라 P11 단계의 1급 기능으로 명시한다.

### 2) 읽기 전용 파생 API — 새 테이블·컬럼 없음
`GET /api/knowledge-trend` 는 `expectation_checkins`·`kr_snapshots`·`task_tags` 를 조회만 한다.
새 테이블·컬럼·마이그레이션이 없으므로 `SCHEMA_VERSION` 상향도 없다(ADR-0035 §4 선례와 동일한
이유 — 여기서는 테이블 추가조차 없다).

### 3) 순수 SQL 집계, Claude 호출 없음
ADR-0030 의 주간 플래너("읽기 전용 SQL 집계. Claude 호출 없음")와 같은 이유다 — 집계는 결정적이고
저렴해야 하며, 매 조회마다 LLM 을 부르면 비용·지연·비결정성만 늘어난다.

### 4) 체크인은 주 단위, OKR 은 월 단위 — 비대칭을 그대로 둔다
체크인 빈도는 ISO 주(월요일 시작, `planner.js` 규약)로 버킷팅해 `weeks` 개를 항상 채운다. OKR 은
`kr_snapshots.month` 를 그대로 재사용해 월 단위로 둔다. 두 축의 해상도가 다른 것은 의도된
비대칭이다 — 새 "주간 KR 스냅샷" 로직을 만들면 적재 주체가 이원화되어 FR-OKR-04 AC-3(적재 주체는
`GET /api/okr/trend` 뿐)이 깨진다. 이 라우트는 `snapshotCurrentMonth()` 를 호출하지 않는다
(TC-KNOW-08 로 고정).

### 5) 태그는 `source` 무관 전량 집계
`task_tags.source`(`user`/`agent`, ADR-0029)는 분류 방식을 구분할 뿐 "지식이 쌓인 방향"이라는
질문에는 둘 다 동등하게 유효한 신호다. 필터링하지 않고 합산한다.

## API 계약

| 메서드 | 경로 | 동작 |
|---|---|---|
| GET | `/api/knowledge-trend` | 200 `{ window, checkins, okr, tags, summary }`. `?weeks=<1~26>`(기본 8) |

응답 스키마 전문은 `requirements/KNOWLEDGE.md` §데이터 계약 및 `API_REFERENCE.md` §지식 추세 참조.

## 대안 검토

- **주 단위 KR 스냅샷을 새로 신설** — 기각. `kr_snapshots` 적재 주체가 `GET /api/okr/trend` 하나로
  고정된 불변식(FR-OKR-04 AC-3)을 깨고, 월간 스냅샷과 주간 스냅샷이 공존하면 어느 쪽이 "진짜
  달성률"인지 혼란만 커진다. 월 단위 그대로 두고 체크인만 주 단위로 세밀화하는 편이 데이터 성격에
  맞다(체크인은 자주 남기지만 OKR 현재치는 자주 갱신되지 않는다).
- **에이전트(Claude)가 추세 요약 문장을 생성** — 기각. 비용·비결정성이 따르고, §1-0 목적은 "숫자를
  보여달라"이지 "해설을 써달라"가 아니다. 필요해지면 후속 기능으로 이 API 위에 얹을 수 있다.
- **새 위젯 대신 기존 OKR·체크인 위젯에 탭을 추가** — 기각. 세 데이터를 한 화면에서 종합해 보는
  것 자체가 요구사항이라, 기존 위젯에 억지로 끼워 넣으면 각 위젯의 단일 책임(ADR-0020 위젯 계약)이
  흐려진다.

## 결과 / 트레이드오프

- 새 테이블 0개, 마이그레이션 0건. 읽기 전용이라 쓰기 경합·트랜잭션 고려가 없다.
- 체크인(주)·OKR(월) 해상도 비대칭은 UI 가 두 차트를 분리해 표시하는 것으로 흡수한다 — 하나의
  라인차트에 억지로 합치지 않는다.
- 태그 집계는 창(`weeks`) 안에서 부착된 것만 본다 — `task_tags.created_at` 이 있어야 정확하다
  (있음, ADR-0029). 데모 모드는 데모 태스크에 태그별 부착 시각이 없어 전부 창 안으로 간주한다
  (ADR-0026, "보여주기" 목적과 일치하는 근사).

## 채택 시 영향

`backend/src/db.js`(`getCheckinCountsByWeek`·`getTagCountsInRange`·`getKrTrendFrom` + prepared
statement 3개), `backend/src/services/knowledgeTrend.js`(신규), `backend/src/routes/knowledgeTrend.js`
(신규), `backend/src/routes/api.js`(`/knowledge-trend` 마운트), `frontend/src/store/useKnowledgeStore.js`
(신규), `frontend/src/widgets/views/KnowledgeWidgetView.jsx`(신규), `frontend/src/components/
{LineChart.jsx,linePath.js}`(하위 호환 옵션 확장), `frontend/src/widgets/{registry,defaultLayout,
widgetMeta,topics}.js`(위젯·주제 등록), `frontend/src/components/TopicIcons.jsx`(아이콘),
`frontend/src/api/demoClient.js`(데모 패리티, 신규 시드 배열 없음), `requirements/KNOWLEDGE.md`(신규),
`REQUIREMENTS_FUNCTIONAL.md`, `TRACEABILITY.md`, `API_REFERENCE.md`, `UI_SPEC.md`, `TEST_PLAN.md`,
`docs/REVERSE_PLAN.md`(§5·§5-3·§6-1·§6-2 갱신).
