// 문서(docs) 서비스 (Phase 개인 OS P9, ADR-0031)
// - 허용 루트(`docs/` + 저장소 루트 `*.md`) 안의 `.md` 를 읽어 제한된 토큰 배열로 파싱한다.
// - 마크다운 파서·의존성 없음. `services/diagrams.js` 의 펜스 추적·루트 해석 스타일을 따른다.
// - 캐시 없음: 문서를 고치면 다음 요청에 즉시 반영된다 (ADR-0031 AC-4).
// - 읽기 전용. 파일 생성·수정·삭제 없음 (ADR-0013).

const fs = require('fs');
const path = require('path');

// 안전 상한
const MAX_FILE_BYTES = 1024 * 1024; // 1MB (diagrams.js 와 동일)
const MAX_TOKENS = 5000; // 응답 토큰 수 상한
const MAX_LINES = 20000; // 라인 스캐너 안전망 (무한 입력 방지)

// 저장소 루트를 우선순위대로 찾는다. 매 호출 평가(캐시 없음 — 테스트가 REPO_PATH 를 주입). 못 찾으면 null.
function resolveRepoRoot() {
  // REPO_PATH 가 명시되면 그것만 신뢰한다(폴백 없음).
  if (process.env.REPO_PATH) {
    const explicit = process.env.REPO_PATH;
    try {
      if (fs.existsSync(explicit) && fs.statSync(explicit).isDirectory()) return explicit;
    } catch (err) {
      console.warn('REPO_PATH 확인 실패:', explicit, err.message);
    }
    return null;
  }

  const candidates = [];
  // dev: 저장소 루트 (이 파일은 backend/src/services/ 에 있다)
  candidates.push(path.resolve(__dirname, '../../..'));
  // 패키지 배포
  if (process.resourcesPath) candidates.push(process.resourcesPath);

  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir;
    } catch (err) {
      console.warn('저장소 루트 후보 확인 실패:', dir, err.message);
    }
  }
  return null;
}

// 순회·검증에서 완전히 제외할 이름 (의존성·VCS·시크릿·산출물·로그·숨김).
function isExcludedName(name) {
  return (
    name.startsWith('.') ||
    name === 'node_modules' ||
    name === 'venv' ||
    name === 'dist' ||
    name === '__pycache__' ||
    name.endsWith('.log')
  );
}

// 허용 스킴 (그 외 javascript:·data:·file: 등은 링크로 만들지 않는다).
function isSafeHref(href) {
  if (!href) return true; // 앵커·상대경로
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(href);
  if (!m) return true; // 스킴 없음
  return ['http', 'https', 'mailto'].includes(m[1].toLowerCase());
}

// 상대경로를 검증해 허용 루트 안의 실제 `.md` 파일 절대경로로 바꾼다.
// 반환: { ok:true, full } | { ok:false, code:400|404, message }
function resolveDocPath(rel) {
  const bad = { ok: false, code: 400, message: '문서 경로가 올바르지 않습니다.' };

  // 1. 문자열·길이·제어문자
  if (typeof rel !== 'string' || rel.length < 1 || rel.length > 300) return bad;
  if (rel.includes('\0') || rel.includes('\\')) return bad;

  // 2. 절대경로·드라이브레터
  if (path.isAbsolute(rel) || /^[a-zA-Z]:/.test(rel)) return bad;

  // 3~4. 세그먼트 검사 (route 레이어가 이미 1회 percent-decode 한 상태 — 여기서 재디코드 금지)
  const segs = rel.split('/');
  for (const s of segs) {
    if (s === '' || s === '.' || s === '..') return bad;
    if (isExcludedName(s)) return bad;
  }

  // 5. 마지막 세그먼트는 .md (소스 파일 차단 — PO-12)
  const last = segs[segs.length - 1];
  if (!last.toLowerCase().endsWith('.md')) return bad;

  // 6. 허용 루트: docs/ 하위 또는 저장소 루트 직속 *.md
  const inDocs = segs[0] === 'docs' && segs.length >= 2;
  const inRoot = segs.length === 1;
  if (!inDocs && !inRoot) return bad;

  // 7. 실제 파일 확인
  const root = resolveRepoRoot();
  if (!root) return { ok: false, code: 404, message: '문서를 찾을 수 없습니다.' };
  const full = path.join(root, ...segs);

  let st;
  try {
    st = fs.lstatSync(full);
  } catch {
    return { ok: false, code: 404, message: '문서를 찾을 수 없습니다.' };
  }
  if (st.isSymbolicLink() || !st.isFile()) {
    return { ok: false, code: 404, message: '문서를 찾을 수 없습니다.' };
  }

  // 8. 심링크 탈출 방어 (경로 중간의 심링크 포함)
  let realFull;
  let realRoot;
  try {
    realFull = fs.realpathSync(full);
    realRoot = fs.realpathSync(root);
  } catch {
    return { ok: false, code: 404, message: '문서를 찾을 수 없습니다.' };
  }
  if (realFull !== realRoot && !realFull.startsWith(realRoot + path.sep)) return bad;

  // 9. 크기 상한
  if (st.size > MAX_FILE_BYTES) {
    return { ok: false, code: 400, message: '문서가 너무 큽니다.' };
  }

  return { ok: true, full };
}

// 검증된 절대경로를 읽어 토큰화한다. 읽기 실패는 throw → 라우트가 500 으로 매핑.
function readDocTokens(full, rel) {
  const content = fs.readFileSync(full, 'utf8');
  return { path: rel, tokens: tokenize(content) };
}

// ── 인라인 파서 (좌→우 1패스, 우선순위 코드 > 링크 > strong > em) ──────────
function stripBackticks(s) {
  return String(s).replace(/`/g, '');
}

function parseInline(str) {
  const s = String(str);
  const out = [];
  let buf = '';
  const flush = () => {
    if (buf) {
      out.push({ type: 'text', text: buf });
      buf = '';
    }
  };

  let i = 0;
  while (i < s.length) {
    const c = s[i];

    // 이스케이프
    if (c === '\\' && i + 1 < s.length && '*_[`'.includes(s[i + 1])) {
      buf += s[i + 1];
      i += 2;
      continue;
    }

    // 인라인 코드 (백틱 스팬을 가장 먼저 잘라낸다)
    if (c === '`') {
      let n = 1;
      while (s[i + n] === '`') n++;
      const close = s.indexOf('`'.repeat(n), i + n);
      if (close !== -1) {
        flush();
        out.push({ type: 'code', text: s.slice(i + n, close) });
        i = close + n;
        continue;
      }
      buf += c;
      i += 1;
      continue;
    }

    // 링크 [text](href) — 이미지 ![alt](u) 는 리터럴
    if (c === '[' && s[i - 1] !== '!') {
      const m = /^\[([^\]]*)\]\(([^)\s]*)\)/.exec(s.slice(i));
      if (m) {
        if (isSafeHref(m[2])) {
          flush();
          out.push({ type: 'link', text: m[1], href: m[2] });
        } else {
          buf += m[0]; // 위험 스킴 → 원문 리터럴
        }
        i += m[0].length;
        continue;
      }
      buf += c;
      i += 1;
      continue;
    }

    // strong / em
    if (c === '*' || c === '_') {
      const two = s[i + 1] === c;
      const marker = two ? c + c : c;
      const rest = s.slice(i + marker.length);
      if (rest[0] && !/\s/.test(rest[0])) {
        const close = rest.indexOf(marker);
        if (close > 0 && !/\s/.test(rest[close - 1])) {
          flush();
          out.push({ type: two ? 'strong' : 'em', text: stripBackticks(rest.slice(0, close)) });
          i += marker.length + close + marker.length;
          continue;
        }
      }
      buf += c;
      i += 1;
      continue;
    }

    buf += c;
    i += 1;
  }

  flush();
  return out.length ? out : [{ type: 'text', text: '' }];
}

// ── 표 헬퍼 ──────────────────────────────────────────
function splitRow(row) {
  let r = String(row).trim();
  if (r.startsWith('|')) r = r.slice(1);
  if (r.endsWith('|')) r = r.slice(0, -1);
  return r.split('|').map((c) => c.trim());
}

function isDivider(line, headerLine) {
  if (!line.includes('-')) return false;
  const cells = splitRow(line);
  if (cells.length !== splitRow(headerLine).length) return false;
  return cells.every((c) => /^:?-+:?$/.test(c));
}

function cellAlign(c) {
  const l = c.startsWith(':');
  const r = c.endsWith(':');
  if (l && r) return 'center';
  if (r) return 'right';
  if (l) return 'left';
  return null;
}

// ── 블록 토크나이저 (순수 함수 — TC-DOCS-* 로 고정) ──────────
function tokenize(markdown) {
  let text = String(markdown).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  let lines = text.split('\n');
  if (lines.length > MAX_LINES) lines = lines.slice(0, MAX_LINES);

  // YAML front matter 스킵
  let start = 0;
  if (lines[0] === '---') {
    for (let j = 1; j < lines.length; j++) {
      if (lines[j] === '---') {
        start = j + 1;
        break;
      }
    }
  }

  const tokens = [];
  let overflow = false;
  const push = (t) => {
    if (tokens.length >= MAX_TOKENS) {
      overflow = true;
      return;
    }
    tokens.push(t);
  };

  const fenceRe = /^(\s*)([`~]{3,})(.*)$/;
  const headingRe = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
  const hrRe = /^\s*([-*_])(?:\s*\1){2,}\s*$/;
  const listRe = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
  const bqRe = /^\s*>\s?(.*)$/;

  const isBlockStart = (l) =>
    fenceRe.test(l) || headingRe.test(l) || hrRe.test(l) || listRe.test(l) || bqRe.test(l);

  let i = start;
  while (i < lines.length && tokens.length < MAX_TOKENS) {
    const line = lines[i];

    // 1. 펜스 우선 (안에서는 heading/list/table 파싱 안 함)
    const fm = line.match(fenceRe);
    if (fm) {
      const marker = fm[2];
      const fenceChar = marker[0];
      const fenceLen = marker.length;
      const info = fm[3].trim();
      const buf = [];
      i += 1;
      while (i < lines.length) {
        const l = lines[i];
        const cm = l.match(fenceRe);
        if (cm && cm[2][0] === fenceChar && cm[2].length >= fenceLen && cm[3].trim() === '') {
          i += 1;
          break;
        }
        buf.push(l);
        i += 1;
      }
      // info string 첫 토큰만 lang 으로 (없으면 null). mermaid 는 소문자 정규화.
      const lang = info ? info.split(/\s+/)[0].toLowerCase() : null;
      push({ type: 'code', lang: lang || null, code: buf.join('\n') });
      continue;
    }

    // 빈 줄
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // 2. hr
    if (hrRe.test(line)) {
      push({ type: 'hr' });
      i += 1;
      continue;
    }

    // 3. heading
    const hm = line.match(headingRe);
    if (hm) {
      push({ type: 'heading', depth: Math.min(hm[1].length, 4), inline: parseInline(hm[2]) });
      i += 1;
      continue;
    }

    // 4. blockquote (내부는 문단 토큰만 — 재귀 깊이 1)
    if (bqRe.test(line)) {
      const inner = [];
      let para = [];
      const flushPara = () => {
        if (para.length) {
          inner.push({ type: 'paragraph', inline: parseInline(para.join('\n')) });
          para = [];
        }
      };
      while (i < lines.length && bqRe.test(lines[i])) {
        const body = lines[i].match(bqRe)[1];
        if (body.trim() === '') flushPara();
        else para.push(body);
        i += 1;
      }
      flushPara();
      push({ type: 'blockquote', tokens: inner });
      continue;
    }

    // 5. table (현재 줄에 | + 다음 줄이 구분행일 때만)
    if (line.includes('|') && i + 1 < lines.length && isDivider(lines[i + 1], line)) {
      const header = splitRow(line).map(parseInline);
      const align = splitRow(lines[i + 1]).map(cellAlign);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
        rows.push(splitRow(lines[i]).map(parseInline));
        i += 1;
      }
      push({ type: 'table', header, align, rows });
      continue;
    }

    // 6. list (들여쓰기 0~1 = 1단, 2 이상 = 2단)
    const lm = line.match(listRe);
    if (lm) {
      const ordered = /\d/.test(lm[2]);
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(listRe);
        if (!m) break;
        const indent = m[1].replace(/\t/g, '  ').length;
        const node = { inline: parseInline(m[3]), children: [] };
        if (indent >= 2 && items.length) {
          items[items.length - 1].children.push({ inline: node.inline, children: [] });
        } else {
          items.push(node);
        }
        i += 1;
      }
      push({ type: 'list', ordered, items });
      continue;
    }

    // 7. paragraph (연속 비공백 줄 — \n join, 프런트가 pre-wrap 렌더)
    const para = [];
    while (i < lines.length) {
      const l = lines[i];
      if (l.trim() === '' || isBlockStart(l)) break;
      para.push(l);
      i += 1;
    }
    if (para.length) push({ type: 'paragraph', inline: parseInline(para.join('\n')) });
    else i += 1;
  }

  // 토큰 상한 초과 → 잘림 + 안내 문단
  if (overflow || tokens.length >= MAX_TOKENS) {
    if (tokens.length >= MAX_TOKENS) tokens.length = MAX_TOKENS - 1;
    tokens.push({
      type: 'paragraph',
      inline: [{ type: 'text', text: '⚠️ 문서가 너무 길어 일부만 표시합니다.' }],
    });
  }

  return tokens;
}

module.exports = {
  resolveRepoRoot,
  isExcludedName,
  resolveDocPath,
  readDocTokens,
  tokenize,
  MAX_FILE_BYTES,
};
