// 렌더 예외 방지 경계 (FR-UI-04 AC-5)
// - 렌더 중 예외를 잡아 크래시를 막고 대체 UI 를 표시한다.
// - props.fallback 을 주면 그 노드로 대체(위젯 단위 격리용), 없으면 기존 전면 폴백 (하위호환).
// - props.onReset 을 주면 상태 복구용 훅으로 쓸 수 있다 (선택).

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
      // fallback 미지정 시 기존 전면 폴백 (동작 동일)
      return (
        this.props.fallback ?? (
          <div style={{ padding: '24px', background: '#0f172a', minHeight: '100vh' }}>
            <ErrorBanner message="화면을 그리는 중 오류가 발생했습니다" />
          </div>
        )
      );
    }
    return this.props.children;
  }
}
