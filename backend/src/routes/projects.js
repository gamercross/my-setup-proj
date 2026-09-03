// 프로젝트(projects) CRUD 라우트 (모두 /api/projects 하위)

const router = require('express').Router();
const db = require('../db');
const { isValidationError, toClientMessage } = require('../errors');

// GET /api/projects - 프로젝트 전체 목록
router.get('/', (req, res) => {
  try {
    res.json({ projects: db.getProjects() });
  } catch (err) {
    console.error('프로젝트 조회 실패:', err);
    res.status(500).json({ error: '프로젝트를 불러오지 못했습니다.' });
  }
});

// GET /api/projects/:id - 프로젝트 단건 조회
router.get('/:id', (req, res) => {
  try {
    const project = db.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    res.json({ project });
  } catch (err) {
    console.error('프로젝트 조회 실패:', err);
    res.status(500).json({ error: '프로젝트를 불러오지 못했습니다.' });
  }
});

// POST /api/projects - 프로젝트 생성
router.post('/', (req, res) => {
  try {
    if (!req.body || !req.body.name) {
      return res.status(400).json({ error: 'name 은 필수입니다.' });
    }
    if (req.body.progress !== undefined) {
      const v = req.body.progress;
      if (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 100) {
        return res.status(400).json({ error: 'progress 는 0~100 사이 숫자여야 합니다.' });
      }
    }
    const project = db.addProject(req.body);
    res.status(201).json({ project });
  } catch (err) {
    if (isValidationError(err)) {
      return res.status(400).json({ error: toClientMessage(err) });
    }
    console.error('프로젝트 생성 실패:', err);
    res.status(500).json({ error: '프로젝트를 생성하지 못했습니다.' });
  }
});

// PUT /api/projects/:id - 프로젝트 수정
router.put('/:id', (req, res) => {
  try {
    // 없는 id 는 progress 값과 무관하게 404 를 우선한다
    if (!db.getProject(req.params.id)) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    if (req.body && req.body.progress !== undefined) {
      const v = req.body.progress;
      if (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 100) {
        return res.status(400).json({ error: 'progress 는 0~100 사이 숫자여야 합니다.' });
      }
    }
    const project = db.updateProject(req.params.id, req.body || {});
    if (!project) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    res.json({ project });
  } catch (err) {
    if (isValidationError(err)) {
      return res.status(400).json({ error: toClientMessage(err) });
    }
    console.error('프로젝트 수정 실패:', err);
    res.status(500).json({ error: '프로젝트를 수정하지 못했습니다.' });
  }
});

// DELETE /api/projects/:id - 프로젝트 삭제
router.delete('/:id', (req, res) => {
  try {
    const ok = db.deleteProject(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('프로젝트 삭제 실패:', err);
    res.status(500).json({ error: '프로젝트를 삭제하지 못했습니다.' });
  }
});

module.exports = router;
