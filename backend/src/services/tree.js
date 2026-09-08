// 파일 트리(tree) 서비스 (Phase 개인 OS P9, ADR-0031)
// - 허용 루트(`docs/` + 저장소 루트 `*.md`)를 재귀 나열한다. `.md` 파일만 노출.
// - 루트·제외 판정·상한 로직은 services/docs.js·services/diagrams.js 를 따른다.
// - 읽기 전용.

const fs = require('fs');
const path = require('path');
const { resolveRepoRoot, isExcludedName } = require('./docs');

const MAX_DEPTH = 8;
const MAX_ENTRIES = 2000;
const MAX_FILE_BYTES = 1024 * 1024; // 1MB 초과 파일은 제외

// absDir 아래를 재귀 나열한다. state = { count, truncated } 는 호출 간 공유.
function walk(absDir, relDir, depth, state) {
  if (depth > MAX_DEPTH || state.count >= MAX_ENTRIES) {
    state.truncated = true;
    return [];
  }

  let entries;
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch (err) {
    console.warn('디렉터리 읽기 실패:', absDir, err.message);
    return [];
  }

  const dirs = [];
  const files = [];
  for (const e of entries) {
    if (e.isSymbolicLink()) continue; // 심링크 스킵 (탈출 방어)
    if (isExcludedName(e.name)) continue;
    if (e.isDirectory()) dirs.push(e.name);
    else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) files.push(e.name);
  }
  dirs.sort();
  files.sort();

  const out = [];

  // 디렉터리 먼저 (자식이 비면 노드 자체를 만들지 않는다 — D-10)
  for (const name of dirs) {
    if (state.count >= MAX_ENTRIES) {
      state.truncated = true;
      break;
    }
    const childRel = `${relDir}/${name}`;
    const kids = walk(path.join(absDir, name), childRel, depth + 1, state);
    if (kids.length) {
      out.push({ name, path: childRel, type: 'dir', children: kids });
      state.count += 1;
    }
  }

  // 그다음 .md 파일
  for (const name of files) {
    if (state.count >= MAX_ENTRIES) {
      state.truncated = true;
      break;
    }
    const full = path.join(absDir, name);
    try {
      if (fs.statSync(full).size > MAX_FILE_BYTES) {
        console.warn('1MB 초과 문서 제외:', full);
        continue;
      }
    } catch (err) {
      console.warn('파일 stat 실패:', full, err.message);
      continue;
    }
    out.push({ name, path: `${relDir}/${name}`, type: 'file' });
    state.count += 1;
  }

  return out;
}

// 허용 루트 트리를 반환한다. 루트 부재 시 200 빈 트리 (ADR-0031 AC-1).
function listTree() {
  const root = resolveRepoRoot();
  if (!root) return { tree: [], truncated: false };

  const state = { count: 0, truncated: false };
  const children = [];

  // docs/ 디렉터리
  const docsDir = path.join(root, 'docs');
  try {
    if (fs.existsSync(docsDir) && fs.statSync(docsDir).isDirectory()) {
      const kids = walk(docsDir, 'docs', 1, state);
      if (kids.length) children.push({ name: 'docs', path: 'docs', type: 'dir', children: kids });
    }
  } catch (err) {
    console.warn('docs 디렉터리 확인 실패:', err.message);
  }

  // 저장소 루트 직속 *.md
  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    const names = entries
      .filter(
        (e) =>
          !e.isSymbolicLink() &&
          e.isFile() &&
          e.name.toLowerCase().endsWith('.md') &&
          !isExcludedName(e.name)
      )
      .map((e) => e.name)
      .sort();
    for (const name of names) {
      if (state.count >= MAX_ENTRIES) {
        state.truncated = true;
        break;
      }
      try {
        if (fs.statSync(path.join(root, name)).size > MAX_FILE_BYTES) {
          console.warn('1MB 초과 문서 제외:', name);
          continue;
        }
      } catch {
        continue;
      }
      children.push({ name, path: name, type: 'file' });
      state.count += 1;
    }
  } catch (err) {
    console.warn('저장소 루트 읽기 실패:', err.message);
  }

  return { tree: children, truncated: state.truncated };
}

module.exports = { listTree };
