// 문서 섹션 그룹핑·분할 클램프 순수 함수 테스트 (TC-P9-DOC-01~02) — ADR-0031

import test from 'node:test';
import assert from 'node:assert/strict';

import { groupSections, clampSplitPct, headingText } from '../src/widgets/docSections.js';

const h = (depth, text) => ({ type: 'heading', depth, inline: [{ type: 'text', text }] });
const p = (text) => ({ type: 'paragraph', inline: [{ type: 'text', text }] });

test('TC-P9-DOC-01: preamble 분리 + depth≤2 섹션 분할 + defaultOpen 큐레이션', () => {
  const tokens = [
    p('머리말'),
    h(1, '개요'),
    p('a'),
    h(2, '진행 상황 요약'),
    p('b'),
    h(2, '기타'),
    p('c'),
    h(3, '세부'),
    p('d'),
  ];
  const secs = groupSections(tokens);

  assert.equal(secs.length, 4);
  assert.equal(secs[0].heading, null);
  assert.equal(secs[0].defaultOpen, true); // preamble 항상
  assert.equal(secs[1].defaultOpen, true); // 첫 실제 섹션
  assert.equal(secs[2].defaultOpen, true); // 지정 제목
  assert.equal(secs[3].defaultOpen, false); // 그 외 접힘
  // h3 는 새 섹션을 열지 않고 이전 섹션 토큰으로 들어간다
  assert.ok(secs[3].tokens.some((t) => t.type === 'heading' && t.depth === 3));
});

test('TC-P9-DOC-02: clampSplitPct — NaN·0·999 → 30/15/85', () => {
  assert.equal(clampSplitPct(NaN), 30);
  assert.equal(clampSplitPct('x'), 30);
  assert.equal(clampSplitPct(0), 15);
  assert.equal(clampSplitPct(999), 85);
  assert.equal(clampSplitPct(42), 42);
});

test('headingText 는 인라인 배열에서 평문만 뽑는다', () => {
  assert.equal(headingText([{ type: 'text', text: 'A ' }, { type: 'code', text: 'b' }]), 'A b');
  assert.equal(headingText(null), '');
});
