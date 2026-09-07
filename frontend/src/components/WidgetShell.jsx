// 위젯 셸 — 대시보드 OS 의 최상위 골격 (ADR-0020).
// - 마운트 시 1회 저장 레이아웃을 하이드레이션한다 (없으면 기본 레이아웃).
// - 셸 바: 제목 · 편집 토글 · 위젯 추가 · 초기화 · 테마. 평소에는 잠금(편집 모드에서만 드래그/리사이즈).
// - 색은 전역 토큰(var(--*)) 만 쓴다 (ADR-0027 라이트 테마).
// - 백엔드 연결 상태는 App 헤더의 헬스 표시가 담당한다 (여기서 중복 구현하지 않음).

import React, { useEffect, useState } from 'react';
import WidgetHost from './WidgetHost';
import WidgetPicker from './WidgetPicker';
import { useLayoutStore } from '../store/useLayoutStore.js';
import { loadLayout, defaultInstances } from '../widgets/layoutStorage.js';

const THEME_KEY = 'dashboard.theme';

const BAR_STYLE = {
  position: 'sticky',
  top: 0,
  zIndex: 500,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 14px',
  background: 'var(--panel)',
  borderBottom: '1px solid var(--border)',
};

const btnStyle = (active) => ({
  background: active ? 'var(--accent)' : 'var(--panel-2)',
  color: active ? '#ffffff' : 'var(--text)',
  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
  borderRadius: '8px',
  padding: '5px 12px',
  fontSize: '13px',
  cursor: 'pointer',
});

// 저장된 테마를 문서 루트에 적용한다 (없으면 라이트).
function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}
function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === 'dark') root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    // 저장 실패는 조용히 무시
  }
}

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
  const [theme, setTheme] = useState('light');

  // 마운트 1회 하이드레이션 + 테마 적용
  useEffect(() => {
    setInstances(loadLayout() ?? defaultInstances());
    const t = readTheme();
    setTheme(t);
    applyTheme(t);
    setHydrated(true);
  }, [setInstances]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  if (!hydrated) {
    return (
      <p style={{ padding: '24px', color: 'var(--muted)', background: 'var(--bg)' }}>불러오는 중…</p>
    );
  }

  const activeTypes = instances.map((w) => w.type);

  return (
    <div
      style={{ position: 'relative', background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}
    >
      <div style={BAR_STYLE}>
        <strong style={{ fontSize: '14px', marginRight: 'auto', color: 'var(--text)' }}>
          AI Computer OS
        </strong>
        <button
          style={btnStyle(editMode)}
          onClick={toggleEditMode}
          title={editMode ? '편집 종료' : '위젯 이동·크기 조절'}
        >
          {editMode ? '✓ 편집 완료' : '✎ 편집'}
        </button>
        <button style={btnStyle(false)} onClick={() => setPickerOpen((v) => !v)}>
          + 위젯
        </button>
        <button style={btnStyle(false)} onClick={resetLayout} title="기본 레이아웃으로 되돌리기">
          초기화
        </button>
        <button style={btnStyle(false)} onClick={toggleTheme} title="라이트/다크 전환">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      {editMode && (
        <p
          style={{
            margin: 0,
            padding: '6px 14px',
            fontSize: '12px',
            color: 'var(--accent)',
            background: 'var(--accent-soft)',
          }}
        >
          편집 모드 — 타이틀바를 끌어 위치를, 모서리를 끌어 크기를 조절하세요. 다 되면 "편집 완료".
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
