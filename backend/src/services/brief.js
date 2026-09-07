// 일일 브리핑(brief) 서비스 계층 (FR-AGENT-04)
// - briefs 는 에이전트가 소유한다. 백엔드는 오늘 날짜 1건을 SELECT 만 한다 (ADR-0011).
// - "오늘"은 서버 로컬 시각 기준으로 계산한다. toISOString() 은 UTC 라 KST 새벽에
//   날짜가 밀리므로 쓰지 않는다 (services/calendar.js 와 같은 규칙).

const db = require('../db');

// 로컬 기준 'YYYY-MM-DD'. 테스트를 위해 Date 를 주입할 수 있다.
function todayString(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 오늘 브리핑 1건 (없으면 null — 라우트가 { brief: null } 로 200 응답, ADR-0025)
function getTodayBrief() {
  return db.getBriefByDate(todayString()) ?? null;
}

module.exports = { getTodayBrief, todayString };
