// 일일 브리핑(brief) 전역 스토어 (zustand) — useCalendarStore 패턴 복제
// - 액션은 throw 하지 않는다. 에러는 한국어 문자열로 정규화해 store.error 에 담는다.
// - 성공하면 error 를 null 로 초기화한다. 실패해도 기존 brief 는 보존한다.
// - loaded: 최초 응답을 받았는지 여부. brief === null 이 "미조회"와 "오늘 없음"을
//   겸하므로 빈 상태 표시는 loaded 로 구분한다.

import { create } from 'zustand';
import { apiGet } from '../api/client.js';

export const useBriefStore = create((set) => ({
  brief: null,
  loading: false,
  error: null,
  loaded: false,

  // 오늘 브리핑 조회 — 백엔드는 없으면 { brief: null } 로 200 응답한다 (ADR-0025)
  fetchBrief: async () => {
    set({ loading: true });
    try {
      const data = await apiGet('/brief/today');
      set({ brief: data.brief ?? null, loaded: true, error: null });
    } catch (err) {
      set({ error: err && err.message ? err.message : '브리핑을 불러오지 못했습니다.' });
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
