// 할일(tasks) CRUD 라우트 (모두 /api/tasks 하위)

const router = require('express').Router();
const db = require('../db');
const { isValidationError, toClientMessage } = require('../errors');

// project_id 입력값을 검증한다 (ADR-0012).
// 반환: { ok: true } | { ok: false, error: '한국어 메시지' }
// - undefined: 미지정(통과, 기본 null)   - null: 연결 해제(통과)
// - 정수: 존재하는 프로젝트여야 통과      - 그 외: 400
function checkProjectId(value) {
  if (value === undefined || value === null) return { ok: true };
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return { ok: false, error: 'project_id 는 프로젝트 id(정수) 또는 null 이어야 합니다.' };
  }
  if (!db.getProject(value)) {
    return { ok: false, error: '연결할 프로젝트를 찾을 수 없습니다.' };
  }
  return { ok: true };
}

// GET /api/tasks - 할일 전체 목록
router.get('/', (req, res) => {
  try {
    res.json({ tasks: db.getTasks() });
  } catch (err) {
    console.error('할일 조회 실패:', err);
    res.status(500).json({ error: '할일을 불러오지 못했습니다.' });
  }
});

// GET /api/tasks/:id - 할일 단건 조회
router.get('/:id', (req, res) => {
  try {
    const task = db.getTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: '할일을 찾을 수 없습니다.' });
    }
    res.json({ task });
  } catch (err) {
    console.error('할일 조회 실패:', err);
    res.status(500).json({ error: '할일을 불러오지 못했습니다.' });
  }
});

// POST /api/tasks - 할일 생성
router.post('/', (req, res) => {
  try {
    if (!req.body || !req.body.title) {
      return res.status(400).json({ error: 'title 은 필수입니다.' });
    }
    if ('project_id' in req.body) {
      const check = checkProjectId(req.body.project_id);
      if (!check.ok) return res.status(400).json({ error: check.error });
    }
    const task = db.addTask(req.body);
    res.status(201).json({ task });
  } catch (err) {
    if (isValidationError(err)) {
      return res.status(400).json({ error: toClientMessage(err) });
    }
    console.error('할일 생성 실패:', err);
    res.status(500).json({ error: '할일을 생성하지 못했습니다.' });
  }
});

// PUT /api/tasks/:id - 할일 수정
router.put('/:id', (req, res) => {
  try {
    // 없는 task 는 project_id 검증보다 먼저 404 를 반환한다
    if (!db.getTask(req.params.id)) {
      return res.status(404).json({ error: '할일을 찾을 수 없습니다.' });
    }
    if (req.body && 'project_id' in req.body) {
      const check = checkProjectId(req.body.project_id);
      if (!check.ok) return res.status(400).json({ error: check.error });
    }
    const task = db.updateTask(req.params.id, req.body || {});
    if (!task) {
      return res.status(404).json({ error: '할일을 찾을 수 없습니다.' });
    }
    res.json({ task });
  } catch (err) {
    if (isValidationError(err)) {
      return res.status(400).json({ error: toClientMessage(err) });
    }
    console.error('할일 수정 실패:', err);
    res.status(500).json({ error: '할일을 수정하지 못했습니다.' });
  }
});

// DELETE /api/tasks/:id - 할일 삭제
router.delete('/:id', (req, res) => {
  try {
    const ok = db.deleteTask(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: '할일을 찾을 수 없습니다.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('할일 삭제 실패:', err);
    res.status(500).json({ error: '할일을 삭제하지 못했습니다.' });
  }
});

module.exports = router;
