// api/client.js 오류 파싱 테스트 (TC-ERR-08) — ADR-0017
// client.js 는 브라우저 fetch/window 에 의존하므로 전역을 최소한으로 흉내 낸다.

import test from 'node:test';
import assert from 'node:assert/strict';

// window.appInfo 를 먼저 세팅해야 client.js 가 DEMO 가 아닌 실제 fetch 경로를 탄다.
globalThis.window = { appInfo: { apiBaseUrl: 'http://localhost:9999/api' } };

const { apiGet } = await import('../src/api/client.js');

function fakeResponse({ ok, status, body }) {
  return { ok, status, json: async () => body };
}

test('TC-ERR-08: RFC 9457 봉투(type/title/detail/errors/request_id)를 Error 에 그대로 부착한다', async () => {
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    fakeResponse({
      ok: false,
      status: 400,
      body: {
        type: 'validation_error',
        title: '입력이 올바르지 않습니다',
        status: 400,
        detail: 'title 은 필수입니다.',
        errors: [{ field: 'title', message: '필수입니다' }],
        request_id: 'r-20260916-abcd1234',
      },
    });
  try {
    await assert.rejects(
      () => apiGet('/tasks'),
      (e) =>
        e.message === 'title 은 필수입니다.' &&
        e.status === 400 &&
        e.type === 'validation_error' &&
        e.title === '입력이 올바르지 않습니다' &&
        e.detail === 'title 은 필수입니다.' &&
        Array.isArray(e.fieldErrors) &&
        e.fieldErrors[0].field === 'title' &&
        e.requestId === 'r-20260916-abcd1234'
    );
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test('TC-ERR-08b: detail 이 없으면 title 로, 그마저 없으면 기본 문구로 폴백한다', async () => {
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    fakeResponse({ ok: false, status: 500, body: { type: 'internal_error', status: 500 } });
  try {
    await assert.rejects(() => apiGet('/tasks'), (e) => e.message === '요청을 처리하지 못했습니다.');
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test('TC-ERR-08c: shape 를 알 수 없는 응답(구버전 등)은 기존 폴백 메시지를 유지한다', async () => {
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () => fakeResponse({ ok: false, status: 404, body: { foo: 'bar' } });
  try {
    await assert.rejects(
      () => apiGet('/tasks'),
      (e) => e.message === '요청을 처리하지 못했습니다.' && e.status === 404 && e.type === undefined
    );
  } finally {
    globalThis.fetch = prevFetch;
  }
});
