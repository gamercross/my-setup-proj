// 기대정렬 체크인 전역 스토어 (zustand) — useOkrStore 규약 (개인 OS P10, ADR-0035)
// - 액션은 throw 하지 않는다. 에러는 한국어 문자열로 store.error 에 담는다.
// - 성공 시 error: null. 실패해도 기존 checkins 는 보존한다.
// - 낙관적 갱신 + 실패 롤백.

import { create } from 'zustand';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client.js';

const msg = (err, fallback) => (err && err.message ? err.message : fallback);

export const useCheckinStore = create((set, get) => ({
  checkins: [],
  loading: false,
  loaded: false,
  error: null,

  // 목록 조회 — 실패해도 기존 데이터 보존
  fetchCheckins: async ({ projectId, objectiveId } = {}) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams();
      if (projectId !== undefined) params.set('project_id', projectId === null ? 'none' : projectId);
      if (objectiveId !== undefined) params.set('objective_id', objectiveId === null ? 'none' : objectiveId);
      const qs = params.toString();
      const data = await apiGet(`/checkins${qs ? `?${qs}` : ''}`);
      set({ checkins: Array.isArray(data.checkins) ? data.checkins : [], loaded: true, error: null });
    } catch (err) {
      set({ error: msg(err, '체크인을 불러오지 못했습니다.') });
    } finally {
      set({ loading: false });
    }
  },

  // 체크인 추가 — 성공 시 배열 맨 앞에 삽입(최신순 유지). boolean 반환.
  addCheckin: async (payload) => {
    try {
      const data = await apiPost('/checkins', payload);
      set({ checkins: [data.checkin, ...get().checkins], error: null });
      return true;
    } catch (err) {
      set({ error: msg(err, '체크인을 추가하지 못했습니다.') });
      return false;
    }
  },

  // 체크인 수정 — 낙관적 + 실패 롤백
  updateCheckin: async (id, patch) => {
    const prev = get().checkins;
    set({
      checkins: prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      error: null,
    });
    try {
      const data = await apiPut(`/checkins/${id}`, patch);
      set({ checkins: get().checkins.map((c) => (c.id === id ? { ...c, ...data.checkin } : c)) });
      return true;
    } catch (err) {
      set({ checkins: prev, error: msg(err, '체크인을 수정하지 못했습니다.') });
      return false;
    }
  },

  // 체크인 삭제 — 낙관적 + 실패 롤백
  removeCheckin: async (id) => {
    const prev = get().checkins;
    set({ checkins: prev.filter((c) => c.id !== id), error: null });
    try {
      await apiDelete(`/checkins/${id}`);
      return true;
    } catch (err) {
      set({ checkins: prev, error: msg(err, '체크인을 삭제하지 못했습니다.') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
