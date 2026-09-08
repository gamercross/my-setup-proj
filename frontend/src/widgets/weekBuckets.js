// 주간 플래너 위젯의 데이터 파생 (순수 함수). useTaskStore.tasks 를 버킷팅한다.
// 백엔드 backend/src/services/planner.js 와 같은 ISO 주(월~일, 로컬) 정의를 쓴다.
// due_date 포맷 혼재 방어: 항상 String(due_date).slice(0, 10) 로 비교한다.

// 로컬 'YYYY-MM-DD'
export function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// 그 날이 속한 ISO 주의 월요일 00:00 (로컬)
export function startOfIsoWeek(d) {
  const offset = (d.getDay() + 6) % 7; // 월=0 … 일=6
  return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -offset);
}

// tasks, now → { lastWeek:{done,total}, thisWeek:{done,total,items}, nextWeek:{total,items} }
export function bucketTasks(tasks, now = new Date()) {
  const thisMon = startOfIsoWeek(now);
  const lastMon = addDays(thisMon, -7);
  const nextMon = addDays(thisMon, 7);

  const range = (mon) => ({ from: toDateKey(mon), to: toDateKey(addDays(mon, 6)) });
  const last = range(lastMon);
  const cur = range(thisMon);
  const nxt = range(nextMon);

  const inRange = (key, r) => key >= r.from && key <= r.to;

  const buckets = {
    last: [],
    this: [],
    next: [],
  };

  for (const t of Array.isArray(tasks) ? tasks : []) {
    if (t.due_date == null) continue;
    const key = String(t.due_date).slice(0, 10);
    if (inRange(key, last)) buckets.last.push(t);
    else if (inRange(key, cur)) buckets.this.push(t);
    else if (inRange(key, nxt)) buckets.next.push(t);
  }

  const byDue = (a, b) => {
    const ka = String(a.due_date).slice(0, 10);
    const kb = String(b.due_date).slice(0, 10);
    if (ka < kb) return -1;
    if (ka > kb) return 1;
    return (a.id || 0) - (b.id || 0);
  };
  const doneCount = (list) => list.filter((t) => t.status === 'done').length;

  buckets.this.sort(byDue);
  buckets.next.sort(byDue);

  return {
    lastWeek: { done: doneCount(buckets.last), total: buckets.last.length },
    thisWeek: {
      done: doneCount(buckets.this),
      total: buckets.this.length,
      items: buckets.this,
    },
    nextWeek: { total: buckets.next.length, items: buckets.next },
  };
}
