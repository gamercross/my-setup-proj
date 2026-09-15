// 레퍼런스 자료 전역 스토어 (zustand) — useCheckinStore 규약 (개인 OS P12, ADR-0037)
// - 액션은 throw 하지 않는다. 에러는 한국어 문자열로 store.error 에 담는다.
// - 성공 시 error: null. 실패해도 기존 references 는 보존한다.
// - 수정·삭제는 낙관적 갱신 + 실패 롤백.
// - 요약 단계 추가/삭제는 서버가 갱신된 부모 행 전체를 돌려주므로 낙관적 갱신을 하지 않는다
//   (부분 상태를 직접 조립하면 step_order 계산 로직이 프런트에 중복된다).

import { create } from 'zustand';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client.js';

const msg = (err, fallback) => (err && err.message ? err.message : fallback);

export const useReferenceStore = create((set, get) => ({
  references: [],
  loading: false,
  loaded: false,
  error: null,

  // 목록 조회 — 실패해도 기존 데이터 보존
  fetchReferences: async ({ category, status, projectId } = {}) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams();
      if (category !== undefined) params.set('category', category);
      if (status !== undefined) params.set('status', status);
      if (projectId !== undefined) params.set('project_id', projectId === null ? 'none' : projectId);
      const qs = params.toString();
      const data = await apiGet(`/references${qs ? `?${qs}` : ''}`);
      set({ references: Array.isArray(data.references) ? data.references : [], loaded: true, error: null });
    } catch (err) {
      set({ error: msg(err, '레퍼런스를 불러오지 못했습니다.') });
    } finally {
      set({ loading: false });
    }
  },

  // 레퍼런스 추가 — 성공 시 배열 끝에 append. boolean 반환.
  addReference: async (payload) => {
    try {
      const data = await apiPost('/references', payload);
      set({ references: [...get().references, data.reference], error: null });
      return true;
    } catch (err) {
      set({ error: msg(err, '레퍼런스를 추가하지 못했습니다.') });
      return false;
    }
  },

  // 레퍼런스 수정 — 낙관적 + 실패 롤백
  updateReference: async (id, patch) => {
    const prev = get().references;
    set({
      references: prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      error: null,
    });
    try {
      const data = await apiPut(`/references/${id}`, patch);
      set({ references: get().references.map((r) => (r.id === id ? { ...r, ...data.reference } : r)) });
      return true;
    } catch (err) {
      set({ references: prev, error: msg(err, '레퍼런스를 수정하지 못했습니다.') });
      return false;
    }
  },

  // 레퍼런스 삭제 — 낙관적 + 실패 롤백
  removeReference: async (id) => {
    const prev = get().references;
    set({ references: prev.filter((r) => r.id !== id), error: null });
    try {
      await apiDelete(`/references/${id}`);
      return true;
    } catch (err) {
      set({ references: prev, error: msg(err, '레퍼런스를 삭제하지 못했습니다.') });
      return false;
    }
  },

  // 요약 단계 추가 — 서버가 부모 행 전체를 반환하므로 그 행을 그대로 치환한다.
  addStep: async (id, note) => {
    try {
      const data = await apiPost(`/references/${id}/steps`, { note });
      set({ references: get().references.map((r) => (r.id === id ? data.reference : r)), error: null });
      return true;
    } catch (err) {
      set({ error: msg(err, '요약 단계를 추가하지 못했습니다.') });
      return false;
    }
  },

  // 요약 단계 삭제 — 서버가 부모 행 전체를 반환하므로 그 행을 그대로 치환한다.
  removeStep: async (id, stepId) => {
    try {
      const data = await apiDelete(`/references/${id}/steps/${stepId}`);
      set({ references: get().references.map((r) => (r.id === id ? data.reference : r)), error: null });
      return true;
    } catch (err) {
      set({ error: msg(err, '요약 단계를 삭제하지 못했습니다.') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
