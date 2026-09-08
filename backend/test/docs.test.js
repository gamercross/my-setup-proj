// 문서 본문 API 테스트 (TC-DOCS-01~10) — ADR-0031 FR-UI-06 AC-2·4·5
// - process.env.REPO_PATH 로 임시 저장소 픽스처를 주입한다. 각 테스트 후 정리.

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');
const { tokenize, resolveDocPath } = require('../src/services/docs');

function makeRepoFixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-docs-'));
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

const SAMPLE = [
  '# 제목',
  '',
  '문단 텍스트에 **강조** 와 `코드` 와 [링크](https://example.com) 가 있다.',
  '',
  '- 항목 1',
  '- 항목 2',
  '',
  '| 이름 | 값 |',
  '| :--- | ---: |',
  '| a | 1 |',
  '',
  '```js',
  'const x = 1;',
  '```',
  '',
  '> 인용문입니다.',
  '',
  '---',
  '',
  '```mermaid',
  'graph TD',
  '  A --> B',
  '```',
].join('\n');

describe('문서 본문 API', () => {
  it('TC-DOCS-01: docs/x.md → 200 { path, tokens }, 각 블록 타입 존재', async () => {
    fixtureDir = makeRepoFixture({ 'docs/x.md': SAMPLE });
    process.env.REPO_PATH = fixtureDir;
    const res = await request(createTestApp()).get('/api/docs/docs%2Fx.md');
    assert.equal(res.status, 200);
    assert.equal(res.body.path, 'docs/x.md');
    const types = new Set(res.body.tokens.map((t) => t.type));
    for (const want of ['heading', 'paragraph', 'list', 'table', 'code', 'blockquote', 'hr']) {
      assert.ok(types.has(want), `누락: ${want}`);
    }
  });

  it('TC-DOCS-02: ```mermaid 펜스 → { type: "code", lang: "mermaid" }', async () => {
    fixtureDir = makeRepoFixture({ 'docs/m.md': '```mermaid\ngraph TD\n A-->B\n```\n' });
    process.env.REPO_PATH = fixtureDir;
    const res = await request(createTestApp()).get('/api/docs/docs%2Fm.md');
    assert.equal(res.status, 200);
    const code = res.body.tokens.find((t) => t.type === 'code');
    assert.equal(code.lang, 'mermaid');
    assert.ok(code.code.includes('graph TD'));
  });

  it('TC-DOCS-03: traversal·절대경로 → 400', async () => {
    fixtureDir = makeRepoFixture({ 'docs/x.md': '# x' });
    process.env.REPO_PATH = fixtureDir;
    const app = createTestApp();
    for (const p of [
      '/api/docs/..%2F..%2Fetc%2Fpasswd',
      '/api/docs/..%2F.env',
      '/api/docs/docs%2F..%2F..%2Fx.md',
    ]) {
      const res = await request(app).get(p);
      assert.equal(res.status, 400, p);
    }
    // 절대경로는 서비스 레벨에서 확인
    assert.equal(resolveDocPath('/etc/passwd').code, 400);
    assert.equal(resolveDocPath('C:\\x.md').code, 400);
  });

  it('TC-DOCS-04: 비-.md·허용 밖 루트 → 400', async () => {
    fixtureDir = makeRepoFixture({
      'docs/x.md': '# x',
      'backend/src/app.js': 'x',
      'docs/a.py': 'x',
      'frontend/README.md': '# fe',
    });
    process.env.REPO_PATH = fixtureDir;
    const app = createTestApp();
    for (const p of [
      '/api/docs/backend%2Fsrc%2Fapp.js',
      '/api/docs/docs%2Fa.py',
      '/api/docs/agent%2Fx.sh',
      '/api/docs/frontend%2FREADME.md',
    ]) {
      const res = await request(app).get(p);
      assert.equal(res.status, 400, p);
    }
  });

  it('TC-DOCS-05: 존재하지 않는 docs/none.md → 404', async () => {
    fixtureDir = makeRepoFixture({ 'docs/x.md': '# x' });
    process.env.REPO_PATH = fixtureDir;
    const res = await request(createTestApp()).get('/api/docs/docs%2Fnone.md');
    assert.equal(res.status, 404);
  });

  it('TC-DOCS-06: 루트 밖을 가리키는 심링크 파일 → 400/404, 내용 미노출', async (t) => {
    fixtureDir = makeRepoFixture({ 'docs/x.md': '# x', 'outside/secret.md': '# SECRET' });
    try {
      fs.symlinkSync(
        path.join(fixtureDir, 'outside', 'secret.md'),
        path.join(fixtureDir, 'docs', 'link.md')
      );
    } catch {
      t.skip('symlink 미지원');
      return;
    }
    process.env.REPO_PATH = fixtureDir;
    const res = await request(createTestApp()).get('/api/docs/docs%2Flink.md');
    assert.ok([400, 404].includes(res.status));
    assert.ok(!JSON.stringify(res.body).includes('SECRET'));
  });

  it('TC-DOCS-07: 이중 인코딩(%252e%252e%252f)은 traversal 로 통과하지 않는다', async () => {
    fixtureDir = makeRepoFixture({ 'docs/x.md': '# x' });
    process.env.REPO_PATH = fixtureDir;
    const res = await request(createTestApp()).get('/api/docs/%252e%252e%252fetc%252fpasswd');
    assert.equal(res.status, 400);
  });

  it('TC-DOCS-08: 파일 수정 후 재요청 → 새 토큰 반영 (캐시 없음)', async () => {
    fixtureDir = makeRepoFixture({ 'docs/x.md': '# 처음' });
    process.env.REPO_PATH = fixtureDir;
    const app = createTestApp();
    const r1 = await request(app).get('/api/docs/docs%2Fx.md');
    assert.equal(r1.body.tokens[0].inline[0].text, '처음');
    fs.writeFileSync(path.join(fixtureDir, 'docs', 'x.md'), '# 나중');
    const r2 = await request(app).get('/api/docs/docs%2Fx.md');
    assert.equal(r2.body.tokens[0].inline[0].text, '나중');
  });

  it('TC-DOCS-09: tokenize 순수 함수 — 미지원 문법은 원문 text', () => {
    // 4중 백틱 안의 3중 mermaid → 바깥 하나의 code 토큰
    const nested = tokenize('````markdown\n```mermaid\ngraph TD\n```\n````\n');
    assert.equal(nested.filter((t) => t.type === 'code').length, 1);
    assert.equal(nested[0].lang, 'markdown');

    // 닫히지 않은 펜스 → 무손실 code 토큰
    const unclosed = tokenize('```\ncode line\n');
    assert.equal(unclosed[0].type, 'code');
    assert.ok(unclosed[0].code.includes('code line'));

    // 이미지·HTML·각주·autolink → text
    const misc = tokenize('![alt](x.png) <details> [^1] <https://a.b>');
    const flat = misc[0].inline.map((n) => n.type);
    assert.ok(!flat.includes('link'));

    // javascript: 링크는 link 아님
    const js = tokenize('[클릭](javascript:alert(1))');
    assert.ok(!js[0].inline.some((n) => n.type === 'link'));

    // 코드블록 안 #·| 는 heading·table 아님
    const fenced = tokenize('```\n# not heading\n| a | b |\n```\n');
    assert.equal(fenced.length, 1);
    assert.equal(fenced[0].type, 'code');

    // 대문자/공백 mermaid info
    const mer = tokenize('```  Mermaid \ngraph TD\n```\n');
    assert.equal(mer[0].lang, 'mermaid');

    // 체크박스는 리터럴
    const todo = tokenize('- [x] 할일\n');
    assert.ok(todo[0].items[0].inline.map((n) => n.text).join('').includes('[x]'));
  });

  it('TC-DOCS-10: 5000 토큰 초과 → 잘림 + 안내 문단 / 빈 파일 → tokens: []', () => {
    assert.deepEqual(tokenize(''), []);
    const many = Array.from({ length: 6000 }, (_, i) => `문단 ${i}`).join('\n\n');
    const toks = tokenize(many);
    assert.ok(toks.length <= 5000);
    assert.ok(toks[toks.length - 1].inline[0].text.includes('일부만'));
  });
});
