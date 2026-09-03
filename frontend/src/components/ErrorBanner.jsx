// 오류 배너 (순수 프레젠테이션)
// - fetch·store 를 절대 참조하지 않는다.
// - message 가 없으면 아무것도 렌더하지 않는다.

import React from 'react';

export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        marginBottom: '10px',
        background: '#1e293b',
        border: '1px solid #ef4444',
        borderRadius: '8px',
        color: '#e2e8f0',
        fontSize: '13px',
      }}
    >
      <span aria-hidden="true">⚠️</span>
      <span style={{ flex: 1 }}>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: '#f59e0b',
            color: '#0f172a',
            border: 'none',
            borderRadius: '6px',
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          재시도
        </button>
      )}
    </div>
  );
}
