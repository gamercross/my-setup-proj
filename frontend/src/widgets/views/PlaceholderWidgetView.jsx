// "준비 중" 자리표시자 위젯 뷰 (ADR-0032)
// - 전용 위젯이 아직 없는 주제(okr·weekly·activity·progress·settings)의 기본 인스턴스.
// - 데이터 fetch 없음 — 항상 ready 상태.
// - 현재 주제 이름을 useUiStore 에서 읽어 안내 문구에 넣는다.

import React from 'react';
import { useUiStore } from '../../store/useUiStore.js';
import { getTopic } from '../topics.js';

export default function PlaceholderWidgetView() {
  const activeTopic = useUiStore((s) => s.activeTopic);
  const topic = getTopic(activeTopic);
  const label = topic ? topic.label : '이 화면';

  return (
    <div style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.7 }}>
      <p style={{ margin: 0 }}>
        {label} 화면은 준비 중입니다. 아래 <strong style={{ color: 'var(--text)' }}>+ 위젯</strong> 으로
        원하는 위젯을 올려 직접 구성할 수 있습니다.
      </p>
      <p style={{ margin: '8px 0 0' }}>전용 위젯은 이후 로드맵 단계에서 추가됩니다.</p>
    </div>
  );
}
