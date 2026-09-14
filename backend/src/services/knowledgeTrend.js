// 지식 축적 추세 서비스 (개인 OS P11 — FR-KNOW-01, ADR-0036). 읽기 전용 SQL 집계. Claude 호출 없음.
// "주" = ISO 주(월요일 시작, 일요일 끝), 서버 로컬 시간대 기준 (planner.js 와 동일 규약).
// OKR 은 월 단위 그대로 둔다 — 새 스냅샷 로직을 만들지 않는다(ADR-0036 §비대칭 결정).

const db = require('../db');
const { ValidationError } = require('../errors');
const { round3 } = require('./okr');
const { toDateKey, startOfIsoWeek, addDays } = require('./planner');

const MIN_WEEKS = 1;
const MAX_WEEKS = 26;
const DEFAULT_WEEKS = 8;
const TAG_LIMIT = 12;

// 쿼리 파라미터 weeks 검증. 미지정이면 기본값, 범위·형식 밖이면 400.
function assertWeeks(raw) {
  if (raw === undefined) return DEFAULT_WEEKS;
  if (!/^\d+$/.test(String(raw))) {
    throw new ValidationError('weeks 는 1~26 사이 정수여야 합니다.');
  }
  const n = Number(raw);
  if (n < MIN_WEEKS || n > MAX_WEEKS) {
    throw new ValidationError('weeks 는 1~26 사이 정수여야 합니다.');
  }
  return n;
}

// now 기준 최근 weeks 주 창을 계산한다 (순수 함수 — 단위 테스트 대상).
// starts[0] = 창의 첫 주 월요일 … starts[weeks-1] = 이번 주 월요일.
function weekWindow(now, weeks) {
  const thisMon = startOfIsoWeek(now);
  const firstMon = addDays(thisMon, -(weeks - 1) * 7);
  const lastSun = addDays(thisMon, 6);
  const starts = [];
  for (let i = 0; i < weeks; i += 1) {
    starts.push(addDays(firstMon, i * 7));
  }
  return {
    from: toDateKey(firstMon),
    to: toDateKey(lastSun),
    afterEnd: toDateKey(addDays(lastSun, 1)),
    starts,
  };
}

// GET /api/knowledge-trend 응답 조립.
function getKnowledgeTrend(now = new Date(), { weeks } = {}) {
  const w = weeks ?? DEFAULT_WEEKS;
  const win = weekWindow(now, w);

  // ── 체크인 — 주차별 빈도 (빈 주도 count:0 으로 채운다) ──
  const rows = db.getCheckinCountsByWeek(win.from, win.afterEnd);
  const byWeek = new Map(rows.map((r) => [r.wk, r.cnt]));
  let checkinTotal = 0;
  const checkinPoints = win.starts.map((d, i) => {
    const count = byWeek.get(i) || 0;
    checkinTotal += count;
    const key = toDateKey(d);
    return { week: key, label: key.slice(5), count };
  });
  const checkinWeeks = checkinPoints.filter((p) => p.count > 0).length;

  // ── OKR — 창과 겹치는 달의 월평균 달성률 ──
  const fromMonth = win.from.slice(0, 7);
  const okrRows = db.getKrTrendFrom(fromMonth);
  const okrPoints = okrRows.map((r) => ({ month: r.month, krAvgPct: round3(r.avg) }));
  const latestPct = okrPoints.length ? okrPoints[okrPoints.length - 1].krAvgPct : 0;

  // ── 태그 — 창 안에서 부착된 태그 분포 (source 무관, 상위 12개) ──
  const tagRows = db.getTagCountsInRange(win.from, win.to);
  const tagTotal = tagRows.reduce((acc, r) => acc + r.cnt, 0);
  const items = tagRows.slice(0, TAG_LIMIT).map((r) => ({ tag: r.tag, count: r.cnt }));
  const otherCount = tagRows.slice(TAG_LIMIT).reduce((acc, r) => acc + r.cnt, 0);
  const topTag = items.length ? items[0].tag : null;

  return {
    window: { weeks: w, from: win.from, to: win.to },
    checkins: { total: checkinTotal, points: checkinPoints },
    okr: { points: okrPoints, latestPct },
    tags: { total: tagTotal, distinct: tagRows.length, otherCount, items },
    summary: { checkinWeeks, activeWeeks: w, topTag },
  };
}

module.exports = {
  getKnowledgeTrend,
  weekWindow,
  assertWeeks,
};
