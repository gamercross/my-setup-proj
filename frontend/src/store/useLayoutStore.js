// 대시보드 레이아웃 스토어 (zustand) — ADR-0020 / ADR-0021 / ADR-0032
// - instances 는 "현재 주제" 의 배열이다. 주제 맵 전체를 스토어에 들지 않는다(layoutStorage 가 소유).
// - instances 만 영속(localStorage, 300ms 디바운스). editMode·focusedId 는 세션 전용.
// - editMode 는 전역 세션 상태 — 주제를 바꿔도 초기화하지 않는다.
// - 인스턴스 id === 타입 id (한 주제 안에서 타입당 1개 — DO-2). 같은 타입 중복 추가는 무시한다.
// - 필드별 개별 셀렉터로만 구독할 것 (객체 리터럴 셀렉터 금지).

import { create } from 'zustand';
import { getWidgetMeta } from '../widgets/registry.js';
import {
  defaultInstancesFor,
  loadTopicLayout,
  saveTopicLayout,
} from '../widgets/layoutStorage.js';

// 최상위 z 값
function maxZ(instances) {
  return instances.reduce((m, w) => Math.max(m, w.z ?? 0), 0);
}

// 최하단(다음 위젯을 놓을 y)
function bottomY(instances) {
  return instances.reduce((m, w) => Math.max(m, (w.y ?? 0) + (w.h ?? 1)), 0);
}

// 영속화 — 모듈 스코프 타이머로 300ms 디바운스.
// 타이머 클로저가 "예약 시점의" topicId 를 캡처한다 → 주제를 바꾸는 순간
// 이전 주제 것이 다른 키로 새지 않는다.
let persistTimer = null;
let pendingTopicId = null;
let pendingInstances = null;

function flushPersist() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (pendingTopicId != null && pendingInstances != null) {
    saveTopicLayout(pendingTopicId, pendingInstances);
  }
  pendingTopicId = null;
  pendingInstances = null;
}

function persist(topicId, instances) {
  pendingTopicId = topicId;
  pendingInstances = instances;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(flushPersist, 300);
}

export const useLayoutStore = create((set, get) => ({
  instances: [],
  editMode: false,
  focusedId: null,
  topicId: null,

  // 주제 전환 (WidgetShell 이 topicId prop 변화 시 호출).
  setTopic: (topicId) => {
    if (get().topicId === topicId) return;
    // 1) 이전 주제의 pending 저장을 즉시 flush (이전 topicId 로).
    flushPersist();
    // 2) 저장값이 있으면 그걸로, 없으면 기본값으로 교체.
    const saved = loadTopicLayout(topicId);
    const usedDefault = !saved;
    const instances = saved ?? defaultInstancesFor(topicId);
    set({ instances, focusedId: null, topicId });
    // 3) 저장값이 없어 기본값을 쓴 경우에만 즉시 persist (첫 방문 스냅샷).
    if (usedDefault) persist(topicId, instances);
  },

  // 위젯 추가 — 현재 주제에 이미 같은 타입이 있으면 무시 (DO-2, 주제 스코프).
  addWidget: (type) => {
    const meta = getWidgetMeta(type);
    if (!meta) return;
    const { instances, topicId } = get();
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
    persist(topicId, next);
  },

  // 위젯 제거
  removeWidget: (id) => {
    const { topicId } = get();
    const next = get().instances.filter((w) => w.id !== id);
    set({ instances: next, focusedId: get().focusedId === id ? null : get().focusedId });
    persist(topicId, next);
  },

  // 최소화 토글 — 최소화 시 현재 h 를 prevH 로 보관, 복원 시 prevH 사용
  toggleMinimize: (id) => {
    const { topicId } = get();
    const next = get().instances.map((w) => {
      if (w.id !== id) return w;
      if (w.minimized) {
        const restoreH = w.prevH ?? getWidgetMeta(w.type)?.defaultSize.h ?? 4;
        return { ...w, minimized: false, h: restoreH, prevH: undefined };
      }
      return { ...w, minimized: true, prevH: w.h, h: 1 };
    });
    set({ instances: next });
    persist(topicId, next);
  },

  // RGL onLayoutChange 반영 — {i,x,y,w,h} 만 병합, 나머지 필드 보존. 최소화 항목은 h 무시.
  setLayout: (rglLayout) => {
    if (!Array.isArray(rglLayout)) return;
    const { topicId } = get();
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
    persist(topicId, next);
  },

  // 클릭한 위젯을 맨 앞으로 + 포커스
  bringToFront: (id) => {
    const { instances, focusedId, topicId } = get();
    if (focusedId === id) {
      const top = maxZ(instances);
      const target = instances.find((w) => w.id === id);
      if (target && target.z === top) return;
    }
    const top = maxZ(instances) + 1;
    const next = instances.map((w) => (w.id === id ? { ...w, z: top } : w));
    set({ instances: next, focusedId: id });
    persist(topicId, next);
  },

  // config 부분 갱신
  updateConfig: (id, patch) => {
    const { topicId } = get();
    const next = get().instances.map((w) =>
      w.id === id ? { ...w, config: { ...w.config, ...patch } } : w
    );
    set({ instances: next });
    persist(topicId, next);
  },

  // 편집 모드 토글 (전역 세션 상태 — DO-5)
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),

  // 현재 주제의 기본 레이아웃으로 초기화
  resetLayout: () => {
    const { topicId } = get();
    const next = defaultInstancesFor(topicId);
    set({ instances: next, focusedId: null });
    persist(topicId, next);
  },
}));
