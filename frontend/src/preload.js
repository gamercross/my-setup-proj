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
  });
} catch (err) {
  console.error('preload 초기화 실패:', err);
}
