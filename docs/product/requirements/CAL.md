# FR-CAL — 캘린더/일정 상세 명세

> [REQUIREMENTS_FUNCTIONAL.md](REQUIREMENTS_FUNCTIONAL.md) 의 CAL 도메인 상세화.
> 용어 [GLOSSARY.md](../reference/GLOSSARY.md) · 데이터 [DATA_DICTIONARY.md](../reference/DATA_DICTIONARY.md) · API [API_REFERENCE.md](../reference/API_REFERENCE.md) · 화면 [UI_SPEC.md](../reference/UI_SPEC.md).
> 관련 결정: [ADR-0011](../architecture/adr/ADR-0011-agent-backend-db-access.md) (캘린더 동기화 — 백엔드는 `calendar_events` 캐시만 읽는다).

## 공통 규칙 (모든 FR-CAL 적용)

- **C3 (현재):** `GET /api/calendar/events` 는 `backend/src/services/calendar.js` 의 **더미 데이터**를 반환한다. `calendar_events` 테이블을 읽지도 쓰지도 않는다 (ADR-0011). 스키마 변경 없음.
- **D2 (이후):** agent 가 채운 `calendar_events` 캐시를 `db.getCalendarEvents()` 로 읽어 교체. 응답 계약은 그대로.
- 응답: 목록 `{ "events": [...] }`. 각 항목 snake_case: `id, event_id, title, start_time, end_time, location, synced_at`.
- 시각: `start_time`/`end_time`/`synced_at` 은 ISO8601. 더미 생성·`from`/`to` 필터·"오늘/내일" 판정은 모두 **로컬 Date getter** 기준, 직렬화만 `toISOString()`.
- 검증 실패 → HTTP 400 `{ "error": "<한국어 메시지>" }` (ADR-0017 선반영 없이 기존 포맷 유지).
- 읽기 전용. POST/PUT/DELETE 없음.

---

## FR-CAL-01 — 일정 목록 조회 API

**사용자 스토리:** 사용자로서 나는 다가오는 일정을 한 곳에서 보고 싶다.

**우선순위** P1 · **목표 주차** W5 · **상태** ✅ Phase C3 (2026-09-06) — 더미 데이터

### 수용 기준
- **AC-1** `GET /api/calendar/events` → 200 `{ "events": [...] }`, 각 항목 `id, event_id, title, start_time, end_time, location, synced_at` (API_REFERENCE 예시와 키 동일).
- **AC-2** `from`/`to`(ISO8601) 를 주면 `start_time` 이 그 구간(경계 포함)에 드는 일정만 반환.
- **AC-3** 결과는 `start_time` 오름차순. 조건에 맞는 일정이 없으면 200 (404 아님). **`from > to` 도 400 이 아니라 200** 이며 유효 `start_time` 일정은 0건. (범위 필터는 유효 `start_time` 항목에만 적용되므로 `start_time` 미정 항목은 AC-8 대로 결과에 남을 수 있다.)
- **AC-4** `from`/`to` 파싱 불가 → 400 `{ "error": "from 은 ISO8601 형식이어야 합니다." }` / `{ "error": "to 는 ISO8601 형식이어야 합니다." }`.
- **AC-5** 대시보드 캘린더 패널 4상태(로딩/빈/정상/에러). 에러 시 `ErrorBanner` + 재시도. 캘린더 API 실패가 할일·프로젝트 패널 렌더를 막지 않는다.

### 관련
API `GET /api/calendar/events` · 서비스 `backend/src/services/calendar.js` · UI `CalendarWidgetView`→`CalendarWidget` (C5: 위젯 셸) · 스토어 `useCalendarStore` · ADR-0011
TC: TC-CAL-01~07, TC-UI-17,19

---

## FR-CAL-02 — 캘린더 위젯 (날짜 배지 + 강조)

**사용자 스토리:** 사용자로서 나는 오늘·내일 일정을 시각적으로 구분해서 보고 싶다.

**우선순위** P1 · **목표 주차** W5 · **상태** ✅ Phase C3 (2026-09-06)

### 수용 기준
- **AC-6** `start_time` 이 로컬 오늘 → "오늘" 배지, 내일 → "내일" 배지, 그 외 `M/D`.
- **AC-7** 오늘/내일 항목은 좌측 accent 보더로 강조. 렌더 시점 로컬 날짜 기준.
- **AC-8** `start_time` 이 null/파싱불가 → "시간 미정" 표시, 목록 맨 뒤. 서비스는 `from`/`to` 유무와 무관하게 이 항목을 항상 결과에 포함한다 (범위 필터는 유효 `start_time` 항목에만 적용).
- `CalendarWidget` 은 props-only 프레젠테이션(`{ events }`). 스토어 직접 구독 금지. 4상태(로딩/빈/정상/에러)와 스토어 구독·`fetchEvents` effect 는 상위 뷰 `CalendarWidgetView` 가 소유하며(C5, ADR-0020) 위젯은 목록 렌더만 한다(빈 상태 분기 없음). 서버 정렬을 신뢰해 재정렬하지 않는다.

### 관련
UI `CalendarWidgetView` → `CalendarWidget`
TC: TC-CAL-02 (정렬·null 위치), TC-UI-18 (수동 — 배지·강조)

---

## FR-CAL-03 — Google Calendar 실제 동기화 (P1)

**상태** ⏳ D2 이월. agent 가 Google Calendar 를 폴링해 `calendar_events` 캐시를 채우고, API 는 더미 대신 캐시를 읽는다 (ADR-0011). 응답 계약 불변.

---

## 이월 / 알려진 트레이드오프

- **실제 캘린더 연동** — FR-CAL-03, D2.
- **`synced_at` UI 노출** — C3 에서는 응답 JSON 에만 포함, 화면 미노출.
- **CSS 변수화** — 위젯 인라인 style 유지. C6 에서 정리.

**작성:** 2026-09-06 (Phase C3)
