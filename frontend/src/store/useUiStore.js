// 셸 UI 상태 스토어 (zustand) — ADR-0032
// - activeTopic: 현재 선택된 사이드바 주제. localStorage 'dashboard.ui.v1' 에 영속.
// - pickerOpen: 위젯 피커 열림 여부. 세션 전용(영속 안 함).
// - 라우터를 쓰지 않는다. 주제 전환 = 본문 그리드 교체(새로고침·URL 변경 없음).

import { create } from 'zustand';
import { DEFAULT_TOPIC_ID, isValidTopicId } from '../widgets/topics.js';

const UI_STORAGE_KEY = 'dashboard.ui.v1';
const UI_SCHEMA_VERSION = 1;

// 저장된 activeTopic 을 읽는다. 없거나 손상/미등록이면 기본값.
function readActiveTopic() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return DEFAULT_TOPIC_ID;
    const rawStr = window.localStorage.getItem(UI_STORAGE_KEY);
    if (!rawStr) return DEFAULT_TOPIC_ID;
    const parsed = JSON.parse(rawStr);
    if (parsed && isValidTopicId(parsed.activeTopic)) return parsed.activeTopic;
    return DEFAULT_TOPIC_ID;
  } catch (err) {
    console.warn('UI 상태 불러오기 실패 — 기본값으로 폴백합니다.', err);
    return DEFAULT_TOPIC_ID;
  }
}

function persistActiveTopic(activeTopic) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(
      UI_STORAGE_KEY,
      JSON.stringify({ version: UI_SCHEMA_VERSION, activeTopic })
    );
  } catch (err) {
    console.warn('UI 상태 저장 실패 (무시).', err);
  }
}

export const useUiStore = create((set) => ({
  activeTopic: readActiveTopic(),
  pickerOpen: false,

  // 사이드바 주제 선택 — 유효한 id 만 반영하고 영속한다.
  setActiveTopic: (id) => {
    if (!isValidTopicId(id)) return;
    set({ activeTopic: id });
    persistActiveTopic(id);
  },

  // 위젯 피커 열림 토글 / 설정 (세션 전용).
  togglePicker: (v) =>
    set((s) => ({ pickerOpen: typeof v === 'boolean' ? v : !s.pickerOpen })),
  setPickerOpen: (v) => set({ pickerOpen: v === true }),
}));
