// 할일(tasks) 전역 스토어 (zustand)
// - 모든 액션은 throw 하지 않는다. 에러는 문자열로 정규화해 store.error 에 저장한다.
// - 성공하는 액션은 error 를 null 로 초기화한다 (FR-UI-04 AC-4).
// - 필드명은 백엔드 계약대로 snake_case 를 유지한다 (due_date 등).
//
// 정본(ADR-0028): { byId, order } 가 유일한 원본이고 tasks 는 listFrom(cache) 파생 미러다.
// ★ commit() 밖에서 tasks / byId / order 를 set 하지 말 것 — 세 필드가 항상 함께 움직여야 한다.

import { create } from 'zustand';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client.js';
import { toCache, listFrom, upsert, patchOne, removeOne } from './taskCache.js';
import { addTagTo, removeTagFrom } from './taskTags.js';

// 완료 여부 토글용 상태 반전
function flipStatus(status) {
  return status === 'done' ? 'todo' : 'done';
}

export const useTaskStore = create((set, get) => {
  // 캐시 + 파생 tasks 를 한 번의 set 으로 커밋한다 (유일한 set 경유지).
  const commit = (cache, extra) =>
    set({ byId: cache.byId, order: cache.order, tasks: listFrom(cache), ...extra });

  // 현재 캐시 스냅샷 (롤백용)
  const snapshot = () => ({ byId: get().byId, order: get().order });

  return {
    byId: {},
    order: [],
    tasks: [],
    loading: false,
    error: null,

    // 목록 조회 — 실패해도 기존 tasks 는 보존한다
    fetchTasks: async () => {
      set({ loading: true });
      try {
        const data = await apiGet('/tasks');
        commit(toCache(Array.isArray(data.tasks) ? data.tasks : []), { error: null });
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
        commit(upsert(snapshot(), data.task), { error: null });
        return true;
      } catch (err) {
        set({ error: err.message });
        return false;
      }
    },

    // 완료 토글 — 낙관적. 실패 시 롤백.
    toggleTask: async (id) => {
      const prev = snapshot();
      const target = prev.byId[id];
      if (!target) return;
      const nextStatus = flipStatus(target.status);
      commit(patchOne(prev, id, { status: nextStatus }), { error: null });
      try {
        const data = await apiPut(`/tasks/${id}`, { status: nextStatus });
        commit(upsert(snapshot(), data.task));
      } catch (err) {
        commit(prev, { error: err.message });
      }
    },

    // 부분 수정 — 낙관적. 성공 시 서버 반환 task 로 최종 치환.
    updateTask: async (id, patch) => {
      const prev = snapshot();
      commit(patchOne(prev, id, patch), { error: null });
      try {
        const data = await apiPut(`/tasks/${id}`, patch);
        commit(upsert(snapshot(), data.task));
      } catch (err) {
        commit(prev, { error: err.message });
      }
    },

    // 삭제 — 낙관적. 실패 시 order 스냅샷을 그대로 복원한다.
    removeTask: async (id) => {
      const prev = snapshot();
      if (!prev.byId[id]) return;
      commit(removeOne(prev, id), { error: null });
      try {
        await apiDelete(`/tasks/${id}`);
      } catch (err) {
        commit(prev, { error: err.message });
      }
    },

    // 태그 추가 — 낙관적. 성공 시 서버 반환 task 로 최종 치환. throw 안 함.
    addTag: async (id, tag) => {
      const prev = snapshot();
      const target = prev.byId[id];
      if (!target) return;
      commit(patchOne(prev, id, { tags: addTagTo(target, tag) }), { error: null });
      try {
        const data = await apiPost(`/tasks/${id}/tags`, { tag });
        commit(upsert(snapshot(), data.task));
      } catch (err) {
        commit(prev, { error: err.message });
      }
    },

    // 태그 삭제 — 낙관적. 실패 시 스냅샷 복원. throw 안 함.
    removeTag: async (id, tag) => {
      const prev = snapshot();
      const target = prev.byId[id];
      if (!target) return;
      commit(patchOne(prev, id, { tags: removeTagFrom(target, tag) }), { error: null });
      try {
        const data = await apiDelete(`/tasks/${id}/tags/${encodeURIComponent(tag)}`);
        commit(upsert(snapshot(), data.task));
      } catch (err) {
        commit(prev, { error: err.message });
      }
    },

    clearError: () => set({ error: null }),
  };
});
