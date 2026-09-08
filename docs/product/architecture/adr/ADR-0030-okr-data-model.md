# ADR-0030: OKR 데이터 모델 + 주간 플래너

- 상태: **채택** (2026-09-08) — 개인 OS P8. 사용자 결정: PO-5 = 1급 엔티티, PO-6 = 순수 SQL 집계(Weekly Brief 후속). 초안대로 확정.
- 관련: [PERSONAL_OS.md](../../vision/PERSONAL_OS.md) T3, `requirements/OKR.md`(신규), FR-OKR-*(신규), [ADR-0011](ADR-0011-agent-backend-db-access.md), ADR-0018(마이그레이션), Phase 개인 OS P8

## 맥락
사용자 시각 참조에 **OKR 대시보드**가 명확히 있다: 스탯 타일 6개(KR 평균 달성률 84.4% ·
Objective 수 · Key Results 수 · 90% 이상 · 40~89.9% · 40% 미만) + 월별 KR 평균 달성률 라인차트.
추가로 "지난주 완료 / 이번주 예정 / 다음주" 할 일 요약(주간 플래너)을 원한다.

지금 `projects` 에 `progress`(0-100)만 있다.

## 결정

### PO-5 — OKR 은 1급 엔티티 (`objectives` + `key_results`), `projects` 와 별개
- `projects`(진행 중인 프로젝트, `progress`) 와 `objectives`(분기·연간 목표)는 목적이 달라
  재해석하지 않는다. `key_results` 는 objective 하위의 측정 가능한 결과.
- 필요 시 `key_results.project_id` 로 연결(선택, NULL 허용).

```sql
CREATE TABLE objectives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  period TEXT NOT NULL,              -- '2026-Q3' | '2026' (분기 또는 연간)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','done','archived')),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE key_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  objective_id INTEGER NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target REAL NOT NULL,              -- 목표값
  current REAL NOT NULL DEFAULT 0,   -- 현재값
  unit TEXT,                         -- '%' | '건' | 'kg' 등, NULL 허용
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE kr_snapshots (               -- 월별 라인차트용
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_result_id INTEGER NOT NULL REFERENCES key_results(id) ON DELETE CASCADE,
  month TEXT NOT NULL,              -- 'YYYY-MM'
  pct REAL NOT NULL,               -- 그 달 말 달성률 (0~1)
  UNIQUE(key_result_id, month)
);
```
- 달성률 = `clamp(current / target, 0, 1)`. Objective 달성률 = 하위 KR 평균.
- `kr_snapshots` 는 월 1회 백엔드(또는 에이전트)가 현재 달성률을 적재 → 월별 라인차트.

### PO-6 — 주간 플래너는 순수 집계, Weekly Brief 는 선택
- **주간 버킷:** `tasks.due_date` 를 ISO 주(월~일) 기준으로 지난주/이번주/다음주 3버킷.
  `GET /api/planner/weekly` → `{ lastWeek: {done, total}, thisWeek: {done, total, items}, nextWeek: {total, items} }`.
  전부 SQL 집계 — Claude 불필요.
- **Weekly Brief(선택, 나중):** Daily Brief 인프라 재사용해 "이번 주 요약 + 다음 주 제안"
  텍스트 생성. `briefs` 에 `type` 컬럼 또는 별도 `weekly_briefs`. 이번 결정 범위 밖 — OKR.md 에 후속.

### API (읽기 전용, 백엔드 소유 — objectives/key_results 는 사용자가 앱에서 CRUD)
- `GET /api/okr` → objectives + 하위 KR + 계산된 달성률 + 구간 카운트
- `GET /api/okr/trend` → `kr_snapshots` 월별
- `POST/PUT/DELETE /api/okr/objectives`, `.../key-results` (CRUD)
- `GET /api/planner/weekly`

## 결과 / 트레이드오프
- 새 테이블 3개 + 마이그레이션(ADR-0018). `projects` 와의 관계는 느슨(NULL 허용 FK).
- OKR CRUD 는 사용자가 앱에서 — 에이전트가 만들지 않는다(자동 분류와 다름).
- 차트 라이브러리 결정(PO-8)은 P2 디자인에서.
- 조직 정렬·CFR·평가 사이클은 범위 밖(PERSONAL_OS §6).

## 채택 시 영향
`backend/db/schema.sql`(+3 테이블), `backend/db/index.js`(멱등), `backend/src/{db,routes,services}`(okr·planner),
`agent/`(월별 스냅샷 — 선택), `requirements/OKR.md`(신규 + FR-OKR-*), `TRACEABILITY.md`, `DATA_DICTIONARY.md`,
`frontend`(OkrWidgetView·PlannerWidgetView·스탯 타일·라인차트), `DESIGN.md`.
