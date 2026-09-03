// 최상위 렌더 예외 방지 경계 (FR-UI-04 AC-5)
// - 렌더 중 예외를 잡아 앱 전체 크래시를 막고 ErrorBanner 로 대체 표시한다.

import React from 'react';
import ErrorBanner from './ErrorBanner';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // 원문은 콘솔에만 남긴다
    console.error('렌더 예외:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', background: '#0f172a', minHeight: '100vh' }}>
          <ErrorBanner message="화면을 그리는 중 오류가 발생했습니다" />
        </div>
      );
    }
    return this.props.children;
  }
}
