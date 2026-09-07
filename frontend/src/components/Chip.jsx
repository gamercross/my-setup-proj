// 칩 (순수 프레젠테이션) — 필터/상태 라벨.
// onClick 이 있으면 버튼(상호작용), 없으면 span(정적 표시).

import React from 'react';

// variant → { 배경, 글자색 } 토큰
const VARIANT_STYLE = {
  active: { background: 'var(--accent-soft)', color: 'var(--accent)' },
  neutral: { background: 'var(--panel-2)', color: 'var(--muted)' },
  ok: { background: 'var(--panel-2)', color: 'var(--ok)' },
  warn: { background: 'var(--panel-2)', color: 'var(--warn)' },
  bad: { background: 'var(--panel-2)', color: 'var(--bad)' },
};

export default function Chip({ variant = 'neutral', onClick, title, children }) {
  const v = VARIANT_STYLE[variant] || VARIANT_STYLE.neutral;
  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 11px',
    borderRadius: 'var(--chip-radius)',
    fontSize: '12px',
    fontWeight: 600,
    background: v.background,
    color: v.color,
  };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={title} style={{ ...style, border: 'none', cursor: 'pointer' }}>
        {children}
      </button>
    );
  }
  return (
    <span title={title} style={style}>
      {children}
    </span>
  );
}
