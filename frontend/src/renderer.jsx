// 렌더러 진입점
// React 트리를 #root 에 마운트한다.
// StrictMode 는 쓰지 않는다: dev 에서 effect 가 이중 실행되어 /health 가 2번 호출된다.

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

try {
  const root = document.getElementById('root');
  if (!root) throw new Error('#root 요소를 찾을 수 없습니다.');
  createRoot(root).render(<App />);
} catch (err) {
  console.error('렌더링 실패:', err);
  document.body.textContent = '화면을 그리는 중 오류가 발생했습니다.';
}
