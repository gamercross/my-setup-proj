// OKR 서비스 계층 (P8 — FR-OKR-01~04). HTTP 를 모른다.
// 검증 실패는 ValidationError(400), 리소스 없음은 NotFoundError(404).
//
// 달성률 공식(프런트 store/okrMath.js 와 동일하게 유지):
//   krPct = target > 0 ? clamp(current / target, 0, 1) : 0
//   objectivePct = 하위 KR pct 의 산술 평균 (하위 0개면 0)
//   버킷 경계: 반올림(round3) 후 값으로 pct >= 0.9 → high, >= 0.4 → mid, 그 외 low

const db = require('../db');
const { ValidationError, NotFoundError } = require('../errors');
const { assertProjectId } = require('./tasks');

// ── 순수 헬퍼 (테스트 대상) ──────────────────────────

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// 소수 셋째 자리에서 반올림 (FR-OKR-03 AC-5)
function round3(x) {
  return Math.round(x * 1000) / 1000;
}

function krPct(kr) {
  const target = Number(kr && kr.target);
  const current = Number(kr && kr.current);
  if (!(target > 0)) return 0;
  return clamp01(current / target);
}

function objectivePct(krs) {
  if (!Array.isArray(krs) || krs.length === 0) return 0;
  const sum = krs.reduce((acc, kr) => acc + krPct(kr), 0);
  return sum / krs.length;
}

// 응답에 포함된 KR 배열로 요약 스탯을 만든다.
function summarize(allKrs) {
  const krs = Array.isArray(allKrs) ? allKrs : [];
  const pcts = krs.map((kr) => round3(krPct(kr)));
  const krAvgPct = pcts.length
    ? round3(pcts.reduce((a, b) => a + b, 0) / pcts.length)
    : 0;
  const bucket = { high: 0, mid: 0, low: 0 };
  for (const p of pcts) {
    if (p >= 0.9) bucket.high += 1;
    else if (p >= 0.4) bucket.mid += 1;
    else bucket.low += 1;
  }
  return { krAvgPct, bucket, pcts };
}

// ── 검증 ─────────────────────────────────────────────

function assertTitle(raw) {
  const title = String(raw ?? '').trim();
  if (title.length < 1) throw new ValidationError('title 은 필수입니다.');
  if (title.length > 120) throw new ValidationError('title 은 120자 이하여야 합니다.');
  return title;
}

function assertPeriod(raw) {
  const period = String(raw ?? '').trim();
  if (!/^\d{4}(-Q[1-4])?$/.test(period)) {
    throw new ValidationError('period 는 YYYY 또는 YYYY-Q1~Q4 형식이어야 합니다.');
  }
  return period;
}

function assertStatus(raw) {
  if (!['active', 'done', 'archived'].includes(raw)) {
    throw new ValidationError('status 는 active·done·archived 중 하나여야 합니다.');
  }
  return raw;
}

function assertNumber(v, name, { min } = {}) {
  const n = Number(v);
  if (typeof v !== 'number' || Number.isNaN(n)) {
    if (name === 'target') throw new ValidationError('target 은 0 이상의 숫자여야 합니다.');
    throw new ValidationError(`${name} 은 숫자여야 합니다.`);
  }
  if (min !== undefined && n < min) {
    throw new ValidationError('target 은 0 이상의 숫자여야 합니다.');
  }
  return n;
}

// 단위: 트림 후 '' → null, 12자 초과 400
function normalizeUnit(raw) {
  if (raw === undefined || raw === null) return null;
  const unit = String(raw).trim();
  if (unit.length === 0) return null;
  if (unit.length > 12) throw new ValidationError('unit 은 12자 이하여야 합니다.');
  return unit;
}

// ── 목표(Objective) CRUD ─────────────────────────────

function createObjective(input) {
  const body = input || {};
  const row = { title: assertTitle(body.title), period: assertPeriod(body.period) };
  if (body.status !== undefined) row.status = assertStatus(body.status);
  return db.addObjective(row);
}

function updateObjective(id, patch) {
  const existing = db.getObjective(id);
  if (!existing) throw new NotFoundError('목표를 찾을 수 없습니다.');
  const body = patch || {};
  const next = {};
  if (body.title !== undefined) next.title = assertTitle(body.title);
  if (body.period !== undefined) next.period = assertPeriod(body.period);
  if (body.status !== undefined) next.status = assertStatus(body.status);
  return db.updateObjective(id, next);
}

function deleteObjective(id) {
  if (!db.deleteObjective(id)) throw new NotFoundError('목표를 찾을 수 없습니다.');
}

// ── 핵심 결과(Key Result) CRUD ───────────────────────

function createKeyResult(input) {
  const body = input || {};
  const objId = Number(body.objective_id);
  if (!Number.isInteger(objId) || !db.getObjective(objId)) {
    // FR-OKR-02 AC-2 — 404 가 아니라 400 이다.
    throw new ValidationError('목표(objective)를 찾을 수 없습니다.');
  }
  const row = {
    objective_id: objId,
    title: assertTitle(body.title),
    target: assertNumber(body.target, 'target', { min: 0 }),
    current: body.current === undefined ? 0 : assertNumber(body.current, 'current'),
    unit: normalizeUnit(body.unit),
    project_id: body.project_id ?? null,
  };
  if ('project_id' in body) assertProjectId(body.project_id);
  return db.addKeyResult(row);
}

function updateKeyResult(id, patch) {
  const existing = db.getKeyResult(id);
  if (!existing) throw new NotFoundError('핵심 결과를 찾을 수 없습니다.');
  const body = patch || {};
  const next = {};
  if (body.title !== undefined) next.title = assertTitle(body.title);
  if (body.target !== undefined) next.target = assertNumber(body.target, 'target', { min: 0 });
  if (body.current !== undefined) next.current = assertNumber(body.current, 'current');
  if (body.unit !== undefined) next.unit = normalizeUnit(body.unit);
  if (body.project_id !== undefined) {
    assertProjectId(body.project_id);
    next.project_id = body.project_id;
  }
  return db.updateKeyResult(id, next);
}

function deleteKeyResult(id) {
  if (!db.deleteKeyResult(id)) throw new NotFoundError('핵심 결과를 찾을 수 없습니다.');
}

// ── 대시보드 조회 (FR-OKR-03) ────────────────────────

function getDashboard({ includeArchived } = {}) {
  const objectives = db.getObjectives({ includeArchived });
  const allKrs = db.getKeyResults();

  // objective_id → KR 배열
  const byObjective = new Map();
  for (const kr of allKrs) {
    if (!byObjective.has(kr.objective_id)) byObjective.set(kr.objective_id, []);
    byObjective.get(kr.objective_id).push(kr);
  }

  const includedKrs = [];
  const shaped = objectives.map((o) => {
    const krs = byObjective.get(o.id) || [];
    const keyResults = krs.map((kr) => {
      includedKrs.push(kr);
      return {
        id: kr.id,
        title: kr.title,
        target: kr.target,
        current: kr.current,
        unit: kr.unit,
        pct: round3(krPct(kr)),
        project_id: kr.project_id,
      };
    });
    return {
      id: o.id,
      title: o.title,
      period: o.period,
      status: o.status,
      pct: round3(objectivePct(krs)),
      keyResults,
    };
  });

  const { krAvgPct, bucket } = summarize(includedKrs);
  return {
    objectives: shaped,
    summary: {
      krAvgPct,
      objectiveCount: shaped.length,
      keyResultCount: includedKrs.length,
      bucket,
    },
  };
}

// ── 월별 추이 (FR-OKR-04) ────────────────────────────

function getTrend() {
  const points = db.getKrTrend().map((r) => ({
    month: r.month,
    krAvgPct: round3(r.avg),
  }));
  return { points };
}

// ── 월별 스냅샷 적재 ─────────────────────────────────
// 트리거: ① 백엔드 기동 시 1회 ② GET /api/okr/trend 진입 시 (프로세스당 하루 1회 가드).
let lastSnapshotDay = null;

function localMonth(now) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
function localDay(now) {
  return `${localMonth(now)}-${String(now.getDate()).padStart(2, '0')}`;
}

// 모든 KR 의 현재 pct 를 이번 달 스냅샷으로 UPSERT. 같은 프로세스·같은 날짜면 스킵.
function snapshotCurrentMonth(now = new Date()) {
  const day = localDay(now);
  if (lastSnapshotDay === day) {
    return { month: localMonth(now), count: 0, skipped: true };
  }
  const month = localMonth(now);
  const krs = db.getKeyResults();
  db.transaction(() => {
    for (const kr of krs) {
      db.upsertKrSnapshot(kr.id, month, round3(krPct(kr)));
    }
  });
  lastSnapshotDay = day;
  return { month, count: krs.length, skipped: false };
}

module.exports = {
  krPct,
  round3,
  objectivePct,
  summarize,
  createObjective,
  updateObjective,
  deleteObjective,
  createKeyResult,
  updateKeyResult,
  deleteKeyResult,
  getDashboard,
  getTrend,
  snapshotCurrentMonth,
};
