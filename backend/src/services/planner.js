// 주간 플래너 서비스 (P8 — FR-OKR-05). 읽기 전용 SQL 집계. Claude 호출 없음.
// "주" = ISO 주(월요일 시작, 일요일 끝), 서버 로컬 시간대 기준.
// 시간대 안전을 위해 로컬 Date 함수만 쓴다 (getFullYear/getMonth/getDate/getDay). UTC 함수 금지.

const db = require('../db');

// 로컬 'YYYY-MM-DD'
function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// 그 날이 속한 ISO 주의 월요일 00:00 (로컬)
function startOfIsoWeek(d) {
  const offset = (d.getDay() + 6) % 7; // 월=0 … 일=6
  return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -offset);
}

// 지난주 / 이번주 / 다음주의 [from, to] (둘 다 'YYYY-MM-DD', 월~일)
function weekRanges(now) {
  const thisMon = startOfIsoWeek(now);
  const mk = (mon) => ({ from: toDateKey(mon), to: toDateKey(addDays(mon, 6)) });
  return {
    last: mk(addDays(thisMon, -7)),
    this: mk(thisMon),
    next: mk(addDays(thisMon, 7)),
  };
}

// GET /api/planner/weekly 응답 계약 (FR-OKR-05 AC-1~5)
function getWeekly(now = new Date(), { limit = 50 } = {}) {
  const r = weekRanges(now);
  const last = db.getTaskStatsInRange(r.last.from, r.last.to);
  const thisStats = db.getTaskStatsInRange(r.this.from, r.this.to);
  const nextStats = db.getTaskStatsInRange(r.next.from, r.next.to);

  return {
    lastWeek: { done: last.done, total: last.total },
    thisWeek: {
      done: thisStats.done,
      total: thisStats.total,
      items: serialize(db.getTasksInRange(r.this.from, r.this.to, limit)),
    },
    nextWeek: {
      total: nextStats.total,
      items: serialize(db.getTasksInRange(r.next.from, r.next.to, limit)),
    },
  };
}

// 할 일 행 → { id, title, due_date, priority, status, tags }
function serialize(rows) {
  return rows.map((t) => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date,
    priority: t.priority,
    status: t.status,
    tags: t.tags || [],
  }));
}

module.exports = {
  toDateKey,
  startOfIsoWeek,
  addDays,
  weekRanges,
  getWeekly,
};
