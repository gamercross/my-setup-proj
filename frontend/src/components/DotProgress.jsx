// 점그리드 진행바 (순수 프레젠테이션). solid bar 대신 점 20칸으로 통일 (PERSONAL_OS §4).
// 데이터는 상위에서 pct 로 주입한다.

import React from 'react';
import { dotFill, normalizeTotal, clampPct } from './dotFill.js';

export default function DotProgress({ label, pct, total = 20, showPercent = true }) {
  // 점 개수와 채움 개수가 같은 total 을 쓰도록 한 번만 정규화한다.
  const dotCount = normalizeTotal(total);
  const filled = dotFill(pct, dotCount);
  const clamped = clampPct(pct);

  const dots = [];
  for (let i = 0; i < dotCount; i += 1) {
    dots.push(
      <span
        key={i}
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '2px',
          background: i < filled ? 'var(--w-accent, var(--accent))' : 'var(--border)',
        }}
      />,
    );
  }

  return (
    <div>
      {(label || showPercent) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '13px',
            marginBottom: '8px',
          }}
        >
          <span>{label}</span>
          {showPercent && <span style={{ fontWeight: 700, color: 'var(--muted)' }}>{clamped}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        {...(label ? { 'aria-label': label } : {})}
        style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}
      >
        {dots}
      </div>
    </div>
  );
}
