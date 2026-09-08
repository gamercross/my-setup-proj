// 할일 태그 순수 로직 (FR-TASK-08) — taskBoard.js 선례.
// - React·zustand 의존 없음 → node --test 로 직접 검증.
// - 태그는 자유 문자열·다중. 정렬은 항상 오름차순, 중복·빈값 제거.

// 태그 배열 정규화. 비배열/null → []. 문자열만, 트림, 빈값·중복 제거 후 정렬.
export function normalizeTags(v) {
  if (!Array.isArray(v)) return [];
  const seen = new Set();
  for (const item of v) {
    if (typeof item !== 'string') continue;
    const t = item.trim();
    if (t) seen.add(t);
  }
  return [...seen].sort();
}

// task 에 태그 1개를 더한 새 태그 배열 (멱등, 정렬 유지).
export function addTagTo(task, tag) {
  const base = normalizeTags(task && task.tags);
  const t = String(tag ?? '').trim();
  if (!t) return base;
  return normalizeTags([...base, t]);
}

// task 에서 태그 1개를 뺀 새 태그 배열.
export function removeTagFrom(task, tag) {
  const t = String(tag ?? '').trim();
  return normalizeTags(task && task.tags).filter((x) => x !== t);
}

// 여러 할일에서 등장하는 모든 태그를 유니크·정렬해 반환한다 (없으면 []).
export function collectTags(tasks) {
  const src = Array.isArray(tasks) ? tasks : [];
  const all = [];
  for (const task of src) {
    for (const tag of normalizeTags(task && task.tags)) all.push(tag);
  }
  return normalizeTags(all);
}

// tag 로 할일을 거른다. tag 가 null/'' 이면 원본 참조를 그대로 돌려준다.
export function filterByTag(tasks, tag) {
  if (tag == null || tag === '') return tasks;
  const src = Array.isArray(tasks) ? tasks : [];
  return src.filter((task) => normalizeTags(task && task.tags).includes(tag));
}
