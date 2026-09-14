// 지식 축적 추세 전역 스토어 (zustand) — useCheckinStore 규약 (개인 OS P11, ADR-0036)
// - 읽기 전용 뷰라 액션은 fetchTrend 1개뿐이다.
// - 액션은 throw 하지 않는다. 에러는 한국어 문자열로 store.error 에 담는다.
// - 성공 시 error: null. 실패해도 기존 trend 는 보존한다.

import { create } from 'zustand';
import { apiGet } from '../api/client.js';

const msg = (err, fallback) => (err && err.message ? err.message : fallback);

export const useKnowledgeStore = create((set) => ({
  trend: null,
  loading: false,
  loaded: false,
  error: null,

  // 추세 조회 — 실패해도 기존 trend 보존
  fetchTrend: async ({ weeks } = {}) => {
    set({ loading: true });
    try {
      const qs = Number.isFinite(weeks) ? `?weeks=${weeks}` : '';
      const data = await apiGet(`/knowledge-trend${qs}`);
      set({ trend: data, loaded: true, error: null });
    } catch (err) {
      set({ error: msg(err, '지식 추세를 불러오지 못했습니다.') });
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
