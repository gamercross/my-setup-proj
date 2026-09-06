// C6 위젯 테마 변수 매핑 테스트 (TC-WIDGET-09~12)
// node --test 로 실행. .js 소스는 Node 의 ESM 구문 자동 감지로 로드된다("type":"module" 없이).

import test from 'node:test';
import assert from 'node:assert/strict';
import { themeToVars } from '../src/widgets/themeVars.js';
import { THEME_PRESETS } from '../src/widgets/themePresets.js';

test('TC-WIDGET-09: 위험한 색 문자열은 전부 무시', () => {
  assert.deepEqual(themeToVars({ bg: 'url(x)' }), {});
  assert.deepEqual(themeToVars({ bg: 'red;}' }), {});
  assert.deepEqual(themeToVars({ bg: 'expression(1)' }), {});
  assert.deepEqual(themeToVars({ bg: 'javascript:alert(1)' }), {});
});

test('TC-WIDGET-10: radius clamp / density enum 검증', () => {
  assert.equal(themeToVars({ radius: 99 })['--w-radius'], '24px');
  assert.equal(themeToVars({ radius: -5 })['--w-radius'], '0px');
  assert.ok(!('--w-radius' in themeToVars({ radius: 'a' })));
  assert.ok(!('--w-pad' in themeToVars({ density: 'zzz' })));
  assert.equal(themeToVars({ density: 'compact' })['--w-pad'], '6px');
});

test('TC-WIDGET-11: 화이트리스트 밖 키는 완전 무시', () => {
  assert.deepEqual(themeToVars({ fontFamily: 'x', onclick: 'y', position: 'absolute' }), {});
});

test('TC-WIDGET-12: 각 프리셋은 5개 변수를 생성', () => {
  for (const preset of THEME_PRESETS) {
    const vars = themeToVars(preset.theme);
    assert.deepEqual(
      Object.keys(vars).sort(),
      ['--w-accent', '--w-bg', '--w-pad', '--w-radius', '--w-text'],
      `프리셋 ${preset.id}`
    );
  }
});

test('themeToVars: 비객체 입력은 빈 객체', () => {
  assert.deepEqual(themeToVars(null), {});
  assert.deepEqual(themeToVars([1, 2]), {});
  assert.deepEqual(themeToVars('x'), {});
});
