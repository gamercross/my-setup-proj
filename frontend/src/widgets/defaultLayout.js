// 기본 대시보드 레이아웃 (ADR-0020, DASHBOARD_OS §8)
// - 첫 실행/초기화 시 사용. 인스턴스 id 는 타입 id 와 동일하다 (타입당 1개 — DO-2).
// - 다이어그램 위젯은 폭이 커서 첫 화면을 잠식하므로 기본에 넣지 않는다. 피커로만 추가.

export const DEFAULT_INSTANCES = [
  { id: 'tasks', type: 'tasks', x: 0, y: 0, w: 4, h: 6, z: 1, minimized: false, config: {} },
  { id: 'projects', type: 'projects', x: 4, y: 0, w: 4, h: 6, z: 2, minimized: false, config: {} },
  { id: 'calendar', type: 'calendar', x: 8, y: 0, w: 4, h: 5, z: 3, minimized: false, config: {} },
];

// 항상 새 배열/새 객체로 복사해 돌려준다 (스토어가 직접 변형해도 원본 오염 방지).
export function cloneDefaultInstances() {
  return DEFAULT_INSTANCES.map((inst) => ({ ...inst, config: { ...inst.config } }));
}
