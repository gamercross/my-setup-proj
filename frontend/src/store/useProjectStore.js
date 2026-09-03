// 프로젝트(projects) 전역 스토어 (zustand) — useTaskStore 패턴 복제
// - 모든 액션은 throw 하지 않는다. 에러는 문자열로 정규화해 store.error 에 저장한다.
// - 성공하는 액션은 error 를 null 로 초기화한다.
// - 필드명은 백엔드 계약대로 snake_case 를 유지한다 (project_id, notion_id 등).

import { create } from 'zustand';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client.js';

export const useProjectStore = create((set, get) => ({
  projects: [],
  loading: false,
  error: null,

  // 목록 조회 — 실패해도 기존 projects 는 보존한다
  fetchProjects: async () => {
    set({ loading: true });
    try {
      const data = await apiGet('/projects');
      set({ projects: Array.isArray(data.projects) ? data.projects : [], error: null });
    } catch (err) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  // 생성 — 비낙관적. 성공 시 목록 끝에 append. 성공 여부 boolean 반환.
  addProject: async (payload) => {
    try {
      const data = await apiPost('/projects', payload);
      set((s) => ({ projects: [...s.projects, data.project], error: null }));
      return true;
    } catch (err) {
      set({ error: err.message });
      return false;
    }
  },

  // 부분 수정 — 낙관적. 성공 시 서버 반환 객체로 최종 치환, 실패 시 롤백.
  updateProject: async (id, patch) => {
    const prev = get().projects;
    set({
      projects: prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      error: null,
    });
    try {
      const data = await apiPut(`/projects/${id}`, patch);
      set((s) => ({ projects: s.projects.map((p) => (p.id === id ? data.project : p)) }));
    } catch (err) {
      set({ projects: prev, error: err.message });
    }
  },

  // 삭제 — 낙관적. 실패 시 원래 인덱스에 복원.
  removeProject: async (id) => {
    const prev = get().projects;
    const idx = prev.findIndex((p) => p.id === id);
    if (idx === -1) return;
    set({ projects: prev.filter((p) => p.id !== id), error: null });
    try {
      await apiDelete(`/projects/${id}`);
    } catch (err) {
      const restored = get().projects.slice();
      restored.splice(idx, 0, prev[idx]);
      set({ projects: restored, error: err.message });
    }
  },

  clearError: () => set({ error: null }),
}));
