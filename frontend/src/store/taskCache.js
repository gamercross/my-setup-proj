// 할일 단일 클라이언트 캐시 헬퍼 (ADR-0028)
// - 순수 함수 모음. React·zustand 의존 없음 → node --test 로 직접 검증.
// - 캐시 형태: { byId: { [id]: task }, order: [id, ...] }
// - 모든 갱신은 불변(immutable). 대상이 없어 바뀔 게 없으면 "원본 참조" 를 그대로 반환한다.

// 빈 캐시 상수 형태 (매번 새 객체를 만들어 공유 참조 오염을 막는다)
function emptyCache() {
  return { byId: {}, order: [] };
}

// 목록 배열 → 캐시. 비배열(null/undefined/객체 등)은 빈 캐시로 방어한다.
export function toCache(list) {
  if (!Array.isArray(list)) return emptyCache();
  const byId = {};
  const order = [];
  for (const task of list) {
    if (!task || task.id == null) continue;
    byId[task.id] = task;
    order.push(task.id);
  }
  return { byId, order };
}

// 캐시 → 목록 배열. order 순서를 따르고, byId 에 없는 id 는 걸러낸다.
export function listFrom(cache) {
  const c = cache && typeof cache === 'object' ? cache : emptyCache();
  const order = Array.isArray(c.order) ? c.order : [];
  const byId = c.byId && typeof c.byId === 'object' ? c.byId : {};
  return order.map((id) => byId[id]).filter(Boolean);
}

// 태스크 1건 삽입/치환. 없으면 order 끝에 append, 있으면 byId 만 교체(순서 유지).
export function upsert(cache, task) {
  if (!task || task.id == null) return cache;
  const exists = Object.prototype.hasOwnProperty.call(cache.byId, task.id);
  return {
    byId: { ...cache.byId, [task.id]: task },
    order: exists ? cache.order : [...cache.order, task.id],
  };
}

// 태스크 1건 부분 갱신. 대상이 없으면 원본 참조 그대로 반환.
export function patchOne(cache, id, patch) {
  const cur = cache.byId[id];
  if (!cur) return cache;
  return {
    byId: { ...cache.byId, [id]: { ...cur, ...patch } },
    order: cache.order,
  };
}

// 태스크 1건 제거. 대상이 없으면 원본 참조 그대로 반환.
export function removeOne(cache, id) {
  if (!Object.prototype.hasOwnProperty.call(cache.byId, id)) return cache;
  const byId = { ...cache.byId };
  delete byId[id];
  return { byId, order: cache.order.filter((x) => x !== id) };
}
