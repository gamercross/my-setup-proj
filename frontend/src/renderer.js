// 렌더러 프로세스
// Week 1에서는 간단한 환영 화면만 그린다.
// Week 2에서 App.jsx(React 컴포넌트)로 교체할 예정이다.

(function render() {
  try {
    const root = document.getElementById('root');
    const info = window.appInfo || { version: '0.1.0', electron: '?', node: '?' };

    root.innerHTML = `
      <div class="card">
        <h1>🤖 Welcome to AI Computer OS</h1>
        <p>개인 생산성 AI Agent</p>
        <p>v${info.version} · Electron ${info.electron} · Node ${info.node}</p>
      </div>
    `;
  } catch (err) {
    console.error('렌더링 실패:', err);
    document.body.textContent = '화면을 그리는 중 오류가 발생했습니다.';
  }
})();
