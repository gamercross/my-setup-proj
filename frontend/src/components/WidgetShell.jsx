// 위젯 셸 — 한 주제의 위젯 그리드 (ADR-0020 / ADR-0032).
// - topicId prop 이 바뀌면 스토어를 그 주제로 전환하고 하이드레이션한다.
// - 셸 바(브랜드·편집·위젯·초기화)는 TopicView 페이지 헤더로 옮겼다 — 여기엔 그리드만.
// - 피커 열림 상태는 useUiStore.pickerOpen 이 소유한다.
// - 색은 전역 토큰(var(--*)) 만 쓴다 (ADR-0027).

import React, { useEffect, useState } from 'react';
import WidgetHost from './WidgetHost';
import WidgetPicker from './WidgetPicker';
import { useLayoutStore } from '../store/useLayoutStore.js';
import { useUiStore } from '../store/useUiStore.js';

export default function WidgetShell({ topicId }) {
  const instances = useLayoutStore((s) => s.instances);
  const editMode = useLayoutStore((s) => s.editMode);
  const storeTopicId = useLayoutStore((s) => s.topicId);
  const setTopic = useLayoutStore((s) => s.setTopic);
  const setLayout = useLayoutStore((s) => s.setLayout);
  const addWidget = useLayoutStore((s) => s.addWidget);

  const pickerOpen = useUiStore((s) => s.pickerOpen);
  const setPickerOpen = useUiStore((s) => s.setPickerOpen);

  const [hydrated, setHydrated] = useState(false);

  // 주제 전환 + 하이드레이션. topicId 가 바뀔 때마다 다시 실행.
  useEffect(() => {
    setHydrated(false);
    setTopic(topicId);
    setHydrated(true);
  }, [topicId, setTopic]);

  // 렌더 게이트 — 스토어가 이 주제로 완전히 전환된 뒤에만 그리드를 그린다.
  if (!hydrated || storeTopicId !== topicId) {
    return (
      <p style={{ padding: '24px', color: 'var(--muted)', background: 'var(--bg)' }}>불러오는 중…</p>
    );
  }

  const activeTypes = instances.map((w) => w.type);

  return (
    <div
      style={{ position: 'relative', flex: 1, minWidth: 0, background: 'var(--bg)', color: 'var(--text)' }}
    >
      {editMode && (
        <p style={{ margin: 0, padding: '4px 12px', fontSize: '12px', color: 'var(--muted)' }}>
          편집 모드: 타이틀바를 끌어 위치를, 모서리를 끌어 크기를 조절할 수 있습니다.
        </p>
      )}

      {pickerOpen && (
        <WidgetPicker
          activeTypes={activeTypes}
          onAdd={(type) => {
            addWidget(type);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <WidgetHost instances={instances} editMode={editMode} onLayoutChange={setLayout} />
    </div>
  );
}
