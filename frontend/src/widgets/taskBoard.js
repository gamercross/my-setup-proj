// 할일 보드(칸반) 순수 로직 (FR-TASK-09)
// - React 의존 없음 → node --test 로 직접 검증.
// - 우선순위 3열: 높음 / 보통 / 낮음. 미지·누락 priority 는 '보통(medium)' 열로 보낸다.

export const BOARD_COLUMNS = [
  { key: 'high', label: '높음' },
  { key: 'medium', label: '보통' },
  { key: 'low', label: '낮음' },
];

// tasks 배열을 우선순위별로 분배한다. 입력 순서를 열 내부에서 보존한다.
export function groupByPriority(tasks) {
  const groups = { high: [], medium: [], low: [] };
  const src = Array.isArray(tasks) ? tasks : [];
  for (const task of src) {
    const key = task && (task.priority === 'high' || task.priority === 'low') ? task.priority : 'medium';
    groups[key].push(task);
  }
  return groups;
}
