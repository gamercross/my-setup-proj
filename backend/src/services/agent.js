// 에이전트(agent) 활동 서비스 (P7, FR-AGENT-08)
// - 에이전트 실행 이력(sync_logs)·외부 연결 상태·다음 예약 시각·"지금 실행" 트리거 상태를 조립한다.
// - "지금 실행"은 상주 프로세스·subprocess 없이 파일 플래그(agent/.triggers/run-now)만 쓴다 (ADR-0011, ADR-0013 부분 채택).
//   launchd `WatchPaths` 가 그 디렉터리를 감시해 에이전트를 깨운다.
// - 라우트는 이 서비스만 호출한다. 검증·HTTP 응답 매핑은 라우트 담당.

const fs = require('fs');
const path = require('path');

const db = require('../db');
const supabase = require('../supabase');

// launchd plist 는 파싱하지 않는다 — 실제 예약 시각은 .env 의 DAILY_BRIEF_HOUR/MINUTE 로 알려준다.
// (install-dailybrief-launchd.sh 가 같은 값으로 plist 를 만든다 — AUTOMATION.md)
const DEFAULT_RUN_HOUR = 7;
const DEFAULT_RUN_MINUTE = 30;

// error_message 절단 상한(응답 부풀림 방지). 재마스킹은 하지 않는다 —
// 값은 에이전트가 이미 _sanitize_error 로 마스킹해 저장한다 (daily_brief.py).
const MAX_ERROR_LEN = 200;

// DAILY_BRIEF_HOUR/MINUTE 를 정수로 파싱한다. 범위 밖·비정수면 기본값으로 폴백(경고 로그).
function getScheduleTime() {
  let hour = DEFAULT_RUN_HOUR;
  let minute = DEFAULT_RUN_MINUTE;

  const rawHour = process.env.DAILY_BRIEF_HOUR;
  if (rawHour !== undefined && rawHour !== '') {
    const h = Number(rawHour);
    if (Number.isInteger(h) && h >= 0 && h <= 23) {
      hour = h;
    } else {
      console.warn('DAILY_BRIEF_HOUR 값이 올바르지 않아 기본값 사용:', rawHour);
    }
  }

  const rawMinute = process.env.DAILY_BRIEF_MINUTE;
  if (rawMinute !== undefined && rawMinute !== '') {
    const m = Number(rawMinute);
    if (Number.isInteger(m) && m >= 0 && m <= 59) {
      minute = m;
    } else {
      console.warn('DAILY_BRIEF_MINUTE 값이 올바르지 않아 기본값 사용:', rawMinute);
    }
  }

  return { hour, minute };
}

// 다음 실행 시각을 계산한다 (순수 함수 — 단위 테스트 대상).
// 서버 로컬 시각 기준으로 오늘 hour:minute 이 now 보다 뒤면 오늘, 아니면 다음날.
function computeNextRun(now, hour, minute) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

// agent/ 루트를 우선순위대로 찾는다 (services/diagrams.js:resolveDocsRoot 패턴). 못 찾으면 null.
function resolveAgentRoot() {
  // AGENT_PATH 가 명시되면 그것만 신뢰한다(폴백 없음).
  if (process.env.AGENT_PATH) {
    const explicit = process.env.AGENT_PATH;
    try {
      if (fs.existsSync(explicit) && fs.statSync(explicit).isDirectory()) return explicit;
    } catch (err) {
      console.warn('AGENT_PATH 확인 실패:', explicit, err.message);
    }
    return null;
  }

  const candidates = [];
  // dev: 저장소 루트의 agent/ (이 파일은 backend/src/services/ 에 있다)
  candidates.push(path.resolve(__dirname, '../../../agent'));
  // 패키지 배포: process.resourcesPath/agent (electron 밖에서는 undefined)
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'agent'));
  }

  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir;
    } catch (err) {
      console.warn('agent 루트 후보 확인 실패:', dir, err.message);
    }
  }
  return null;
}

// 트리거 플래그 파일 경로. agent 루트를 못 찾으면 null.
function flagPath() {
  const root = resolveAgentRoot();
  if (!root) return null;
  return path.join(root, '.triggers', 'run-now');
}

// 실행 요청이 대기 중인지 확인한다. 실패해도 앱은 계속 동작 (NFR-REL-01).
function isRunPending() {
  const p = flagPath();
  if (!p) return { pending: false };
  try {
    if (!fs.existsSync(p)) return { pending: false };
    const stat = fs.statSync(p);
    return { pending: true, requestedAt: stat.mtime.toISOString() };
  } catch (err) {
    console.warn('run-now 플래그 확인 실패:', err.message);
    return { pending: false };
  }
}

// 실행을 요청한다(멱등). 이미 플래그가 있으면 덮어쓰지 않고 기존 mtime 을 requestedAt 으로 돌려준다.
// 반환: { ok, requestedAt, alreadyPending } | { ok: false, reason: 'no-root' | 'io' }
function requestRun() {
  const p = flagPath();
  if (!p) return { ok: false, reason: 'no-root' };

  try {
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      return { ok: true, requestedAt: stat.mtime.toISOString(), alreadyPending: true };
    }
    const dir = path.dirname(p);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, `${new Date().toISOString()}\n`);
    // requestedAt 은 파일 mtime 으로 통일한다 — 이후 isRunPending() 조회와 값이 어긋나지 않게.
    const requestedAt = fs.statSync(p).mtime.toISOString();
    return { ok: true, requestedAt, alreadyPending: false };
  } catch (err) {
    console.error('run-now 플래그 저장 실패:', err);
    return { ok: false, reason: 'io' };
  }
}

// sync_logs 행의 error_message 를 상한 길이로 자른다.
function truncateError(msg) {
  if (typeof msg !== 'string' || msg === '') return msg ?? null;
  return msg.length > MAX_ERROR_LEN ? msg.slice(0, MAX_ERROR_LEN) : msg;
}

// 활동 위젯에 필요한 데이터를 한 번에 조립한다.
// - logs: 최근 sync_logs (읽기 전용)
// - health: Supabase 외부 연결 상태 (실패해도 throw 안 함)
// - nextRun: .env 기준 다음 예약 시각
// - runNow: 트리거 대기 상태 + 요청 가능 여부
async function getActivity({ limit } = {}) {
  const lim = Number.isInteger(limit) && limit > 0 ? limit : 10;

  const logs = db.getSyncLogs({ limit: lim }).map((row) => ({
    id: row.id,
    service: row.service,
    status: row.status,
    last_sync: row.last_sync,
    error_message: truncateError(row.error_message),
  }));

  let health;
  try {
    const result = await supabase.checkConnection();
    health = { supabase: result.status, detail: result.detail, host: result.host || null };
  } catch (err) {
    console.error('agent/activity health 확인 실패:', err);
    health = { supabase: 'error', detail: '연결 확인 중 오류', host: null };
  }

  const { hour, minute } = getScheduleTime();
  const nextRun = {
    at: computeNextRun(new Date(), hour, minute).toISOString(),
    hour,
    minute,
    source: 'schedule',
  };

  const pending = isRunPending();
  const runNow = {
    pending: pending.pending,
    requestedAt: pending.requestedAt || null,
    available: flagPath() !== null,
  };

  return { logs, health, nextRun, runNow, checkedAt: new Date().toISOString() };
}

module.exports = {
  DEFAULT_RUN_HOUR,
  DEFAULT_RUN_MINUTE,
  getScheduleTime,
  computeNextRun,
  resolveAgentRoot,
  flagPath,
  isRunPending,
  requestRun,
  getActivity,
};
