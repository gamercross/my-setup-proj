// 대시보드 레이아웃 스토어 (zustand) — ADR-0020 / ADR-0021
// - instances 만 영속(localStorage, 300ms 디바운스). editMode·focusedId 는 세션 전용.
// - 인스턴스 id === 타입 id (타입당 1개 — DO-2). 같은 타입 중복 추가는 무시한다.
// - 필드별 개별 셀렉터로만 구독할 것 (객체 리터럴 셀렉터 금지).

import { create } from 'zustand';
import { getWidgetMeta } from '../widgets/registry.js';
import { defaultInstances, saveLayout } from '../widgets/layoutStorage.js';

// 최상위 z 값
function maxZ(instances) {
  return instances.reduce((m, w) => Math.max(m, w.z ?? 0), 0);
}

// 최하단(다음 위젯을 놓을 y)
function bottomY(instances) {
  return instances.reduce((m, w) => Math.max(m, (w.y ?? 0) + (w.h ?? 1)), 0);
}

// 영속화 — 모듈 스코프 타이머로 300ms 디바운스
let persistTimer = null;
function persist(instances) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    saveLayout(instances);
  }, 300);
}

export const useLayoutStore = create((set, get) => ({
  instances: [],
  editMode: false,
  focusedId: null,

  // 초기 하이드레이션 (WidgetShell 이 마운트 시 1회 호출)
  setInstances: (list) => {
    set({ instances: Array.isArray(list) ? list : [] });
    persist(get().instances);
  },

  // 위젯 추가 — 이미 같은 타입이 있으면 무시
  addWidget: (type) => {
    const meta = getWidgetMeta(type);
    if (!meta) return;
    const { instances } = get();
    if (instances.some((w) => w.type === type)) return;
    const next = [
      ...instances,
      {
        id: type,
        type,
        x: 0,
        y: bottomY(instances),
        w: meta.defaultSize.w,
        h: meta.defaultSize.h,
        z: maxZ(instances) + 1,
        minimized: false,
        config: {},
      },
    ];
    set({ instances: next });
    persist(next);
  },

  // 위젯 제거
  removeWidget: (id) => {
    const next = get().instances.filter((w) => w.id !== id);
    set({ instances: next, focusedId: get().focusedId === id ? null : get().focusedId });
    persist(next);
  },

  // 최소화 토글 — 최소화 시 현재 h 를 prevH 로 보관, 복원 시 prevH 사용
  toggleMinimize: (id) => {
    const next = get().instances.map((w) => {
      if (w.id !== id) return w;
      if (w.minimized) {
        const restoreH = w.prevH ?? getWidgetMeta(w.type)?.defaultSize.h ?? 4;
        return { ...w, minimized: false, h: restoreH, prevH: undefined };
      }
      return { ...w, minimized: true, prevH: w.h, h: 1 };
    });
    set({ instances: next });
    persist(next);
  },

  // RGL onLayoutChange 반영 — {i,x,y,w,h} 만 병합, 나머지 필드 보존. 최소화 항목은 h 무시.
  setLayout: (rglLayout) => {
    if (!Array.isArray(rglLayout)) return;
    const byId = new Map(rglLayout.map((l) => [l.i, l]));
    const next = get().instances.map((w) => {
      const l = byId.get(w.id);
      if (!l) return w;
      return {
        ...w,
        x: l.x,
        y: l.y,
        w: l.w,
        h: w.minimized ? w.h : l.h,
      };
    });
    set({ instances: next });
    persist(next);
  },

  // 클릭한 위젯을 맨 앞으로 + 포커스
  bringToFront: (id) => {
    const { instances, focusedId } = get();
    if (focusedId === id) {
      // z 만 이미 최상위면 불필요한 갱신 방지
      const top = maxZ(instances);
      const target = instances.find((w) => w.id === id);
      if (target && target.z === top) return;
    }
    const top = maxZ(instances) + 1;
    const next = instances.map((w) => (w.id === id ? { ...w, z: top } : w));
    set({ instances: next, focusedId: id });
    persist(next);
  },

  // config 부분 갱신 (C5 에는 호출부 없음 — C6 표시옵션/테마용 액션만 준비)
  updateConfig: (id, patch) => {
    const next = get().instances.map((w) =>
      w.id === id ? { ...w, config: { ...w.config, ...patch } } : w
    );
    set({ instances: next });
    persist(next);
  },

  // 편집 모드 토글 (평소 잠금 — DO-5)
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),

  // 기본 레이아웃으로 초기화
  resetLayout: () => {
    const next = defaultInstances();
    set({ instances: next, focusedId: null });
    persist(next);
  },
}));
