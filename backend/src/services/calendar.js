// ⚠️ 더미 데이터 (Phase C3). D2 에서 calendar_events 캐시로 교체.
// - 이 계층은 calendar_events 테이블을 읽지도 쓰지도 않는다 (ADR-0011). 스키마 변경 없음.
// - 더미 생성·from/to 필터·정렬은 모두 로컬 Date getter 기준, 직렬화만 toISOString().
// - 검증(400)은 라우트가 담당한다. 이 함수는 throw 하지 않는다.

// 호출 시점의 로컬 자정을 기준으로 상대 더미 6건을 만든다.
function buildDummyEvents() {
  const now = new Date();
  const createdAt = now.toISOString();

  // 로컬 자정(오늘 00:00)
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // days 일 뒤 h시 m분(로컬)의 Date 를 만든다
  const at = (days, h, m) =>
    new Date(midnight.getFullYear(), midnight.getMonth(), midnight.getDate() + days, h, m);

  // [상대일, 시작시, 시작분, 지속(분), 제목, location]
  const specs = [
    [0, 9, 30, 60, '오전 팀 스탠드업', '회의실 A'],
    [0, 14, 0, 90, '설계 리뷰', ''],
    [1, 11, 0, 60, '치과 예약', '시청역 치과'],
    [2, 16, 30, 45, '도서관 책 반납', null],
    [4, 19, 0, 120, '친구 저녁 약속', '강남'],
  ];

  const events = specs.map(([days, h, m, dur, title, location], i) => {
    const start = at(days, h, m);
    const end = new Date(start.getTime() + dur * 60 * 1000);
    return {
      id: i + 1,
      // TODO(D2): "dummy-N@local" → 실제 Google 이벤트 id 로 대체
      event_id: `dummy-${i + 1}@local`,
      title,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      location: location,
      synced_at: createdAt,
    };
  });

  // 시간 미정 1건 (start_time null)
  events.push({
    id: 6,
    event_id: 'dummy-6@local',
    title: '이사 준비 (일정 조율 중)',
    start_time: null,
    end_time: null,
    location: null,
    synced_at: createdAt,
  });

  return events;
}

// from/to (ISO8601 문자열, 선택) 로 필터해 start_time 오름차순으로 반환.
// - 범위 필터는 유효한 start_time 을 가진 항목에만 적용. 경계 포함. from/to 없으면 해당 방향 무제한.
// - start_time null/파싱불가 항목은 from/to 유무와 무관하게 항상 포함하고 목록 맨 뒤에 둔다.
// - from > to 면 유효 start_time 항목은 0건 (null 항목만 남음).
// TODO(D2): 더미 → db.getCalendarEvents() (agent 가 채운 calendar_events 캐시). 응답 계약 그대로.
function listEvents({ from, to } = {}) {
  const fromMs = from != null ? Date.parse(from) : null;
  const toMs = to != null ? Date.parse(to) : null;

  const filtered = buildDummyEvents().filter((e) => {
    const startMs = e.start_time != null ? Date.parse(e.start_time) : NaN;
    // start_time 이 null/파싱불가면 from/to 유무와 무관하게 항상 포함 (정렬에서 맨 뒤).
    // 범위 필터는 유효한 start_time 을 가진 항목에만 적용한다 (FR-CAL AC-8).
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
