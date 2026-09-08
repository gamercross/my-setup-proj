// 문서 섹션 그룹핑·분할 비율 클램프 (순수 함수 — DocView·ProgressWidgetView 가 사용)
// - node --test(.mjs) 에서 JSX 없이 검증하기 위해 위젯 폴더의 순수 모듈로 분리한다
//   (weekBuckets.js ↔ weekBuckets.test.mjs 선례).

// 기본으로 펼쳐 둘 섹션 제목 (부분 문자열 매칭 — PROGRESS.md 가 길어 큐레이션 필요, PO-11).
export const DEFAULT_OPEN_TITLES = ['진행 상황 요약', '개인 생산성 OS 방향'];

// 인라인 노드 배열에서 평문만 추출한다.
export function headingText(inline) {
  if (!Array.isArray(inline)) return '';
  return inline
    .map((n) => (n && typeof n.text === 'string' ? n.text : ''))
    .join('')
    .trim();
}

// 지정 제목을 부분 문자열로 포함하는지 (앞뒤 공백·이모지는 includes 로 자연히 무시).
export function matchDefaultOpen(text) {
  const t = String(text || '');
  return DEFAULT_OPEN_TITLES.some((title) => t.includes(title));
}

// 15~85 로 클램프. 유한수가 아니면 30.
export function clampSplitPct(n, min = 15, max = 85) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 30;
  return Math.max(min, Math.min(max, v));
}

// tokens → [{ id, heading|null, depth, tokens, defaultOpen }]
// - depth <= 2 인 heading 에서 새 섹션 시작.
// - 첫 heading 이전 토큰은 heading:null preamble 섹션(항상 열림).
// - defaultOpen = preamble | 첫 실제 섹션 | isDefaultOpen(headingText) 가 true.
export function groupSections(tokens, isDefaultOpen = matchDefaultOpen) {
  const list = Array.isArray(tokens) ? tokens : [];
  const sections = [];
  let current = null;
  let seq = 0;

  const open = (heading, depth) => {
    current = { id: `s${seq++}`, heading, depth, tokens: [], defaultOpen: false };
    sections.push(current);
  };

  for (const tok of list) {
    if (tok && tok.type === 'heading' && tok.depth <= 2) {
      open(tok.inline || [], tok.depth);
    } else {
      if (!current) open(null, 0); // preamble
      current.tokens.push(tok);
    }
  }

  let firstReal = true;
  for (const s of sections) {
    if (s.heading === null) {
      s.defaultOpen = true;
      continue;
    }
    if (firstReal) {
      s.defaultOpen = true;
      firstReal = false;
    }
    if (isDefaultOpen(headingText(s.heading))) s.defaultOpen = true;
  }

  return sections;
}
