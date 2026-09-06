// 위젯 셸 — 대시보드 OS 의 최상위 골격 (ADR-0020).
// - 마운트 시 1회 저장 레이아웃을 하이드레이션한다 (없으면 기본 레이아웃).
// - 셸 바: 제목 · 편집 토글 · 위젯 추가 · 초기화. 평소에는 잠금(편집 모드에서만 드래그/리사이즈).
// - 백엔드 연결 상태는 App 헤더의 헬스 표시가 담당한다 (여기서 중복 구현하지 않음).

import React, { useEffect, useState } from 'react';
import WidgetHost from './WidgetHost';
import WidgetPicker from './WidgetPicker';
import { useLayoutStore } from '../store/useLayoutStore.js';
import { loadLayout, defaultInstances } from '../widgets/layoutStorage.js';

const BAR_STYLE = {
  position: 'sticky',
  top: 0,
  zIndex: 500,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 12px',
  background: '#0f172a',
  borderBottom: '1px solid #1e293b',
};

const btnStyle = (active) => ({
  background: active ? '#38bdf8' : '#1e293b',
  color: active ? '#0f172a' : '#e2e8f0',
  border: '1px solid #334155',
  borderRadius: '6px',
  padding: '4px 10px',
  fontSize: '13px',
  cursor: 'pointer',
});

export default function WidgetShell() {
  const instances = useLayoutStore((s) => s.instances);
  const editMode = useLayoutStore((s) => s.editMode);
  const setInstances = useLayoutStore((s) => s.setInstances);
  const setLayout = useLayoutStore((s) => s.setLayout);
  const addWidget = useLayoutStore((s) => s.addWidget);
  const toggleEditMode = useLayoutStore((s) => s.toggleEditMode);
  const resetLayout = useLayoutStore((s) => s.resetLayout);

  const [hydrated, setHydrated] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // 마운트 1회 하이드레이션
  useEffect(() => {
    setInstances(loadLayout() ?? defaultInstances());
    setHydrated(true);
  }, [setInstances]);

  if (!hydrated) {
    return <p style={{ padding: '24px', color: '#94a3b8', background: '#0f172a' }}>불러오는 중…</p>;
  }

  const activeTypes = instances.map((w) => w.type);

  return (
    <div style={{ position: 'relative', background: '#0f172a', color: '#e2e8f0', minHeight: '100vh' }}>
      <div style={BAR_STYLE}>
        <strong style={{ fontSize: '14px', marginRight: 'auto' }}>AI Computer OS</strong>
        <button style={btnStyle(editMode)} onClick={toggleEditMode}>
          ✎ 편집
        </button>
        <button style={btnStyle(false)} onClick={() => setPickerOpen((v) => !v)}>
          + 위젯
        </button>
        <button style={btnStyle(false)} onClick={resetLayout}>
          초기화
        </button>
      </div>

      {editMode && (
        <p style={{ margin: 0, padding: '4px 12px', fontSize: '12px', color: '#94a3b8' }}>
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
