// OKR 전역 스토어 (zustand) — useTaskStore/useAgentStore 규약 (P8, FR-OKR-06 AC-3)
// - 액션은 throw 하지 않는다. 에러는 한국어 문자열로 store.error 에 담는다.
// - 성공 시 error: null. 실패해도 기존 objectives/trend 는 보존한다.
// - 낙관적 갱신 + 실패 롤백. KR current 갱신 시 pct·summary 를 즉시 재계산한다.

import { create } from 'zustand';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client.js';
import { krPct, objectivePct, summarize, round3 } from './okrMath.js';

// objectives 트리에 pct 를 다시 채우고 summary 를 재계산한다.
function recompute(objectives) {
  const shaped = objectives.map((o) => {
    const keyResults = (o.keyResults || []).map((kr) => ({ ...kr, pct: round3(krPct(kr)) }));
    return { ...o, keyResults, pct: round3(objectivePct(keyResults)) };
  });
  const allKrs = shaped.flatMap((o) => o.keyResults);
  return { objectives: shaped, summary: summarize(allKrs, shaped.length) };
}

const msg = (err, fallback) => (err && err.message ? err.message : fallback);

export const useOkrStore = create((set, get) => ({
  objectives: [],
  summary: null,
  trend: [],
  loading: false,
  loaded: false,
  error: null,

  // 대시보드 조회 — 실패해도 기존 데이터 보존
  fetchOkr: async ({ includeArchived = false } = {}) => {
    set({ loading: true });
    try {
      const qs = includeArchived ? '?includeArchived=1' : '';
      const data = await apiGet(`/okr${qs}`);
      const objectives = Array.isArray(data.objectives) ? data.objectives : [];
      set({ ...recompute(objectives), loaded: true, error: null });
    } catch (err) {
      set({ error: msg(err, 'OKR 을 불러오지 못했습니다.') });
    } finally {
      set({ loading: false });
    }
  },

  // 월별 추이 조회
  fetchTrend: async () => {
    try {
      const data = await apiGet('/okr/trend');
      set({ trend: Array.isArray(data.points) ? data.points : [], error: null });
    } catch (err) {
      set({ error: msg(err, '추이를 불러오지 못했습니다.') });
    }
  },

  // 목표 추가 — 서버 id 를 받아 로컬 트리에 병합. boolean 반환.
  addObjective: async (payload) => {
    try {
      const data = await apiPost('/okr/objectives', payload);
      const next = [...get().objectives, { ...data.objective, keyResults: [] }];
      set({ ...recompute(next), error: null });
      return true;
    } catch (err) {
      set({ error: msg(err, '목표를 추가하지 못했습니다.') });
      return false;
    }
  },

  // 핵심 결과 추가 — 서버가 준 keyResult 를 해당 objective 아래에 병합.
  addKeyResult: async (payload) => {
    try {
      const data = await apiPost('/okr/key-results', payload);
      const kr = data.keyResult;
      const next = get().objectives.map((o) =>
        o.id === kr.objective_id ? { ...o, keyResults: [...(o.keyResults || []), kr] } : o
      );
      set({ ...recompute(next), error: null });
      return true;
    } catch (err) {
      set({ error: msg(err, '핵심 결과를 추가하지 못했습니다.') });
      return false;
    }
  },

  // 목표 수정 — 낙관적 + 실패 롤백
  updateObjective: async (id, patch) => {
    const prev = get().objectives;
    const optimistic = prev.map((o) => (o.id === id ? { ...o, ...patch } : o));
    set({ ...recompute(optimistic), error: null });
    try {
      const data = await apiPut(`/okr/objectives/${id}`, patch);
      const merged = get().objectives.map((o) =>
        o.id === id ? { ...o, ...data.objective } : o
      );
      set({ ...recompute(merged) });
      return true;
    } catch (err) {
      set({ ...recompute(prev), error: msg(err, '목표를 수정하지 못했습니다.') });
      return false;
    }
  },

  // 핵심 결과 수정 — 낙관적 + 롤백. current 갱신 시 pct·summary 즉시 재계산(recompute).
  updateKeyResult: async (id, patch) => {
    const prev = get().objectives;
    const optimistic = prev.map((o) => ({
      ...o,
      keyResults: (o.keyResults || []).map((kr) => (kr.id === id ? { ...kr, ...patch } : kr)),
    }));
    set({ ...recompute(optimistic), error: null });
    try {
      const data = await apiPut(`/okr/key-results/${id}`, patch);
      const merged = get().objectives.map((o) => ({
        ...o,
        keyResults: (o.keyResults || []).map((kr) =>
          kr.id === id ? { ...kr, ...data.keyResult } : kr
        ),
      }));
      set({ ...recompute(merged) });
      return true;
    } catch (err) {
      set({ ...recompute(prev), error: msg(err, '핵심 결과를 수정하지 못했습니다.') });
      return false;
    }
  },

  // 목표 삭제 — 낙관적(하위 KR 로컬 제거) + 롤백
  removeObjective: async (id) => {
    const prev = get().objectives;
    set({ ...recompute(prev.filter((o) => o.id !== id)), error: null });
    try {
      await apiDelete(`/okr/objectives/${id}`);
      return true;
    } catch (err) {
      set({ ...recompute(prev), error: msg(err, '목표를 삭제하지 못했습니다.') });
      return false;
    }
  },

  // 핵심 결과 삭제 — 낙관적 + 롤백
  removeKeyResult: async (id) => {
    const prev = get().objectives;
    const next = prev.map((o) => ({
      ...o,
      keyResults: (o.keyResults || []).filter((kr) => kr.id !== id),
    }));
    set({ ...recompute(next), error: null });
    try {
      await apiDelete(`/okr/key-results/${id}`);
      return true;
    } catch (err) {
      set({ ...recompute(prev), error: msg(err, '핵심 결과를 삭제하지 못했습니다.') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
