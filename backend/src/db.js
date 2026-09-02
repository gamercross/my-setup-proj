// 데이터베이스 모듈 (Week 1 임시 구현)
// Week 2에서 SQLite(better-sqlite3 등)로 교체한다.
// 지금은 메모리 배열로 최소 인터페이스만 제공한다.

// 임시 인메모리 저장소
const memory = {
  tasks: [],
  projects: [],
};

// id 시퀀스 (배열 length 기반 생성은 삭제 시 충돌하므로 증가 카운터 사용)
let taskSeq = 0;
let projectSeq = 0;

// 할일에서 병합 허용할 필드
const TASK_FIELDS = ['title', 'description', 'due_date', 'priority', 'status'];
// 프로젝트에서 병합 허용할 필드
const PROJECT_FIELDS = ['name', 'progress', 'status', 'notion_id'];

// ── 할일(tasks) ─────────────────────────────

// 할일 목록 조회
function getTasks() {
  return memory.tasks;
}

// 할일 단건 조회 (없으면 undefined)
function getTask(id) {
  const nid = Number(id);
  return memory.tasks.find((t) => t.id === nid);
}

// 할일 추가
function addTask(task) {
  if (!task || !task.title) {
    throw new Error('title 은 필수입니다.');
  }
  const now = new Date().toISOString();
  const row = {
    id: ++taskSeq,
    title: task.title,
    description: task.description || '',
    due_date: task.due_date || null,
    priority: task.priority || 'medium',
    status: task.status || 'todo',
    created_at: now,
    updated_at: now,
  };
  memory.tasks.push(row);
  return row;
}

// 할일 수정 (없으면 undefined, 허용 필드만 병합)
function updateTask(id, patch) {
  const row = getTask(id);
  if (!row) return undefined;
  for (const key of TASK_FIELDS) {
    if (patch && patch[key] !== undefined) {
      row[key] = patch[key];
    }
  }
  row.updated_at = new Date().toISOString();
  return row;
}

// 할일 삭제 (삭제 성공 여부 boolean 반환)
function deleteTask(id) {
  const nid = Number(id);
  const idx = memory.tasks.findIndex((t) => t.id === nid);
  if (idx === -1) return false;
  memory.tasks.splice(idx, 1);
  return true;
}

// ── 프로젝트(projects) ─────────────────────────────

// 진행도 값 검증 (0~100)
function assertProgress(v) {
  if (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 100) {
    throw new Error('progress 는 0~100 사이 숫자여야 합니다.');
  }
}

// 프로젝트 목록 조회
function getProjects() {
  return memory.projects;
}

// 프로젝트 단건 조회 (없으면 undefined)
function getProject(id) {
  const nid = Number(id);
  return memory.projects.find((p) => p.id === nid);
}

// 프로젝트 추가
function addProject(p) {
  if (!p || !p.name) {
    throw new Error('name 은 필수입니다.');
  }
  const progress = p.progress === undefined ? 0 : p.progress;
  assertProgress(progress);
  const now = new Date().toISOString();
  const row = {
    id: ++projectSeq,
    name: p.name,
    progress,
    status: p.status || 'active',
    notion_id: p.notion_id || null,
    created_at: now,
    updated_at: now,
  };
  memory.projects.push(row);
  return row;
}

// 프로젝트 수정 (없으면 undefined, 허용 필드만 병합)
function updateProject(id, patch) {
  const row = getProject(id);
  if (!row) return undefined;
  for (const key of PROJECT_FIELDS) {
    if (patch && patch[key] !== undefined) {
      if (key === 'progress') assertProgress(patch.progress);
      row[key] = patch[key];
    }
  }
  row.updated_at = new Date().toISOString();
  return row;
}

// 프로젝트 삭제 (삭제 성공 여부 boolean 반환)
function deleteProject(id) {
  const nid = Number(id);
  const idx = memory.projects.findIndex((p) => p.id === nid);
  if (idx === -1) return false;
  memory.projects.splice(idx, 1);
  return true;
}

module.exports = {
  getTasks,
  getTask,
  addTask,
  updateTask,
  deleteTask,
  getProjects,
  getProject,
  addProject,
  updateProject,
  deleteProject,
};
