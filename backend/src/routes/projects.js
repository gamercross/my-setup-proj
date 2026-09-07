// 프로젝트(projects) CRUD 라우트 (모두 /api/projects 하위)
// 얇은 계층: 입력을 서비스로 넘기고 결과를 직렬화한다. 도메인 규칙은 services/projects.js.
// (routes → services → db, CONVENTIONS.md)

const router = require('express').Router();
const projectsService = require('../services/projects');
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

// GET /api/projects - 프로젝트 전체 목록
router.get('/', (req, res) => {
  try {
    res.json({ projects: projectsService.listProjects() });
  } catch (err) {
    handleError(err, res, { logPrefix: '프로젝트 조회 실패:', failMessage: '프로젝트를 불러오지 못했습니다.' });
  }
});

// GET /api/projects/:id - 프로젝트 단건 조회
router.get('/:id', (req, res) => {
  try {
    const project = projectsService.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    res.json({ project });
  } catch (err) {
    handleError(err, res, { logPrefix: '프로젝트 조회 실패:', failMessage: '프로젝트를 불러오지 못했습니다.' });
  }
});

// POST /api/projects - 프로젝트 생성
router.post('/', (req, res) => {
  try {
    const project = projectsService.createProject(req.body || {});
    res.status(201).json({ project });
  } catch (err) {
    handleError(err, res, { logPrefix: '프로젝트 생성 실패:', failMessage: '프로젝트를 생성하지 못했습니다.' });
  }
});

// PUT /api/projects/:id - 프로젝트 수정
router.put('/:id', (req, res) => {
  try {
    const project = projectsService.updateProject(req.params.id, req.body || {});
    res.json({ project });
  } catch (err) {
    handleError(err, res, { logPrefix: '프로젝트 수정 실패:', failMessage: '프로젝트를 수정하지 못했습니다.' });
  }
});

// DELETE /api/projects/:id - 프로젝트 삭제
router.delete('/:id', (req, res) => {
  try {
    projectsService.deleteProject(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    handleError(err, res, { logPrefix: '프로젝트 삭제 실패:', failMessage: '프로젝트를 삭제하지 못했습니다.' });
  }
});

module.exports = router;
