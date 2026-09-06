// 다이어그램(diagrams) 서비스 (Phase C4, ADR-0014)
// - `docs/**/*.md` 를 읽어 Mermaid 펜스 블록을 추출한다. 읽기 전용 — DB·에이전트 무관.
// - 라우트는 이 서비스만 호출한다. 검증·HTTP 응답은 라우트 담당.
// - 캐시 없음: 문서를 고치면 다음 요청에 즉시 반영된다 (UI.md AC-8).

const fs = require('fs');
const path = require('path');

// 안전 상한 (무한 순회·거대 응답 방지)
const MAX_DEPTH = 8; // docs/ 기준 하위 디렉터리 깊이
const MAX_FILES = 500; // 스캔할 .md 파일 수
const MAX_FILE_BYTES = 1024 * 1024; // 1MB 초과 파일은 스킵
const MAX_BLOCKS = 300; // 응답에 담을 다이어그램 수

// 순회에서 건너뛸 디렉터리: 의존성·VCS·사전 렌더 산출물·숨김 디렉터리
function isSkippedDir(name) {
  return name === 'node_modules' || name === '.git' || name === 'diagrams' || name.startsWith('.');
}

// docs 루트를 우선순위대로 찾는다. 매 호출 평가(테스트가 DOCS_PATH 를 주입). 못 찾으면 null.
function resolveDocsRoot() {
  // DOCS_PATH 가 명시되면 그것만 신뢰한다(폴백 없음 — 테스트·배포에서 원천을 확정하기 위함).
  if (process.env.DOCS_PATH) {
    const explicit = process.env.DOCS_PATH;
    try {
      if (fs.existsSync(explicit) && fs.statSync(explicit).isDirectory()) return explicit;
    } catch (err) {
      console.warn('DOCS_PATH 확인 실패:', explicit, err.message);
    }
    return null;
  }

  const candidates = [];
  // dev: 저장소 루트의 docs/ (이 파일은 backend/src/services/ 에 있다)
  candidates.push(path.resolve(__dirname, '../../../docs'));
  // 패키지 배포: process.resourcesPath/docs (electron 밖에서는 undefined)
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'docs'));
  }

  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        return dir;
      }
    } catch (err) {
      // 권한 오류 등은 무시하고 다음 후보로
      console.warn('docs 루트 후보 확인 실패:', dir, err.message);
    }
  }
  return null;
}

// root 아래 .md 파일 경로를 재귀 수집해 오름차순 정렬해 반환한다.
// 개별 디렉터리·파일 접근 실패는 warn 후 건너뛴다 (전체를 죽이지 않음).
function listMarkdownFiles(root) {
  const found = [];

  function walk(dir, depth) {
    if (depth > MAX_DEPTH || found.length >= MAX_FILES) return;

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      console.warn('디렉터리 읽기 실패:', dir, err.message);
      return;
    }

    for (const entry of entries) {
      if (found.length >= MAX_FILES) return;
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (isSkippedDir(entry.name)) continue;
        walk(full, depth + 1);
        continue;
      }
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue;

      try {
        if (fs.statSync(full).size > MAX_FILE_BYTES) {
          console.warn('1MB 초과 문서 스킵:', full);
          continue;
        }
      } catch (err) {
        console.warn('파일 stat 실패:', full, err.message);
        continue;
      }
      found.push(full);
    }
  }

  walk(root, 0);
  return found.sort();
}

// heading 텍스트를 사람이 읽기 좋은 제목으로 정리한다.
function cleanHeading(text) {
  return String(text)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [텍스트](링크) → 텍스트
    .replace(/[`*]/g, '') // 백틱·강조 제거
    .replace(/^[\s\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\d.)\-–—]+/u, '') // 선두 이모지/번호/구두점
    .trim();
}

// 마크다운 원문에서 mermaid 펜스 블록을 추출한다 (순수 함수 — 단위 테스트 대상).
// - 모든 펜스(``` 또는 ~~~, 3자 이상)의 열림/닫힘을 추적한다.
// - 닫힘은 여는 펜스와 같은 문자이고 길이가 같거나 길 때만 인정한다.
// - 펜스 밖에서만 heading 을 추적한다 (코드블록 내 '#' 주석을 heading 으로 오인하지 않음).
// - info string 이 mermaid(대소문자 무시, 공백 허용)인 펜스만 수집한다.
// - 닫히지 않은 mermaid 펜스는 버린다.
function parseMermaidBlocks(markdown, doc) {
  const lines = String(markdown).split(/\r?\n/);
  const blocks = [];

  let lastHeading = '';
  let inFence = false;
  let fenceChar = '';
  let fenceLen = 0;
  let isMermaid = false;
  let headingAtOpen = '';
  let buffer = [];

  const fenceRe = /^(\s*)([`~]{3,})(.*)$/;
  const headingRe = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

  for (const line of lines) {
    const fenceMatch = line.match(fenceRe);

    if (!inFence) {
      if (fenceMatch) {
        const marker = fenceMatch[2];
        const info = fenceMatch[3].trim().toLowerCase();
        inFence = true;
        fenceChar = marker[0];
        fenceLen = marker.length;
        isMermaid = info === 'mermaid';
        headingAtOpen = lastHeading;
        buffer = [];
        continue;
      }
      const h = line.match(headingRe);
      if (h) lastHeading = h[2];
      continue;
    }

    // 펜스 안: 닫힘 판정 (같은 문자·같은 길이 이상, info 없음)
    if (
      fenceMatch &&
      fenceMatch[2][0] === fenceChar &&
      fenceMatch[2].length >= fenceLen &&
      fenceMatch[3].trim() === ''
    ) {
      if (isMermaid) {
        const code = buffer.join('\n').replace(/\s+$/, '');
        const index = blocks.length + 1;
        const title = cleanHeading(headingAtOpen) || `${doc} #${index}`;
        blocks.push({ index, title, code });
      }
      inFence = false;
      isMermaid = false;
      buffer = [];
      continue;
    }

    if (isMermaid) buffer.push(line);
  }

  // 닫히지 않은 mermaid 펜스는 버린다 (여기서 아무것도 하지 않음)
  return blocks;
}

// docs/ 를 스캔해 모든 다이어그램을 반환한다.
// - doc 필터: basename(대소문자 무시) 정확 일치.
// - 정렬: path 오름차순 → index 오름차순.
function listDiagrams({ doc } = {}) {
  const root = resolveDocsRoot();
  if (!root) return [];

  const wanted = typeof doc === 'string' && doc.trim() !== '' ? doc.trim().toLowerCase() : null;
  const result = [];

  for (const file of listMarkdownFiles(root)) {
    const base = path.basename(file, '.md');
    if (wanted && base.toLowerCase() !== wanted) continue;

    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch (err) {
      console.warn('문서 읽기 실패:', file, err.message);
      continue;
    }

    const rel = path.relative(root, file).split(path.sep).join('/');
    for (const block of parseMermaidBlocks(content, base)) {
      result.push({
        doc: base,
        path: `docs/${rel}`,
        index: block.index,
        title: block.title,
        code: block.code,
      });
    }
  }

  result.sort((a, b) => (a.path === b.path ? a.index - b.index : a.path < b.path ? -1 : 1));

  if (result.length > MAX_BLOCKS) {
    console.warn(`다이어그램 ${result.length}개 → 상한 ${MAX_BLOCKS}개로 자름`);
    return result.slice(0, MAX_BLOCKS);
  }
  return result;
}

module.exports = { listDiagrams, parseMermaidBlocks, resolveDocsRoot };
