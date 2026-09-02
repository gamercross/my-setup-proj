// 메인 앱 컴포넌트
// 스캐폴드 환영 화면 + 백엔드 /health 연결 상태 표시.

import React, { useEffect, useState } from 'react';

// preload 로 노출된 정보 (없을 수도 있으므로 방어)
const info = window.appInfo ?? {};

export default function App() {
  // 백엔드 헬스체크 상태 1개로 관리
  const [health, setHealth] = useState({ status: 'loading', message: '백엔드 확인 중…' });

  useEffect(() => {
    // apiBaseUrl 이 없으면 요청 자체가 불가능하다
    if (!info.apiBaseUrl) {
      setHealth({ status: 'error', message: '백엔드에 연결할 수 없습니다' });
      return;
    }

    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`${info.apiBaseUrl}/health`);
        if (aborted) return;
        if (!res.ok) throw new Error('health not ok');
        setHealth({ status: 'ok', message: '백엔드 연결됨 (ok)' });
      } catch (err) {
        // 스택·상태코드 원문은 콘솔에만, 화면에는 한국어 요약만
        console.error('헬스체크 실패:', err);
        if (!aborted) setHealth({ status: 'error', message: '백엔드에 연결할 수 없습니다' });
      }
    })();

    return () => {
      aborted = true;
    };
  }, []);

  const statusColor =
    health.status === 'ok' ? '#4ade80' : health.status === 'error' ? '#f87171' : '#94a3b8';

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem' }}>🤖 Welcome to AI Computer OS</h1>
      <p style={{ margin: '0.25rem 0', color: '#94a3b8' }}>개인 생산성 AI Agent</p>
      <p style={{ margin: '0.25rem 0', color: '#94a3b8' }}>
        v{info.version ?? '?'} · Electron {info.electron ?? '?'} · Node {info.node ?? '?'}
      </p>
      <p style={{ margin: '1rem 0 0', color: statusColor }}>{health.message}</p>
    </div>
  );
}
