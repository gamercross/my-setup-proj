// 주제별 기본 위젯 레이아웃 (ADR-0020 / ADR-0032, DASHBOARD_OS §8)
// - 첫 실행/초기화 시 사용. 인스턴스 id 는 타입 id 와 동일하다 (한 주제 안에서 타입당 1개 — DO-2).
// - overview 는 기존 v1 기본 레이아웃(4개)을 그대로 이관한 것.
// - 아직 전용 위젯이 없는 주제(okr·weekly·activity·progress·settings)는 placeholder 1개.
// - 미정의 주제 id 는 cloneDefaultInstances 가 placeholder 1개로 폴백한다.

// 인스턴스 1건 축약 생성기 (z 는 배열 순서로 자동 부여).
function inst(type, x, y, w, h) {
  return { id: type, type, x, y, w, h, minimized: false, config: {} };
}

export const DEFAULT_LAYOUTS = {
  // v1 기본 레이아웃 그대로 (tasks·projects·calendar·brief).
  overview: [
    inst('tasks', 0, 0, 4, 6),
    inst('projects', 4, 0, 4, 6),
    inst('calendar', 8, 0, 4, 5),
    inst('brief', 0, 6, 4, 6),
  ],
  tasks: [inst('tasks', 0, 0, 8, 10)],
  brief: [inst('brief', 0, 0, 8, 10)],
  projects: [inst('projects', 0, 0, 8, 10)],
  calendar: [inst('calendar', 0, 0, 6, 8)],
  diagrams: [inst('diagrams', 0, 0, 10, 10)],
  okr: [inst('placeholder', 0, 0, 6, 4)],
  weekly: [inst('placeholder', 0, 0, 6, 4)],
  activity: [inst('placeholder', 0, 0, 6, 4)],
  progress: [inst('placeholder', 0, 0, 6, 4)],
  settings: [inst('placeholder', 0, 0, 6, 4)],
};

// 주제의 기본 인스턴스 깊은 복사본. 미정의 주제는 placeholder 1개.
// z 는 배열 순서(1-base)로 채운다 (원본에는 두지 않아 유지보수 부담을 줄임).
export function cloneDefaultInstances(topicId) {
  const list = DEFAULT_LAYOUTS[topicId] ?? [inst('placeholder', 0, 0, 6, 4)];
  return list.map((it, i) => ({ ...it, z: i + 1, config: { ...it.config } }));
}
