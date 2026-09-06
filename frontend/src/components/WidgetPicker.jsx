// 위젯 피커 — 레지스트리 목록에서 위젯을 추가한다.
// - 이미 대시보드에 올라간 타입은 비활성 + "이미 추가됨" (타입당 1개 — DO-2).

import React from 'react';
import { WIDGET_TYPES } from '../widgets/registry.js';

const PANEL_STYLE = {
  position: 'absolute',
  top: '44px',
  left: '12px',
  zIndex: 1000,
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '8px',
  width: '300px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
};

export default function WidgetPicker({ activeTypes, onAdd, onClose }) {
  const active = new Set(activeTypes);

  return (
    <div style={PANEL_STYLE}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <strong style={{ fontSize: '13px', color: '#e2e8f0' }}>위젯 추가</strong>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      {WIDGET_TYPES.map((meta) => {
        const added = active.has(meta.type);
        return (
          <button
            key={meta.type}
            disabled={added}
            onClick={() => onAdd(meta.type)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              textAlign: 'left',
              background: added ? '#0f172a' : '#334155',
              color: added ? '#64748b' : '#e2e8f0',
              border: 'none',
              borderRadius: '6px',
              padding: '8px',
              marginBottom: '4px',
              cursor: added ? 'default' : 'pointer',
            }}
          >
            <span aria-hidden="true">{meta.icon}</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: '13px' }}>{meta.name}</span>
              <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8' }}>
                {meta.description}
              </span>
            </span>
            {added && <span style={{ fontSize: '11px' }}>이미 추가됨</span>}
          </button>
        );
      })}
    </div>
  );
}
