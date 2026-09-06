// 다이어그램 위젯 뷰 (DO-6) — 상태·effect 는 DiagramPanel 이 소유한다.
// - 래핑만 한다. DiagramPanel 은 수정하지 않는다.

import React from 'react';
import DiagramPanel from '../../components/DiagramPanel';

export default function DiagramsWidgetView() {
  return <DiagramPanel />;
}
