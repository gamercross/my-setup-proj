// 캘린더 위젯 (순수 프레젠테이션)
// - props 만 사용한다 ({ events }). store·fetch 를 참조하지 않는다.
// - 서버가 start_time 오름차순(+null 맨 뒤)을 보장하므로 여기서 재정렬하지 않는다.

import React from 'react';

// 두 Date 가 같은 로컬 날짜인지
function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// start_time(ISO) → '오늘' | '내일' | 'M/D' | '시간 미정'
function dayLabel(startISO, now) {
  if (startISO == null) return '시간 미정';
  const ms = Date.parse(startISO);
  if (Number.isNaN(ms)) return '시간 미정';
  const d = new Date(ms);

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (isSameLocalDay(d, now)) return '오늘';
  if (isSameLocalDay(d, tomorrow)) return '내일';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 배지 라벨 → accent 색
function accentFor(label) {
  if (label === '오늘') return '#f59e0b';
  if (label === '내일') return '#38bdf8';
  return '#334155';
}

// start_time(ISO) → 'HH:MM' (없으면 빈 문자열)
function timeLabel(startISO) {
  if (startISO == null) return '';
  const ms = Date.parse(startISO);
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function CalendarWidget({ events = [] }) {
  // 4상태(로딩/빈/정상/에러)는 Dashboard 가 소유한다. 여기서는 빈 배열이면 빈 컨테이너만 렌더.
  const list = Array.isArray(events) ? events : [];
  const now = new Date();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {list.map((e) => {
        const label = dayLabel(e.start_time, now);
        const accent = accentFor(label);
        const time = timeLabel(e.start_time);
        return (
          <div
            key={e.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              background: '#1e293b',
              borderLeft: `3px solid ${accent}`,
              borderRadius: '6px',
              fontSize: '13px',
            }}
          >
            <span style={{ color: '#94a3b8', minWidth: '42px' }}>{time || '—'}</span>
            <span style={{ flex: 1 }}>
              {e.title}
              {e.location ? (
                <span style={{ color: '#64748b' }}> · {e.location}</span>
              ) : null}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#0f172a',
                background: accent,
                borderRadius: '4px',
                padding: '2px 6px',
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
