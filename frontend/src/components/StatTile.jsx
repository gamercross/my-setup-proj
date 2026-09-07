// 스탯 타일 (순수 프레젠테이션) — 큰 숫자 한 개 + 라벨.
// tone 으로 숫자 색만 구간별로 바꾼다 (달성률 색코딩).

import React from 'react';

// tone → 숫자 색 토큰
const TONE_COLOR = {
  default: 'var(--text)',
  accent: 'var(--accent)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  bad: 'var(--bad)',
};

export default function StatTile({ label, value, tone = 'default' }) {
  return (
    <div
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '18px',
      }}
    >
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>{label}</div>
      <div
        style={{
          fontWeight: 700,
          fontSize: '40px',
          lineHeight: 1,
          color: TONE_COLOR[tone] || TONE_COLOR.default,
        }}
      >
        {value}
      </div>
    </div>
  );
}
