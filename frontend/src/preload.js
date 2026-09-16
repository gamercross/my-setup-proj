// preload 스크립트
// 렌더러(웹 페이지)에 안전하게 노출할 API만 골라서 전달한다.

const { contextBridge, ipcRenderer } = require('electron');
const { parseApiBaseUrl, buildApiBaseUrl } = require('./main/apiBaseUrl');

// 현재 API base URL. 창 생성 시점 --api-base-url= 인자로 초기화되고, 재기동으로 포트가
// 바뀌면 onBackendState 구독의 payload.port 로 갱신된다(contextBridge 는 원시값을 복사
// 노출하므로 객체 mutate 로는 갱신이 안 됨 — 이 클로저 변수 + getApiBaseUrl() 함수로 해결).
let currentApiBaseUrl = parseApiBaseUrl(process.argv);

try {
  contextBridge.exposeInMainWorld('appInfo', {
    // 간단한 버전 정보만 노출한다
    name: 'AI Computer OS',
    version: '0.1.0',
    electron: process.versions.electron,
    node: process.versions.node,
    // 하위호환용 — 창 생성 시점 값으로 고정된다. 재기동 후 최신 값은 getApiBaseUrl() 을 쓸 것.
    apiBaseUrl: currentApiBaseUrl,
    // 최신 API base URL 을 항상 반환한다 (api/client.js 의 getBaseUrl() 이 우선 사용).
    getApiBaseUrl: () => currentApiBaseUrl,

    // 백엔드 상태 구독 (ADR-0016 결정 3항) — 이벤트 객체는 노출하지 않고 payload만 전달한다.
    // payload.port 가 있으면(재기동으로 포트가 바뀐 경우 포함) currentApiBaseUrl 도 함께 갱신한다.
    // 반환값은 구독 해제 함수. IPC 를 못 쓰는 환경(웹 데모)에서는 안전하게 no-op.
    onBackendState: (cb) => {
      if (typeof cb !== 'function' || !ipcRenderer) return () => {};
      const listener = (_event, payload) => {
        if (payload && typeof payload.port === 'number') {
          currentApiBaseUrl = buildApiBaseUrl(payload.port);
        }
        cb(payload);
      };
      ipcRenderer.on('backend:state', listener);
      return () => ipcRenderer.removeListener('backend:state', listener);
    },

    // 수동 재시도 (ErrorBanner "재시도" 버튼)
    retryBackend: () => {
      if (!ipcRenderer) return Promise.resolve({ ok: false });
      return ipcRenderer.invoke('backend:retry');
    },
  });
} catch (err) {
  console.error('preload 초기화 실패:', err);
}
