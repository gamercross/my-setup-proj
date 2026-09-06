// 다이어그램 API 테스트 (TC-DIAG-01~05)
// - process.env.DOCS_PATH 로 임시 픽스처를 주입한다. 각 테스트 후 정리.

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

const { createTestApp } = require('./helpers/testApp');
const { parseMermaidBlocks } = require('../src/services/diagrams');

// 임시 docs 디렉터리를 만들고 { [상대경로]: 내용 } 파일을 쓴다.
function makeDocsFixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'diagrams-fixture-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

let fixtureDir = null;

afterEach(() => {
  delete process.env.DOCS_PATH;
  if (fixtureDir) {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    fixtureDir = null;
  }
});

const MERMAID_A = '## 아키텍처\n\n```mermaid\ngraph TD\n  A --> B\n```\n';
const MERMAID_B = '## 로드맵\n\n```mermaid\ngantt\n  title 계획\n```\n';

describe('다이어그램 API', () => {
  it('TC-DIAG-01: mermaid 블록 2개를 가진 문서 → 200, diagrams 2건, 각 항목 키 보유', async () => {
    fixtureDir = makeDocsFixture({ 'DESIGN.md': MERMAID_A + '\n' + MERMAID_B });
    process.env.DOCS_PATH = fixtureDir;
    const app = createTestApp();

    const res = await request(app).get('/api/diagrams');
    assert.equal(res.status, 200);
    assert.equal(res.body.diagrams.length, 2);
    for (const d of res.body.diagrams) {
      for (const key of ['doc', 'path', 'index', 'title', 'code']) {
        assert.ok(key in d, `키 누락: ${key}`);
      }
    }
    assert.ok(res.body.diagrams[0].code.includes('graph TD'));
    assert.equal(res.body.diagrams[0].path, 'docs/DESIGN.md');
  });

  it('TC-DIAG-02: docs 를 못 찾으면 200 { diagrams: [] } (500 아님)', async () => {
    process.env.DOCS_PATH = path.join(os.tmpdir(), 'does-not-exist-' + Date.now());
    const app = createTestApp();

    const res = await request(app).get('/api/diagrams');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { diagrams: [] });
  });

  it('TC-DIAG-03: ?doc=DESIGN 은 해당 문서 블록만 반환한다', async () => {
    fixtureDir = makeDocsFixture({
      'DESIGN.md': MERMAID_A,
      'ROADMAP.md': MERMAID_B,
    });
    process.env.DOCS_PATH = fixtureDir;
    const app = createTestApp();

    const res = await request(app).get('/api/diagrams?doc=DESIGN');
    assert.equal(res.status, 200);
    assert.equal(res.body.diagrams.length, 1);
    assert.equal(res.body.diagrams[0].doc, 'DESIGN');

    // 대소문자 무시
    const res2 = await request(app).get('/api/diagrams?doc=design');
    assert.equal(res2.body.diagrams.length, 1);
  });

  it('TC-DIAG-04: title 은 직전 최근접 heading, 없으면 "<doc> #<index>", bash # 주석은 heading 아님', async () => {
    const md = [
      '# 서론',
      '',
      '```bash',
      '# 이것은 heading 이 아니라 셸 주석',
      'echo hi',
      '```',
      '',
      '## 상태 그래프',
      '',
      '```mermaid',
      'stateDiagram-v2',
      '  [*] --> Idle',
      '```',
    ].join('\n');
    fixtureDir = makeDocsFixture({ 'ORCHESTRATION.md': md });
    process.env.DOCS_PATH = fixtureDir;
    const app = createTestApp();

    const res = await request(app).get('/api/diagrams');
    assert.equal(res.status, 200);
    assert.equal(res.body.diagrams.length, 1);
    assert.equal(res.body.diagrams[0].title, '상태 그래프');

    // heading 이 전혀 없는 문서
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    fixtureDir = makeDocsFixture({ 'AS_IS.md': '```mermaid\ngraph LR\n  X --> Y\n```\n' });
    process.env.DOCS_PATH = fixtureDir;
    const app2 = createTestApp();
    const res2 = await request(app2).get('/api/diagrams');
    assert.equal(res2.body.diagrams[0].title, 'AS_IS #1');
  });

  it('TC-DIAG-05: parseMermaidBlocks 순수 함수 — 4중 백틱·미닫힘·비 mermaid 펜스 처리', () => {
    // 4중 백틱 펜스 안에 3중 mermaid 예시가 있으면 수집하지 않는다
    const nested = '````markdown\n```mermaid\ngraph TD\n A-->B\n```\n````\n';
    assert.equal(parseMermaidBlocks(nested, 'X').length, 0);

    // 닫히지 않은 mermaid 펜스는 버린다
    const unclosed = '```mermaid\ngraph TD\n A-->B\n';
    assert.equal(parseMermaidBlocks(unclosed, 'X').length, 0);

    // mermaid 아닌 펜스는 무시
    const notMermaid = '```js\nconst a = 1;\n```\n';
    assert.equal(parseMermaidBlocks(notMermaid, 'X').length, 0);

    // 정상 1건 + info string 대소문자/공백 허용
    const ok = '```  Mermaid \ngraph TD\n A-->B\n```\n';
    const blocks = parseMermaidBlocks(ok, 'X');
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].code, 'graph TD\n A-->B');
  });
});
