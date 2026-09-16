// preload argv 파싱 테스트 (TC-TOPO-11) — ADR-0016 결정 4항

import test from 'node:test';
import assert from 'node:assert/strict';

import { parseApiBaseUrl, DEFAULT_API_BASE_URL } from '../src/main/apiBaseUrl.js';

test('TC-TOPO-11: --api-base-url= 있으면 그 값, 없으면 3000 폴백', () => {
  assert.equal(
    parseApiBaseUrl(['electron', 'main.js', '--api-base-url=http://localhost:3007/api']),
    'http://localhost:3007/api'
  );
  assert.equal(parseApiBaseUrl(['electron', 'main.js']), DEFAULT_API_BASE_URL);
  assert.equal(DEFAULT_API_BASE_URL, 'http://localhost:3000/api');
});
