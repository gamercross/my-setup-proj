// 위젯 프레임 — 타이틀바 + 본문(에러 경계로 격리).
// - .widget-titlebar / .widget-titlebar-btn 클래스명은 RGL 의 draggableHandle·draggableCancel 계약이다. 변경 금지.
// - 타이틀바에 -webkit-app-region 을 넣지 않는다 (Electron 창 드래그와 충돌).
// - 색·모서리·패딩은 전역 CSS 변수 + 위젯 테마(--w-*) 폴백으로 해결한다 (ADR-0022 / C6).

import React, { useState } from 'react';
import ErrorBoundary from './ErrorBoundary';
import ErrorBanner from './ErrorBanner';
import WidgetSettings from './WidgetSettings';
import { getWidgetMeta } from '../widgets/registry.js';
import { themeToVars } from '../widgets/themeVars.js';
import { useLayoutStore } from '../store/useLayoutStore.js';

const TITLEBAR_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 8px',
  background: 'var(--panel)',
  color: 'var(--text)',
  fontSize: '13px',
  borderBottom: '1px solid var(--border)',
  cursor: 'move',
  userSelect: 'none',
};

const BTN_STYLE = {
  background: 'transparent',
  border: 'none',
  color: 'var(--muted)',
  cursor: 'pointer',
  fontSize: '13px',
  padding: '0 4px',
};

export default function WidgetFrame({ instance }) {
  const { id, type, z, minimized, config } = instance;
  const bringToFront = useLayoutStore((s) => s.bringToFront);
  const toggleMinimize = useLayoutStore((s) => s.toggleMinimize);
  const removeWidget = useLayoutStore((s) => s.removeWidget);
  const updateConfig = useLayoutStore((s) => s.updateConfig);
  const focusedId = useLayoutStore((s) => s.focusedId);
  const editMode = useLayoutStore((s) => s.editMode);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const meta = getWidgetMeta(type);
  const focused = focusedId === id;

  // D-3: titlebar:'hidden' 이어도 편집 모드면 타이틀바를 유지한다(드래그·⚙·✕ 접근).
  // styles.css 클래스는 인라인 TITLEBAR_STYLE 에 눌리므로 여기서 인라인으로 합친다.
  const tb = config?.theme?.titlebar;
  const effectiveTb =
    tb === 'hidden' && editMode ? 'solid' : ['ghost', 'hidden'].includes(tb) ? tb : 'solid';
  const tbStyle = {
    ...TITLEBAR_STYLE,
    ...(effectiveTb === 'ghost' ? { background: 'transparent', borderBottom: 'none' } : {}),
    ...(effectiveTb === 'hidden' ? { display: 'none' } : {}),
  };

  return (
    <div
      className="widget"
      data-widget-id={id}
      onMouseDown={() => bringToFront(id)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--w-bg, var(--bg))',
        border: '1px solid var(--border)',
        borderRadius: 'var(--w-radius, var(--card-radius))',
        color: 'var(--w-text, var(--text))',
        overflow: 'hidden',
        // RGL `.react-grid-item` 이 transform 으로 스택 컨텍스트를 만들어 형제 간 z 비교가 안 된다.
        // 겹침 허용(프리폼) 으로 갈 때는 z 를 `.react-grid-item` 쪽으로 옮겨야 한다.
        // 현재는 compactType:'vertical' + preventCollision:false 라 위젯이 겹치지 않으므로 무해.
        zIndex: z,
        outline: focused ? '1px solid var(--w-accent, #38bdf8)' : 'none',
        ...themeToVars(config?.theme),
      }}
    >
      <div className="widget-titlebar" style={tbStyle}>
        <span aria-hidden="true">{meta ? meta.icon : '❓'}</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {meta ? meta.name : `알 수 없는 위젯 (${type})`}
        </span>
        {meta && (
          <>
            <button
              className="widget-titlebar-btn"
              style={BTN_STYLE}
              onClick={(e) => {
                e.stopPropagation();
                setSettingsOpen(true);
              }}
              title="위젯 설정"
            >
              ⚙
            </button>
            <button
              className="widget-titlebar-btn"
              style={BTN_STYLE}
              onClick={() => toggleMinimize(id)}
              title={minimized ? '펼치기' : '접기'}
            >
              {minimized ? '▢' : '─'}
            </button>
          </>
        )}
        <button
          className="widget-titlebar-btn"
          style={BTN_STYLE}
          onClick={() => removeWidget(id)}
          title="위젯 제거"
        >
          ✕
        </button>
      </div>

      {!minimized && (
        <div className="widget-body" style={{ flex: 1, overflow: 'auto', padding: 'var(--w-pad, var(--pad))' }}>
          {meta ? (
            <ErrorBoundary fallback={<ErrorBanner message="이 위젯을 표시할 수 없습니다" />}>
              <meta.view instanceId={id} config={config} configSchema={meta.configSchema} />
            </ErrorBoundary>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
              알 수 없는 위젯입니다 ({type}). 다른 버전에서 만든 레이아웃일 수 있습니다.
            </p>
          )}
        </div>
      )}

      {settingsOpen && meta && (
        <WidgetSettings
          instance={instance}
          configSchema={meta.configSchema}
          onChange={(patch) => updateConfig(id, patch)}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
