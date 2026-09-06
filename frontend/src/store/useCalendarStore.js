// 캘린더(calendar) 전역 스토어 (zustand) — useProjectStore 패턴 복제
// - 모든 액션은 throw 하지 않는다. 에러는 문자열로 정규화해 store.error 에 저장한다.
// - 성공하는 액션은 error 를 null 로 초기화한다.
// - 필드명은 백엔드 계약대로 snake_case 를 유지한다 (start_time, event_id, synced_at 등).
// - 읽기 전용. 쓰기 액션 없음 (C3).

import { create } from 'zustand';
import { apiGet } from '../api/client.js';

// 기본 조회 구간: 로컬 오늘 00:00 ~ +7일 23:59:59
// (서버는 from/to 가 있어도 start_time 미정 일정은 항상 포함해 맨 뒤로 보낸다 — FR-CAL AC-8)
function weekRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59);
  return { from: from.toISOString(), to: to.toISOString() };
}

export const useCalendarStore = create((set) => ({
  events: [],
  loading: false,
  error: null,

  // 일정 조회 — 실패해도 기존 events 는 보존한다
  fetchEvents: async (range) => {
    set({ loading: true });
    try {
      const { from, to } = range || weekRange();
      const qs = new URLSearchParams({ from, to }).toString();
      const data = await apiGet(`/calendar/events?${qs}`);
      set({ events: Array.isArray(data.events) ? data.events : [], error: null });
    } catch (err) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
