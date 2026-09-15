# FR-REF — 레퍼런스 자료 요약 절차 추적 상세 명세

> [REQUIREMENTS_FUNCTIONAL.md](REQUIREMENTS_FUNCTIONAL.md) 의 레퍼런스 자료 도메인 상세화.
> 결정 [../architecture/adr/ADR-0037-reference-summary-tracking.md](../architecture/adr/ADR-0037-reference-summary-tracking.md) (채택 2026-09-15).
> 데이터 [../reference/DATA_DICTIONARY.md](../reference/DATA_DICTIONARY.md) · API [../reference/API_REFERENCE.md](../reference/API_REFERENCE.md) · 화면 [../reference/UI_SPEC.md](../reference/UI_SPEC.md).

이 문서는 개인 생산성 OS **P12** 의 요구사항이다. 이 기능의 "왜"는 사용자가 직접 진술한 내용
(`my-setup-proj-story` 저장소 `RAW_STORIES.md` #7)에서 나왔다 — 자세한 맥락은 ADR-0037 §맥락 참조.

---

## 공통 규칙 (모든 FR-REF 적용)

- 저장소: 전용 테이블 2개 `reference_materials`(자료) + `reference_summary_steps`(요약 절차 이력),
  ADR-0037. 마이그레이션 상향 없음(`schema.sql` `CREATE TABLE IF NOT EXISTS` 만).
- 테이블명은 `reference_materials`(`REFERENCES` 가 SQLite 예약어라 회피)지만, API 경로·JSON 키는
  `references`/`reference` 를 그대로 쓴다 (ADR-0037 §결정2).
- `status` 는 4단계 enum `todo`/`reading`/`summarizing`/`done` (기본 `todo`).
- `due_date` 는 `YYYY-MM-DD` 형식만 허용한다(형식 오류는 400) — 목록 정렬이 계약의 일부이기 때문
  (ADR-0037 §결정5). `tasks.due_date` 보다 엄격하다.
- 요약 단계(`reference_summary_steps`)는 **추가·삭제만** — 수정(PUT) 엔드포인트는 없다
  (ADR-0037 §결정3). 삭제 후 `step_order` 를 재번호 매기지 않는다(§결정4).
- 서버는 요약 진행도(%) 같은 파생값을 계산·저장하지 않는다(ADR-0035 선례).
- 검증 실패 → HTTP 400 `{ "error": "<메시지>" }` (NFR-SEC-07).
- 존재하지 않는 레퍼런스 `id` → 404 `{ "error": "레퍼런스를 찾을 수 없습니다." }`,
  존재하지 않는 단계 `stepId` → 404 `{ "error": "요약 단계를 찾을 수 없습니다." }`.
- 비목표: 에이전트(Python/Claude) 자동 요약, Notion 연동 — 둘 다 이번 범위가 아니다(ADR-0037 §결정8).
- 웹 데모(ADR-0026): 아래 API 는 `frontend/src/api/demoClient.js` / `demoData.js` 인메모리
  목 어댑터에도 추가한다 — 안 하면 데모에서 레퍼런스 위젯이 깨진다.

---

## FR-REF-01 — 레퍼런스 생성

**사용자 스토리:** 사용자로서 나는 강의 자료·참고 문서를 제목·카테고리·자료 위치·마감일과 함께
등록하고 싶다.

**우선순위** P1 · **목표 주차** 개인 OS P12 · **상태** ⏳

### 수용 기준
- **AC-1** Given `{title:"강의자료 3주차"}`, When `POST /api/references`, Then 201 과
  `{reference}` 를 반환하고 `status` 는 `todo`, `steps` 는 `[]`, 나머지 선택 필드는 `null` 이다.
- **AC-2** Given `title` 미지정/공백/200자 초과, When 생성, Then 400.
- **AC-3** Given `due_date` 가 `YYYY-MM-DD` 형식이 아님, When 생성, Then 400
  `{error:"due_date 는 YYYY-MM-DD 형식이어야 합니다."}`.
- **AC-4** Given `status` 가 4값(`todo`/`reading`/`summarizing`/`done`) 밖, When 생성, Then 400.
- **AC-5** Given `project_id` 가 존재하지 않는 프로젝트를 가리킴, When 생성, Then 400
  `{error:"연결할 프로젝트를 찾을 수 없습니다."}`.
- **AC-6** Given `category` 40자 초과 또는 `location` 500자 초과, When 생성, Then 400.

### 입력·검증 규칙
| 필드 | 필수 | 타입 | 규칙 |
|---|:---:|---|---|
| `title` | ✓ | string | 트림 후 1~200자 |
| `category` | — | string\|null | 트림 후 40자 이하, 빈 값은 `null` |
| `location` | — | string\|null | 트림 후 500자 이하, 빈 값은 `null` |
| `due_date` | — | string\|null | `YYYY-MM-DD`, 빈 값은 `null` |
| `status` | — | enum | `todo`(기본)\|`reading`\|`summarizing`\|`done` |
| `project_id` | — | int\|null | 존재하는 프로젝트 또는 `null` (느슨 FK) |

### 관련
API `POST /api/references` · 데이터 `reference_materials` · [ADR-0012](../architecture/adr/ADR-0012-task-project-link.md)(프로젝트 FK 관례)

---

## FR-REF-02 — 레퍼런스 목록 조회

**사용자 스토리:** 사용자로서 나는 등록한 레퍼런스를 마감일 순으로 훑어보고, 카테고리·상태·
프로젝트로 걸러보고 싶다.

**우선순위** P1 · **목표 주차** 개인 OS P12 · **상태** ⏳

### 수용 기준
- **AC-1** When `GET /api/references`, Then 200 과 `{ references: [...] }` — 정렬은
  `(due_date IS NULL), due_date, id`(마감 임박 순, 마감 없는 건 맨 뒤).
- **AC-2** 각 레퍼런스 행에 `steps` 배열(그 자료의 요약 단계, `step_order` 오름차순)이 부착된다.
- **AC-3** Given `?category=<값>`, Then 그 카테고리만. `?status=<값>` 도 동일.
- **AC-4** Given `?project_id=<int>`, Then 그 프로젝트에 연결된 레퍼런스만. `?project_id=none`
  이면 연결 안 된 것만. 존재하지 않는 값(비정수·0 이하)이면 400.
- **AC-5** Given `?limit=<int>`, Then 그 개수만큼만 반환(기본 50).
- **AC-6** 레퍼런스가 0건이면 200 `{ references: [] }`.
- **AC-7** `GET /api/references/:id`(단건 조회 엔드포인트)는 제공하지 않는다 — 프런트는 단일
  캐시(목록)에서 찾는다(ADR-0028 관례).

### 관련
API `GET /api/references` · UI 레퍼런스 위젯(`ReferenceWidgetView`)

---

## FR-REF-03 — 레퍼런스 수정·삭제

**사용자 스토리:** 사용자로서 나는 등록한 레퍼런스의 정보(상태·마감일 등)를 고치거나, 더는
필요 없는 레퍼런스를 지우고 싶다.

**우선순위** P1 · **목표 주차** 개인 OS P12 · **상태** ⏳

### 수용 기준
- **AC-1** Given 레퍼런스, When `PUT /api/references/:id {status:"reading"}`, Then 보낸 필드만
  병합되고 `updated_at` 이 갱신된다.
- **AC-2** Given 레퍼런스, When `DELETE /api/references/:id`, Then 200 `{ok:true}` 이고 그
  레퍼런스에 딸린 요약 단계도 함께 삭제된다(`ON DELETE CASCADE`).
- **AC-3** 존재하지 않는 `id` → PUT/DELETE 둘 다 404.
- **AC-4** `project_id`/`due_date`/`status`/`category`/`location` 을 PUT 으로 바꿀 때도
  FR-REF-01 의 검증 규칙을 동일하게 적용한다.

### 관련
API `PUT/DELETE /api/references/:id`

---

## FR-REF-04 — 요약 절차 이력 추가·삭제

**사용자 스토리:** 사용자로서 나는 이 자료를 어떤 절차로 소화했는지("훑기 → 핵심 개념 추출 →
정리") 순서대로 짧게 남기고, 잘못 적었으면 그 단계만 지우고 싶다. 이미 남긴 단계 내용을 고쳐
쓰지는 않는다 — 이력이 왜곡되기 때문이다.

**우선순위** P1 · **목표 주차** 개인 OS P12 · **상태** ⏳ · **근거** [ADR-0037](../architecture/adr/ADR-0037-reference-summary-tracking.md) §결정3·4

### 수용 기준
- **AC-1** Given 레퍼런스, When `POST /api/references/:id/steps {note:"훑기"}`, Then 201 과
  갱신된 부모 행 전체 `{reference}`(steps 포함)를 반환하고, 새 단계의 `step_order` 는 그
  레퍼런스의 기존 단계 중 최댓값+1 이다.
- **AC-2** Given `note` 미지정/공백/2000자 초과, When 추가, Then 400.
- **AC-3** Given 존재하지 않는 레퍼런스 `id`, When 추가, Then 404 `{error:"레퍼런스를 찾을 수
  없습니다."}`.
- **AC-4** Given 레퍼런스와 그 레퍼런스에 속한 단계, When `DELETE /api/references/:id/steps/:stepId`,
  Then 200 과 갱신된 부모 행 전체 `{reference}` 를 반환하고, 남은 단계들의 `step_order` 는
  재번호를 매기지 않는다(그대로 유지).
- **AC-5** Given 존재하지 않는 `stepId`(또는 다른 레퍼런스에 속한 단계), When 삭제, Then 404
  `{error:"요약 단계를 찾을 수 없습니다."}`.
- **AC-6** 단계 수정(PUT) 엔드포인트는 존재하지 않는다.

### 입력·검증 규칙
| 필드 | 필수 | 타입 | 규칙 |
|---|:---:|---|---|
| `note` | ✓ | string | 트림 후 1~2000자 |

### 관련
API `POST /api/references/:id/steps`, `DELETE /api/references/:id/steps/:stepId` · 데이터 `reference_summary_steps`

---

## FR-REF-05 — 레퍼런스 위젯 (화면)

**사용자 스토리:** 사용자로서 나는 사이드바 PLAN 그룹의 "레퍼런스" 항목에서 자료를 등록하고,
카드를 펼쳐 요약 절차 이력을 확인·추가·삭제하고 싶다.

**우선순위** P1 · **목표 주차** 개인 OS P12 · **상태** ⏳ · **근거** [ADR-0032](../architecture/adr/ADR-0032-sidebar-shell-per-topic-layouts.md)(주제별 레이아웃)

### 수용 기준
- **AC-1** `reference` 위젯 뷰(`ReferenceWidgetView`): 레퍼런스 목록을 카드로 렌더링 — 접힘
  상태는 제목·카테고리 칩(`Chip`)·마감일·상태 칩·단계 개수, 펼침 상태는 자료 위치(링크 또는
  평문)·요약 절차 이력(`<ol>`)·단계 추가 폼·단계별 삭제 버튼을 보여준다.
- **AC-2** 상태 진행도는 `DotProgress` 로 표시하되(`todo`→0%, `reading`→33%, `summarizing`→66%,
  `done`→100%), 이 수치는 프런트 전용 계산이며 API 응답 스키마에는 없다.
- **AC-3** 상태 필터 바(`전체`/`할 일`/`읽는 중`/`요약 중`/`완료`)는 클라이언트 측 필터다 —
  필터를 바꿔도 재조회하지 않는다(ADR-0028 단일캐시 관례).
- **AC-4** 위젯 안에서 새 레퍼런스 폼을 제공한다(기본 접힘, "+ 새 레퍼런스" 버튼으로 펼침).
- **AC-5** 자료 위치(`location`)가 `http://`/`https://` 로 시작할 때만 링크(`target="_blank"
  rel="noreferrer"`)로 렌더한다. 그 외 값은 평문으로만 표시한다(스킴 주입 방지).
- **AC-6** 전용 스토어 `useReferenceStore` — 레퍼런스 수정·삭제는 낙관적 갱신 + 실패 롤백.
  요약 단계 추가·삭제는 서버가 갱신된 부모 행 전체를 돌려주므로 낙관적 갱신을 하지 않고 응답으로
  해당 레퍼런스 행을 그대로 치환한다.
- **AC-7** 4상태(로딩/비어있음/정상/에러)를 갖고, 위젯 에러가 셸·다른 위젯에 전파되지 않는다
  (FR-WIDGET-07, `ErrorBoundary`).
- **AC-8** 위젯은 라이트 테마 토큰(`var(--*)`)만 쓰고 하드코딩 hex 를 두지 않는다 (ADR-0027).
- **AC-9** 레지스트리(`widgets/registry.js`)에 `reference` 항목을 추가하면 셸 수정 없이 붙는다
  (FR-WIDGET-08). PLAN 주제 그룹(OKR·기대정렬·지식 지도 옆)에 기본 레이아웃을 등록한다.

### 관련
UI `ReferenceWidgetView` · 스토어 `useReferenceStore` · 컴포넌트 `Chip`·`DotProgress`·`StatTile`·
`ErrorBanner`(재사용, 신규 공용 컴포넌트 없음) · [UI_SPEC.md](../reference/UI_SPEC.md)

---

## FR-REF-06 — 프로젝트 연결 (선택)

**사용자 스토리:** 사용자로서 나는 레퍼런스를 특정 프로젝트에 연결해서, 이 자료가 어떤
작업을 위한 것인지 추적하고 싶다. 연결하지 않아도 독립된 학습 자료로 쓸 수 있어야 한다.

**우선순위** P2 · **목표 주차** 개인 OS P12 · **상태** ⏳

### 수용 기준
- **AC-1** Given 레퍼런스 생성/수정 시 `project_id` 미지정, Then `null` 로 저장되고 위젯은
  연결 칩 없이 표시한다.
- **AC-2** Given 연결된 프로젝트가 삭제됨, Then 레퍼런스의 `project_id` 는 `NULL` 로 바뀌고
  (`ON DELETE SET NULL`) 레퍼런스 자체는 삭제되지 않는다.
- **AC-3** 목록 조회 시 `?project_id` 필터(FR-REF-02 AC-4)로 특정 프로젝트에 연결된 레퍼런스만
  볼 수 있다.

### 관련
데이터 `reference_materials.project_id` · API `GET /api/references` 필터

---

## 데이터 계약 (ADR-0037 발췌 — 착수 시 DATA_DICTIONARY 로 이관)

```sql
CREATE TABLE reference_materials (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  category   TEXT,
  location   TEXT,
  due_date   TEXT,
  status     TEXT    NOT NULL DEFAULT 'todo'
             CHECK (status IN ('todo','reading','summarizing','done')),
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE reference_summary_steps (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_id INTEGER NOT NULL REFERENCES reference_materials(id) ON DELETE CASCADE,
  step_order   INTEGER NOT NULL,
  note         TEXT    NOT NULL,
  created_at   TEXT    NOT NULL
);
```

---

**작성:** 2026-09-15 (개인 OS P12 착수 전 선행 문서)
