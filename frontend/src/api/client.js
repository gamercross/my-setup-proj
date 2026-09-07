// 백엔드 REST 호출 래퍼 (ESM)
// - 모든 에러 메시지는 한국어로 정규화한다. 스택·상태코드 원문은 화면에 노출하지 않는다.
// - path 는 base(`window.appInfo.apiBaseUrl`) 이후의 경로만 넘긴다. 예: '/tasks', '/tasks/3'

// 웹 데모(프로토타입) 모드 — VITE_DEMO=1 빌드에서만 참 (Vite 가 정적 치환).
// 이때는 백엔드 없이 인메모리 샘플 데이터로 응답한다 (ADR-0026).
const DEMO =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.VITE_DEMO === '1';

// preload 브리지에서 API base URL 을 읽는다 (없으면 null)
function getBaseUrl() {
  return (typeof window !== 'undefined' && window.appInfo?.apiBaseUrl) ?? null;
}

// 공통 요청 함수
async function request(method, path, body) {
  if (DEMO) {
    const { demoRequest } = await import('./demoClient.js');
    return demoRequest(method, path, body);
  }

  const base = getBaseUrl();
  if (!base) {
    // 브리지가 없으면 fetch 시도조차 하지 않는다
    throw new Error('백엔드에 연결할 수 없습니다.');
  }

  const options = { method };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  // 8초 넘으면 네트워크 오류로 취급 (선택 사항)
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
    options.signal = AbortSignal.timeout(8000);
  }

  let res;
  try {
    res = await fetch(`${base}${path}`, options);
  } catch (err) {
    // 네트워크·CORS·타임아웃 등 fetch 자체 실패
    console.error('네트워크 요청 실패:', err);
    throw new Error('백엔드에 연결할 수 없습니다.');
  }

  // 응답 본문 파싱 (실패해도 무시)
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    // 백엔드가 한국어 error 필드를 주면 그대로 사용
    if (data && typeof data.error === 'string') {
      const e = new Error(data.error);
      e.status = res.status;
      throw e;
    }
    const e = new Error('요청을 처리하지 못했습니다.');
    e.status = res.status;
    throw e;
  }

  // 200 인데 JSON 이 아니면
  if (data === null) {
    throw new Error('서버 응답을 이해할 수 없습니다.');
  }

  return data;
}

export function apiGet(path) {
  return request('GET', path);
}

export function apiPost(path, body) {
  return request('POST', path, body ?? {});
}

export function apiPut(path, body) {
  return request('PUT', path, body ?? {});
}

export function apiDelete(path) {
  return request('DELETE', path);
}
