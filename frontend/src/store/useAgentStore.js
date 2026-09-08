// 에이전트 활동(agent) 전역 스토어 (zustand) — useBriefStore 패턴 복제 (P7, FR-AGENT-08)
// - 액션은 throw 하지 않는다. 에러는 한국어 문자열로 정규화해 store.error 에 담는다.
// - 성공하면 error 를 null 로 초기화한다. 실패해도 기존 activity 는 보존한다.
// - loaded: 최초 응답을 받았는지 여부(빈 상태 표시 구분용).
// - requesting: "지금 실행" 요청 진행 중 재진입 방어.

import { create } from 'zustand';
import { apiGet, apiPost } from '../api/client.js';

export const useAgentStore = create((set, get) => ({
  activity: null,
  loading: false,
  loaded: false,
  error: null,
  requesting: false,
  requestMessage: null,
  lastLimit: 10, // 마지막 조회에 실제로 쓴 limit (재조회 시 축소 방지)

  // 활동 데이터 조회 — 백엔드는 health 실패해도 200 을 준다.
  fetchActivity: async (limit = 10) => {
    set({ loading: true, lastLimit: limit });
    try {
      const data = await apiGet(`/agent/activity?limit=${encodeURIComponent(limit)}`);
      set({ activity: data, loaded: true, error: null });
    } catch (err) {
      set({ error: err && err.message ? err.message : '에이전트 활동을 불러오지 못했습니다.' });
    } finally {
      set({ loading: false });
    }
  },

  // "지금 실행" 요청 — 성공 시 활동을 다시 불러와 대기 상태를 반영한다.
  requestRun: async () => {
    if (get().requesting) return; // 재진입 방어
    set({ requesting: true, requestMessage: null });
    try {
      const data = await apiPost('/agent/run-now', {});
      set({
        // 데모 클라이언트는 응답에 note 를 담아준다. 있으면 그대로 노출한다.
        requestMessage:
          data.note ||
          (data.alreadyPending
            ? '이미 실행 요청이 대기 중입니다.'
            : '실행을 요청했습니다. 에이전트가 곧 실행합니다.'),
        error: null,
      });
      await get().fetchActivity(get().lastLimit ?? 10);
    } catch (err) {
      set({ error: err && err.message ? err.message : '지금 실행 요청에 실패했습니다.' });
    } finally {
      set({ requesting: false });
    }
  },

  clearError: () => set({ error: null }),
}));
