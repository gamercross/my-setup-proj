// 메인 앱 컴포넌트
// - 본문은 ErrorBoundary 로 감싼 WidgetShell (대시보드 OS).
// - 백엔드 /health 연결 상태는 헤더 우측의 작은 표시로 축소 유지 (FR-UI-02 AC-5 회귀 방지).

import React, { useEffect, useState } from 'react';
import WidgetShell from './components/WidgetShell';
import ErrorBoundary from './components/ErrorBoundary';
import { apiGet } from './api/client.js';

// preload 로 노출된 정보 (없을 수도 있으므로 방어)
const info = (typeof window !== 'undefined' && window.appInfo) || {};

// 웹 데모(프로토타입) 빌드 여부 (ADR-0026)
const DEMO =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEMO === '1';

export default function App() {
  // 백엔드 헬스체크 상태 1개로 관리
  const [health, setHealth] = useState({ status: 'loading', message: '백엔드 확인 중…' });

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        await apiGet('/health');
        if (!aborted) setHealth({ status: 'ok', message: '백엔드 연결됨' });
      } catch (err) {
        // 스택·상태코드 원문은 콘솔에만, 화면에는 한국어 요약만
        console.error('헬스체크 실패:', err);
        if (!aborted) setHealth({ status: 'error', message: '백엔드 연결 안 됨' });
      }
    })();

    return () => {
      aborted = true;
    };
  }, []);

  const statusColor =
    health.status === 'ok' ? '#4ade80' : health.status === 'error' ? '#f87171' : '#94a3b8';

  return (
    <div>
      {/* 헤더 우측: 버전 + 연결 상태 작은 표시 */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 24px',
          background: '#0f172a',
          color: '#94a3b8',
          fontSize: '12px',
        }}
      >
        {DEMO ? (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(124, 108, 245, 0.18)',
              color: '#a5b4fc',
              fontWeight: 600,
            }}
          >
            데모 모드 · 샘플 데이터 (새로고침하면 초기화)
          </span>
        ) : (
          <span>
            v{info.version ?? '?'} · Electron {info.electron ?? '?'} · Node {info.node ?? '?'}
          </span>
        )}
        <span style={{ color: statusColor }}>● {DEMO ? '데모 데이터' : health.message}</span>
      </header>

      <ErrorBoundary>
        <WidgetShell />
      </ErrorBoundary>
    </div>
  );
}
