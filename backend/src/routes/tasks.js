// 할일(tasks) CRUD 라우트 (모두 /api/tasks 하위)

const router = require('express').Router();
const db = require('../db');

// db 검증 오류를 400, 그 외를 500 으로 매핑하는 헬퍼
function isValidationError(err) {
  return err && /필수|0~100/.test(err.message || '');
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
    const task = db.addTask(req.body);
    res.status(201).json({ task });
  } catch (err) {
    if (isValidationError(err)) {
      return res.status(400).json({ error: err.message });
    }
    console.error('할일 생성 실패:', err);
    res.status(500).json({ error: '할일을 생성하지 못했습니다.' });
  }
});

// PUT /api/tasks/:id - 할일 수정
router.put('/:id', (req, res) => {
  try {
    const task = db.updateTask(req.params.id, req.body || {});
    if (!task) {
      return res.status(404).json({ error: '할일을 찾을 수 없습니다.' });
    }
    res.json({ task });
  } catch (err) {
    if (isValidationError(err)) {
      return res.status(400).json({ error: err.message });
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
