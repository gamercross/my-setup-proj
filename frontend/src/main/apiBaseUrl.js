// preload 에 전달할 API base URL 파싱 (순수 함수 — electron 의존 없이 테스트 가능)
// main.js 가 BrowserWindow 생성 시 webPreferences.additionalArguments 로
// '--api-base-url=http://localhost:<port>/api' 를 넘기면 preload.js 가 이 함수로 읽는다.

const DEFAULT_API_BASE_URL = 'http://localhost:3000/api';

function parseApiBaseUrl(argv = process.argv) {
  const prefix = '--api-base-url=';
  const arg = argv.find((a) => typeof a === 'string' && a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : DEFAULT_API_BASE_URL;
}

// 확정된 포트로부터 API base URL 을 만든다. main.js(창 생성 시)와 preload.js(재기동 후 포트
// 갱신 시) 가 공통으로 사용해 두 곳의 URL 조립 방식이 어긋나지 않게 한다.
function buildApiBaseUrl(port) {
  return `http://localhost:${port}/api`;
}

module.exports = { parseApiBaseUrl, buildApiBaseUrl, DEFAULT_API_BASE_URL };
