// preload 스크립트
// 렌더러(웹 페이지)에 안전하게 노출할 API만 골라서 전달한다.

const { contextBridge } = require('electron');

try {
  contextBridge.exposeInMainWorld('appInfo', {
    // 간단한 버전 정보만 노출한다
    name: 'AI Computer OS',
    version: '0.1.0',
    electron: process.versions.electron,
    node: process.versions.node,
    // 백엔드 API 기본 주소. 백엔드 3000 가정, CSP connect-src 와 일치시킨다.
    apiBaseUrl: 'http://localhost:3000/api',
  });
} catch (err) {
  console.error('preload 초기화 실패:', err);
}
