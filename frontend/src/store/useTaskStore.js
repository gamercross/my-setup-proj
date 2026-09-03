// 할일(tasks) 전역 스토어 (zustand)
// - 모든 액션은 throw 하지 않는다. 에러는 문자열로 정규화해 store.error 에 저장한다.
// - 성공하는 액션은 error 를 null 로 초기화한다 (FR-UI-04 AC-4).
// - 필드명은 백엔드 계약대로 snake_case 를 유지한다 (due_date 등).

import { create } from 'zustand';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client.js';

// 완료 여부 토글용 상태 반전
function flipStatus(status) {
  return status === 'done' ? 'todo' : 'done';
}

export const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  // 목록 조회 — 실패해도 기존 tasks 는 보존한다
  fetchTasks: async () => {
    set({ loading: true });
    try {
      const data = await apiGet('/tasks');
      set({ tasks: Array.isArray(data.tasks) ? data.tasks : [], error: null });
    } catch (err) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  // 생성 — 성공 시 목록 끝에 append. 성공 여부 boolean 반환.
  addTask: async (payload) => {
    try {
      const data = await apiPost('/tasks', payload);
      set((s) => ({ tasks: [...s.tasks, data.task], error: null }));
      return true;
    } catch (err) {
      set({ error: err.message });
      return false;
    }
  },

  // 완료 토글 — 낙관적. 실패 시 롤백.
  toggleTask: async (id) => {
    const prev = get().tasks;
    const target = prev.find((t) => t.id === id);
    if (!target) return;
    const nextStatus = flipStatus(target.status);
    set({
      tasks: prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t)),
      error: null,
    });
    try {
      const data = await apiPut(`/tasks/${id}`, { status: nextStatus });
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? data.task : t)) }));
    } catch (err) {
      set({ tasks: prev, error: err.message });
    }
  },

  // 부분 수정 — 낙관적. 성공 시 서버 반환 task 로 최종 치환.
  updateTask: async (id, patch) => {
    const prev = get().tasks;
    set({
      tasks: prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      error: null,
    });
    try {
      const data = await apiPut(`/tasks/${id}`, patch);
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? data.task : t)) }));
    } catch (err) {
      set({ tasks: prev, error: err.message });
    }
  },

  // 삭제 — 낙관적. 실패 시 원래 인덱스에 복원.
  removeTask: async (id) => {
    const prev = get().tasks;
    const idx = prev.findIndex((t) => t.id === id);
    if (idx === -1) return;
    set({ tasks: prev.filter((t) => t.id !== id), error: null });
    try {
      await apiDelete(`/tasks/${id}`);
    } catch (err) {
      const restored = get().tasks.slice();
      restored.splice(idx, 0, prev[idx]);
      set({ tasks: restored, error: err.message });
    }
  },

  clearError: () => set({ error: null }),
}));
