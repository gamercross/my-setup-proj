// 웹 데모(프로토타입) 요청 핸들러 (ADR-0026)
// - VITE_DEMO=1 빌드에서 api/client.js 가 네트워크 대신 이 함수로 요청을 넘긴다.
// - 백엔드 라우트의 행복 경로 + 최소 검증만 흉내 낸다. 상태는 메모리에만 산다
//   (새로고침 = 초기화). 목적은 "보여주기"이지 정합성 테스트가 아니다.

import { createDataset } from './demoData.js';
import { krPct, objectivePct, summarize, round3 } from '../store/okrMath.js';
import { bucketTasks } from '../widgets/weekBuckets.js';

let store = createDataset();
const nowIso = () => new Date().toISOString();
const nextId = () => (store._seq += 1);

// 한국어 에러 (client.js 의 정규화 규칙과 맞춘다)
function err(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// path 에서 쿼리스트링 분리
function parse(path) {
  const [p, qs = ''] = path.split('?');
  return { p, q: Object.fromEntries(new URLSearchParams(qs)) };
}

function listTasks(query) {
  let rows = store.tasks;
  if (query.project_id !== undefined) {
    if (query.project_id === 'none' || query.project_id === 'null') {
      rows = rows.filter((t) => t.project_id == null);
    } else {
      const n = Number(query.project_id);
      if (!Number.isInteger(n) || n <= 0) throw err(400, 'project_id 는 양의 정수이거나 "none" 이어야 합니다.');
      rows = rows.filter((t) => t.project_id === n);
    }
  }
  return { tasks: rows };
}

function createTask(body) {
  if (!body || !body.title) throw err(400, 'title 은 필수입니다.');
  if (body.project_id != null && !store.projects.some((p) => p.id === body.project_id)) {
    throw err(400, '연결할 프로젝트를 찾을 수 없습니다.');
  }
  const now = nowIso();
  const task = {
    id: nextId(),
    title: body.title,
    description: body.description || '',
    due_date: body.due_date || null,
    priority: body.priority || 'medium',
    status: body.status || 'todo',
    project_id: body.project_id ?? null,
    tags: [],
    created_at: now,
    updated_at: now,
  };
  store.tasks.push(task);
  return { task };
}

function updateTask(id, body) {
  const task = store.tasks.find((x) => x.id === Number(id));
  if (!task) throw err(404, '할일을 찾을 수 없습니다.');
  // tags 는 전용 엔드포인트(/tasks/:id/tags)로만 바뀐다 — 병합 키에서 제외.
  for (const k of ['title', 'description', 'due_date', 'priority', 'status', 'project_id']) {
    if (body && body[k] !== undefined) task[k] = body[k];
  }
  task.updated_at = nowIso();
  return { task };
}

// 태그 정규화 (backend/src/services/tasks.js:normalizeTag 최소 흉내)
function normalizeTag(raw) {
  const tag = String(raw ?? '').trim();
  if (tag.length < 1 || tag.length > 20 || /[\n\r,]/.test(tag)) {
    throw err(400, '태그는 1~20자여야 합니다.');
  }
  return tag;
}

function addTag(id, body) {
  const task = store.tasks.find((x) => x.id === Number(id));
  if (!task) throw err(404, '할일을 찾을 수 없습니다.');
  const tag = normalizeTag((body || {}).tag);
  if (!Array.isArray(task.tags)) task.tags = [];
  if (!task.tags.includes(tag)) task.tags = [...task.tags, tag].sort();
  return { task };
}

function removeTag(id, tag) {
  const task = store.tasks.find((x) => x.id === Number(id));
  if (!task) throw err(404, '할일을 찾을 수 없습니다.');
  task.tags = (task.tags || []).filter((x) => x !== tag);
  return { task };
}

function createProject(body) {
  if (!body || !body.name) throw err(400, 'name 은 필수입니다.');
  const now = nowIso();
  const project = {
    id: nextId(),
    name: body.name,
    progress: body.progress ?? 0,
    status: body.status || 'active',
    notion_id: body.notion_id || null,
    created_at: now,
    updated_at: now,
  };
  store.projects.push(project);
  return { project };
}

function updateProject(id, body) {
  const project = store.projects.find((x) => x.id === Number(id));
  if (!project) throw err(404, '프로젝트를 찾을 수 없습니다.');
  for (const k of ['name', 'progress', 'status', 'notion_id']) {
    if (body && body[k] !== undefined) project[k] = body[k];
  }
  project.updated_at = nowIso();
  return { project };
}

function listEvents(query) {
  const fromMs = query.from ? Date.parse(query.from) : null;
  const toMs = query.to ? Date.parse(query.to) : null;
  if (query.from && Number.isNaN(fromMs)) throw err(400, 'from 은 ISO8601 형식이어야 합니다.');
  if (query.to && Number.isNaN(toMs)) throw err(400, 'to 는 ISO8601 형식이어야 합니다.');
  const events = store.calendar_events
    .filter((e) => {
      const s = e.start_time ? Date.parse(e.start_time) : NaN;
      if (Number.isNaN(s)) return true;
      if (fromMs != null && s < fromMs) return false;
      if (toMs != null && s > toMs) return false;
      return true;
    })
    .slice()
    .sort((a, b) => {
      const am = a.start_time ? Date.parse(a.start_time) : NaN;
      const bm = b.start_time ? Date.parse(b.start_time) : NaN;
      if (Number.isNaN(am) && Number.isNaN(bm)) return 0;
      if (Number.isNaN(am)) return 1;
      if (Number.isNaN(bm)) return -1;
      return am - bm;
    });
  return { events };
}

// 에이전트 활동 위젯(P7, FR-AGENT-08) — 백엔드 GET /api/agent/activity 의 행복 경로.
function agentActivity(query) {
  const lim = Number(query.limit) > 0 ? Number(query.limit) : 10;
  const logs = store.sync_logs.slice().reverse().slice(0, lim);

  // 내일 07:30 (데모는 스케줄 고정)
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 30, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);

  return {
    logs,
    health: { supabase: 'unconfigured', detail: '데모 모드 — Supabase 미설정', host: null },
    nextRun: { at: next.toISOString(), hour: 7, minute: 30, source: 'schedule' },
    runNow: {
      pending: store._runNowPending,
      requestedAt: store._runNowRequestedAt ?? null,
      available: true,
    },
    checkedAt: nowIso(),
  };
}

// 백엔드 POST /api/agent/run-now — 데모는 즉시 성공 1건을 이력에 남긴다.
function agentRunNow() {
  const requestedAt = nowIso();
  store._runNowPending = false;
  store._runNowRequestedAt = requestedAt;
  store.sync_logs.push({
    id: nextId(),
    service: 'gmail',
    status: 'success',
    last_sync: requestedAt,
    error_message: null,
  });
  // 데모는 상주 에이전트가 없어 즉시 실행한다 — 후속 activity 의 pending:false 와 일관.
  return { ok: true, pending: false, requestedAt, alreadyPending: false, note: '데모 모드 — 즉시 실행됨' };
}

// ── OKR (FR-OKR-01~04) — 백엔드 라우트의 행복 경로 + 최소 검증 ──────────
const PERIOD_RE = /^\d{4}(-Q[1-4])?$/;

function okrDashboard(query) {
  const includeArchived = query.includeArchived === '1' || query.includeArchived === 'true';
  const objs = store.objectives.filter((o) => includeArchived || o.status !== 'archived');
  const krsByObj = new Map();
  for (const kr of store.key_results) {
    if (!krsByObj.has(kr.objective_id)) krsByObj.set(kr.objective_id, []);
    krsByObj.get(kr.objective_id).push(kr);
  }
  const included = [];
  const objectives = objs.map((o) => {
    const krs = krsByObj.get(o.id) || [];
    const keyResults = krs.map((kr) => {
      included.push(kr);
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
  const { krAvgPct, bucket } = summarize(included, objectives.length);
  return {
    objectives,
    summary: { krAvgPct, objectiveCount: objectives.length, keyResultCount: included.length, bucket },
  };
}

function okrTrend() {
  const byMonth = new Map();
  for (const s of store.kr_snapshots) {
    if (!byMonth.has(s.month)) byMonth.set(s.month, []);
    byMonth.get(s.month).push(s.pct);
  }
  const points = [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-12)
    .map(([month, pcts]) => ({
      month,
      krAvgPct: round3(pcts.reduce((x, y) => x + y, 0) / pcts.length),
    }));
  return { points };
}

function createObjective(body) {
  const b = body || {};
  const title = String(b.title ?? '').trim();
  if (!title) throw err(400, 'title 은 필수입니다.');
  if (!PERIOD_RE.test(String(b.period ?? '').trim())) {
    throw err(400, 'period 는 YYYY 또는 YYYY-Q1~Q4 형식이어야 합니다.');
  }
  const status = b.status ?? 'active';
  if (!['active', 'done', 'archived'].includes(status)) {
    throw err(400, 'status 는 active·done·archived 중 하나여야 합니다.');
  }
  const now = nowIso();
  const objective = { id: nextId(), title, period: b.period.trim(), status, created_at: now, updated_at: now };
  store.objectives.push(objective);
  return { objective };
}

function updateObjective(id, body) {
  const objective = store.objectives.find((o) => o.id === Number(id));
  if (!objective) throw err(404, '목표를 찾을 수 없습니다.');
  if (body && body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) throw err(400, 'title 은 필수입니다.');
    objective.title = title;
  }
  if (body && body.period !== undefined) {
    if (!PERIOD_RE.test(String(body.period).trim())) throw err(400, 'period 는 YYYY 또는 YYYY-Q1~Q4 형식이어야 합니다.');
    objective.period = body.period.trim();
  }
  if (body && body.status !== undefined) {
    if (!['active', 'done', 'archived'].includes(body.status)) throw err(400, 'status 는 active·done·archived 중 하나여야 합니다.');
    objective.status = body.status;
  }
  objective.updated_at = nowIso();
  return { objective };
}

function deleteObjective(id) {
  const nid = Number(id);
  if (!store.objectives.some((o) => o.id === nid)) throw err(404, '목표를 찾을 수 없습니다.');
  store.objectives = store.objectives.filter((o) => o.id !== nid);
  // CASCADE: 하위 KR·스냅샷 제거
  const krIds = store.key_results.filter((k) => k.objective_id === nid).map((k) => k.id);
  store.key_results = store.key_results.filter((k) => k.objective_id !== nid);
  store.kr_snapshots = store.kr_snapshots.filter((s) => !krIds.includes(s.key_result_id));
  return { ok: true };
}

function createKeyResult(body) {
  const b = body || {};
  const objId = Number(b.objective_id);
  if (!store.objectives.some((o) => o.id === objId)) {
    throw err(400, '목표(objective)를 찾을 수 없습니다.');
  }
  const title = String(b.title ?? '').trim();
  if (!title) throw err(400, 'title 은 필수입니다.');
  const target = Number(b.target);
  if (!Number.isFinite(target) || target < 0) throw err(400, 'target 은 0 이상의 숫자여야 합니다.');
  const now = nowIso();
  const keyResult = {
    id: nextId(),
    objective_id: objId,
    title,
    target,
    current: b.current === undefined ? 0 : Number(b.current),
    unit: b.unit && String(b.unit).trim() ? String(b.unit).trim() : null,
    project_id: b.project_id ?? null,
    created_at: now,
    updated_at: now,
  };
  store.key_results.push(keyResult);
  return { keyResult };
}

function updateKeyResult(id, body) {
  const keyResult = store.key_results.find((k) => k.id === Number(id));
  if (!keyResult) throw err(404, '핵심 결과를 찾을 수 없습니다.');
  const b = body || {};
  if (b.title !== undefined) {
    const title = String(b.title).trim();
    if (!title) throw err(400, 'title 은 필수입니다.');
    keyResult.title = title;
  }
  if (b.target !== undefined) {
    const target = Number(b.target);
    if (!Number.isFinite(target) || target < 0) throw err(400, 'target 은 0 이상의 숫자여야 합니다.');
    keyResult.target = target;
  }
  if (b.current !== undefined) keyResult.current = Number(b.current);
  if (b.unit !== undefined) keyResult.unit = b.unit && String(b.unit).trim() ? String(b.unit).trim() : null;
  if (b.project_id !== undefined) keyResult.project_id = b.project_id;
  keyResult.updated_at = nowIso();
  return { keyResult };
}

function deleteKeyResult(id) {
  const nid = Number(id);
  if (!store.key_results.some((k) => k.id === nid)) throw err(404, '핵심 결과를 찾을 수 없습니다.');
  store.key_results = store.key_results.filter((k) => k.id !== nid);
  store.kr_snapshots = store.kr_snapshots.filter((s) => s.key_result_id !== nid);
  return { ok: true };
}

function plannerWeekly() {
  const b = bucketTasks(store.tasks, new Date());
  const pick = (t) => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date,
    priority: t.priority,
    status: t.status,
    tags: t.tags || [],
  });
  return {
    lastWeek: { done: b.lastWeek.done, total: b.lastWeek.total },
    thisWeek: { done: b.thisWeek.done, total: b.thisWeek.total, items: b.thisWeek.items.slice(0, 50).map(pick) },
    nextWeek: { total: b.nextWeek.total, items: b.nextWeek.items.slice(0, 50).map(pick) },
  };
}

// method+path 를 받아 백엔드와 같은 형태의 객체를 반환한다 (실패 시 throw).
export async function demoRequest(method, path, body) {
  const { p, q } = parse(path);

  if (method === 'GET' && p === '/health') return { status: 'ok', demo: true };

  if (p === '/tasks' && method === 'GET') return listTasks(q);
  if (p === '/tasks' && method === 'POST') return createTask(body);
  // 태그 분기는 반드시 일반 /tasks/ PUT·DELETE 분기보다 먼저 (경로 매칭 순서).
  if (method === 'POST' && /^\/tasks\/\d+\/tags$/.test(p)) return addTag(p.split('/')[2], body);
  if (method === 'DELETE' && /^\/tasks\/\d+\/tags\/.+$/.test(p)) {
    const parts = p.split('/');
    return removeTag(parts[2], decodeURIComponent(parts.slice(4).join('/')));
  }
  if (p.startsWith('/tasks/') && method === 'PUT') return updateTask(p.slice(7), body);
  if (p.startsWith('/tasks/') && method === 'DELETE') {
    store.tasks = store.tasks.filter((t) => t.id !== Number(p.slice(7)));
    return { ok: true };
  }

  if (p === '/projects' && method === 'GET') return { projects: store.projects };
  if (p === '/projects' && method === 'POST') return createProject(body);
  if (p.startsWith('/projects/') && method === 'PUT') return updateProject(p.slice(10), body);
  if (p.startsWith('/projects/') && method === 'DELETE') {
    const id = Number(p.slice(10));
    store.projects = store.projects.filter((x) => x.id !== id);
    store.tasks.forEach((t) => {
      if (t.project_id === id) t.project_id = null;
    });
    return { ok: true };
  }

  if (p === '/calendar/events' && method === 'GET') return listEvents(q);
  if (p === '/mail/unread' && method === 'GET') return { emails: [] };
  if (p === '/brief/today' && method === 'GET') return { brief: store.brief };
  if (p === '/diagrams' && method === 'GET') return { diagrams: store.diagrams ?? [] };
  if (p === '/sync/logs' && method === 'GET') {
    const lim = Number(q.limit) > 0 ? Number(q.limit) : 50;
    return { logs: store.sync_logs.slice().reverse().slice(0, lim) };
  }
  if (p === '/agent/activity' && method === 'GET') return agentActivity(q);
  if (p === '/agent/run-now' && method === 'POST') return agentRunNow();

  // OKR — 구체 경로를 /okr 보다 먼저 매칭한다.
  if (p === '/okr/trend' && method === 'GET') return okrTrend();
  if (p === '/okr/objectives' && method === 'POST') return createObjective(body);
  if (p.startsWith('/okr/objectives/') && method === 'PUT') return updateObjective(p.slice(16), body);
  if (p.startsWith('/okr/objectives/') && method === 'DELETE') return deleteObjective(p.slice(16));
  if (p === '/okr/key-results' && method === 'POST') return createKeyResult(body);
  if (p.startsWith('/okr/key-results/') && method === 'PUT') return updateKeyResult(p.slice(17), body);
  if (p.startsWith('/okr/key-results/') && method === 'DELETE') return deleteKeyResult(p.slice(17));
  if (p === '/okr' && method === 'GET') return okrDashboard(q);
  if (p === '/planner/weekly' && method === 'GET') return plannerWeekly();

  throw err(404, '요청을 처리하지 못했습니다.');
}

// 테스트·리셋용
export function _resetDemoStore() {
  store = createDataset();
}
