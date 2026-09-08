// 파일 트리 API 테스트 (TC-TREE-01~06) — ADR-0031 FR-UI-06 AC-1
// - process.env.REPO_PATH 로 임시 저장소 픽스처를 주입한다. 각 테스트 후 정리.

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');

function makeRepoFixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-fixture-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

let fixtureDir = null;

afterEach(() => {
  delete process.env.REPO_PATH;
  if (fixtureDir) {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    fixtureDir = null;
  }
});

// 트리에서 path 로 노드를 찾는다.
function findNode(tree, target) {
  for (const n of tree) {
    if (n.path === target) return n;
    if (n.children) {
      const hit = findNode(n.children, target);
      if (hit) return hit;
    }
  }
  return null;
}
function flatten(tree, acc = []) {
  for (const n of tree) {
    acc.push(n.path);
    if (n.children) flatten(n.children, acc);
  }
  return acc;
}

describe('파일 트리 API', () => {
  it('TC-TREE-01: docs/ 트리 + 루트 README.md, 각 노드 name/path/type', async () => {
    fixtureDir = makeRepoFixture({
      'docs/a.md': '# A',
      'docs/sub/b.md': '# B',
      'README.md': '# readme',
    });
    process.env.REPO_PATH = fixtureDir;
    const res = await request(createTestApp()).get('/api/tree');

    assert.equal(res.status, 200);
    const docs = findNode(res.body.tree, 'docs');
    assert.ok(docs && docs.type === 'dir');
    assert.ok(findNode(res.body.tree, 'docs/a.md'));
    assert.ok(findNode(res.body.tree, 'docs/sub/b.md'));
    const readme = findNode(res.body.tree, 'README.md');
    assert.ok(readme && readme.type === 'file' && readme.name === 'README.md');
    for (const p of ['docs/a.md', 'docs/sub/b.md']) {
      const n = findNode(res.body.tree, p);
      assert.equal(n.type, 'file');
      assert.ok(n.name.endsWith('.md'));
    }
  });

  it('TC-TREE-02: REPO_PATH 가 없는 경로면 200 { tree: [], truncated: false }', async () => {
    process.env.REPO_PATH = path.join(os.tmpdir(), 'nope-' + Date.now());
    const res = await request(createTestApp()).get('/api/tree');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { tree: [], truncated: false });
  });

  it('TC-TREE-03: 제외 목록(.env·node_modules·.git·venv·dist·*.log·__pycache__·숨김)은 미노출', async () => {
    fixtureDir = makeRepoFixture({
      'docs/ok.md': '# ok',
      '.env': 'SECRET=1',
      'node_modules/pkg/x.md': '# x',
      '.git/config.md': '# x',
      'venv/lib.md': '# x',
      'dist/out.md': '# x',
      'a.log': 'log',
      '__pycache__/c.md': '# x',
      '.hidden/h.md': '# x',
    });
    process.env.REPO_PATH = fixtureDir;
    const res = await request(createTestApp()).get('/api/tree');
    const paths = flatten(res.body.tree);
    assert.deepEqual(paths.sort(), ['docs', 'docs/ok.md']);
  });

  it('TC-TREE-04: .md 만 노출 — 소스 파일(.js/.py/.sh)은 미노출 (PO-12)', async () => {
    fixtureDir = makeRepoFixture({
      'docs/keep.md': '# keep',
      'docs/x.py': 'print(1)',
      'frontend/src/App.jsx': 'x',
      'backend/src/a.js': 'x',
      'agent/y.sh': 'x',
    });
    process.env.REPO_PATH = fixtureDir;
    const res = await request(createTestApp()).get('/api/tree');
    const paths = flatten(res.body.tree);
    assert.ok(paths.every((p) => p === 'docs' || p.endsWith('.md')));
    assert.ok(!paths.includes('docs/x.py'));
  });

  it('TC-TREE-05: 깊이 9 중첩은 8단까지만, .md 없는 디렉터리는 노드 자체 없음', async () => {
    const deep = 'docs/d1/d2/d3/d4/d5/d6/d7/d8/d9/leaf.md';
    fixtureDir = makeRepoFixture({ [deep]: '# leaf', 'docs/empty/.keep': '' });
    process.env.REPO_PATH = fixtureDir;
    const res = await request(createTestApp()).get('/api/tree');
    const paths = flatten(res.body.tree);
    // depth 상한으로 leaf.md 까지 도달 못 함
    assert.ok(!paths.includes(deep));
    // .md 자손이 없는 empty 디렉터리는 가지치기
    assert.ok(!paths.includes('docs/empty'));
    assert.equal(res.body.truncated, true);
  });

  it('TC-TREE-06: 심링크 디렉터리·파일은 스킵', async (t) => {
    fixtureDir = makeRepoFixture({ 'docs/real.md': '# real', 'outside/secret.md': '# secret' });
    try {
      fs.symlinkSync(path.join(fixtureDir, 'outside'), path.join(fixtureDir, 'docs', 'linkdir'));
      fs.symlinkSync(
        path.join(fixtureDir, 'outside', 'secret.md'),
        path.join(fixtureDir, 'docs', 'linkfile.md')
      );
    } catch {
      t.skip('symlink 미지원 환경');
      return;
    }
    process.env.REPO_PATH = fixtureDir;
    const res = await request(createTestApp()).get('/api/tree');
    const paths = flatten(res.body.tree);
    assert.deepEqual(paths.sort(), ['docs', 'docs/real.md']);
  });
});
