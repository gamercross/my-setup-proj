// 웹 데모(프로토타입) 요청 핸들러 (ADR-0026)
// - VITE_DEMO=1 빌드에서 api/client.js 가 네트워크 대신 이 함수로 요청을 넘긴다.
// - 백엔드 라우트의 행복 경로 + 최소 검증만 흉내 낸다. 상태는 메모리에만 산다
//   (새로고침 = 초기화). 목적은 "보여주기"이지 정합성 테스트가 아니다.

import { createDataset } from './demoData.js';

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
    created_at: now,
    updated_at: now,
  };
  store.tasks.push(task);
  return { task };
}

function updateTask(id, body) {
  const task = store.tasks.find((x) => x.id === Number(id));
  if (!task) throw err(404, '할일을 찾을 수 없습니다.');
  for (const k of ['title', 'description', 'due_date', 'priority', 'status', 'project_id']) {
    if (body && body[k] !== undefined) task[k] = body[k];
  }
  task.updated_at = nowIso();
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

// method+path 를 받아 백엔드와 같은 형태의 객체를 반환한다 (실패 시 throw).
export async function demoRequest(method, path, body) {
  const { p, q } = parse(path);

  if (method === 'GET' && p === '/health') return { status: 'ok', demo: true };

  if (p === '/tasks' && method === 'GET') return listTasks(q);
  if (p === '/tasks' && method === 'POST') return createTask(body);
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
  if (p === '/sync/logs' && method === 'GET') return { logs: [] };

  throw err(404, '요청을 처리하지 못했습니다.');
}

// 테스트·리셋용
export function _resetDemoStore() {
  store = createDataset();
}
