// 캘린더(calendar) 서비스 계층 — FR-CAL-01
// - 데이터 원천은 `calendar_events` 캐시 테이블이다 (에이전트가 `agent/sync.py` 로 채운다, ADR-0011).
//   백엔드는 SELECT 만 한다 — 이 계층은 쓰기·외부 API 호출을 하지 않는다.
// - 캐시가 비어 있으면(동기화 전) 빈 목록을 준다. 그건 오류가 아니다.
// - 검증(400)은 라우트가 담당한다. 이 함수는 throw 하지 않는다.
// - 샘플/데모 데이터는 `scripts/seed-demo.js` 가 이 테이블에 직접 넣는다.

const db = require('../db');

// from/to (ISO8601 문자열, 선택) 로 필터해 start_time 오름차순으로 반환.
// - 범위 필터는 유효한 start_time 을 가진 항목에만 적용. 경계 포함. from/to 없으면 해당 방향 무제한.
// - start_time null/파싱불가 항목은 from/to 유무와 무관하게 항상 포함하고 목록 맨 뒤에 둔다.
// - from > to 면 유효 start_time 항목은 0건 (null 항목만 남음).
function listEvents({ from, to } = {}) {
  const fromMs = from != null ? Date.parse(from) : null;
  const toMs = to != null ? Date.parse(to) : null;

  const rows = db.getCalendarEvents();

  const filtered = rows.filter((e) => {
    const startMs = e.start_time != null ? Date.parse(e.start_time) : NaN;
    // start_time 이 null/파싱불가면 from/to 유무와 무관하게 항상 포함 (정렬에서 맨 뒤).
    if (Number.isNaN(startMs)) return true;
    if (fromMs != null && startMs < fromMs) return false;
    if (toMs != null && startMs > toMs) return false;
    return true;
  });

  return filtered.slice().sort((a, b) => {
    const am = a.start_time != null ? Date.parse(a.start_time) : NaN;
    const bm = b.start_time != null ? Date.parse(b.start_time) : NaN;
    const aNan = Number.isNaN(am);
    const bNan = Number.isNaN(bm);
    if (aNan && bNan) return 0;
    if (aNan) return 1; // null 은 맨 뒤
    if (bNan) return -1;
    return am - bm;
  });
}

module.exports = { listEvents };
