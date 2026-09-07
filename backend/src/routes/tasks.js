// 할일(tasks) CRUD 라우트 (모두 /api/tasks 하위)
// 얇은 계층: 입력을 서비스로 넘기고 결과를 직렬화한다. 도메인 규칙은 services/tasks.js.
// (routes → services → db, CONVENTIONS.md)

const router = require('express').Router();
const tasksService = require('../services/tasks');
const { isValidationError, isNotFoundError, toClientMessage } = require('../errors');

// 서비스 오류를 상태코드로 매핑한다 (404 우선 → 400 → 500).
function handleError(err, res, { logPrefix, failMessage }) {
  if (isNotFoundError(err)) {
    return res.status(404).json({ error: err.message });
  }
  if (isValidationError(err)) {
    return res.status(400).json({ error: toClientMessage(err) });
  }
  console.error(logPrefix, err);
  res.status(500).json({ error: failMessage });
}

// GET /api/tasks - 할일 전체 목록
router.get('/', (req, res) => {
  try {
    res.json({ tasks: tasksService.listTasks() });
  } catch (err) {
    handleError(err, res, { logPrefix: '할일 조회 실패:', failMessage: '할일을 불러오지 못했습니다.' });
  }
});

// GET /api/tasks/:id - 할일 단건 조회
router.get('/:id', (req, res) => {
  try {
    const task = tasksService.getTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: '할일을 찾을 수 없습니다.' });
    }
    res.json({ task });
  } catch (err) {
    handleError(err, res, { logPrefix: '할일 조회 실패:', failMessage: '할일을 불러오지 못했습니다.' });
  }
});

// POST /api/tasks - 할일 생성
router.post('/', (req, res) => {
  try {
    const task = tasksService.createTask(req.body || {});
    res.status(201).json({ task });
  } catch (err) {
    handleError(err, res, { logPrefix: '할일 생성 실패:', failMessage: '할일을 생성하지 못했습니다.' });
  }
});

// PUT /api/tasks/:id - 할일 수정
router.put('/:id', (req, res) => {
  try {
    const task = tasksService.updateTask(req.params.id, req.body || {});
    res.json({ task });
  } catch (err) {
    handleError(err, res, { logPrefix: '할일 수정 실패:', failMessage: '할일을 수정하지 못했습니다.' });
  }
});

// DELETE /api/tasks/:id - 할일 삭제
router.delete('/:id', (req, res) => {
  try {
    tasksService.deleteTask(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    handleError(err, res, { logPrefix: '할일 삭제 실패:', failMessage: '할일을 삭제하지 못했습니다.' });
  }
});

module.exports = router;
