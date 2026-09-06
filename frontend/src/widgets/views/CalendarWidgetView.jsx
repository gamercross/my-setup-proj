// 일정 위젯 뷰 — 스토어 구독·effect 는 이 뷰가 소유한다 (ADR-0020).
// - 기존 Dashboard.jsx 의 일정 섹션 로직을 그대로 옮겼다 (<h2> 제거).
// - CalendarWidget 은 순수 프레젠테이션이라 수정 없이 그대로 쓴다.
// - config.display.range 는 클라이언트 필터만 (C6). fetchEvents 인자·계약 불변.

import React, { useEffect, useMemo } from 'react';
import CalendarWidget, { isSameLocalDay } from '../../components/CalendarWidget';
import ErrorBanner from '../../components/ErrorBanner';
import { useCalendarStore } from '../../store/useCalendarStore.js';
import { resolveDisplay } from '../displayConfig.js';

export default function CalendarWidgetView({ config, configSchema }) {
  const events = useCalendarStore((s) => s.events);
  const calendarLoading = useCalendarStore((s) => s.loading);
  const calendarError = useCalendarStore((s) => s.error);
  const fetchEvents = useCalendarStore((s) => s.fetchEvents);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const d = resolveDisplay(configSchema, config?.display);
  const visible = useMemo(() => {
    const src = Array.isArray(events) ? events.slice() : [];
    if (d.range !== 'today') return src;
    const now = new Date();
    return src.filter((e) => {
      if (e.start_time == null) return false;
      const ms = Date.parse(e.start_time);
      if (Number.isNaN(ms)) return false;
      return isSameLocalDay(new Date(ms), now);
    });
  }, [events, d.range]);

  const showEventsLoading = calendarLoading && events.length === 0;
  // 에러 시에는 ErrorBanner 만 보이고 "일정이 없습니다" 문구는 억제
  const showEventsEmpty = !calendarLoading && visible.length === 0 && !calendarError;

  return (
    <div>
      {calendarError && <ErrorBanner message={calendarError} onRetry={fetchEvents} />}

      {showEventsLoading ? (
        <p style={{ color: 'var(--muted)' }}>불러오는 중…</p>
      ) : showEventsEmpty ? (
        <p style={{ color: 'var(--muted)' }}>일정이 없습니다</p>
      ) : (
        <CalendarWidget events={visible} />
      )}
    </div>
  );
}
