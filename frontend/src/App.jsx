// 메인 앱 컴포넌트 (ADR-0032)
// - 전역 ErrorBoundary 로 감싼 AppShell(사이드바 + 주제별 위젯 그리드) 하나를 렌더한다.
// - 헬스체크·데모 판정·레이아웃 로직은 모두 AppShell 아래로 내려갔다.

import React from 'react';
import AppShell from './components/AppShell';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
