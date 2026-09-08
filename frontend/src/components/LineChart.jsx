// 월별 달성률 라인차트 (순수 프레젠테이션, 인라인 SVG — PO-8, FR-OKR-04 AC-5).
// 외부 차트 라이브러리 import 금지. 색은 CSS 변수만.

import React from 'react';
import { buildLinePath } from './linePath.js';

const W = 320;
const H = 120;

export default function LineChart({ points }) {
  const model = buildLinePath(points, { width: W, height: H, padding: 24 });

  if (!model) {
    return (
      <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>
        데이터가 쌓이면 추이가 보입니다
      </p>
    );
  }

  const { d, dots, yTicks } = model;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label="월별 KR 평균 달성률 추이"
    >
      {/* y축 가이드라인 (0/50/100%) */}
      {yTicks.map((t) => (
        <g key={t.label}>
          <line x1={24} y1={t.y} x2={W - 24} y2={t.y} stroke="var(--border)" strokeWidth="1" />
          <text x={2} y={t.y + 3} fontSize="8" fill="var(--muted)">
            {t.label}
          </text>
        </g>
      ))}

      {/* 추이 선 */}
      {d && <path d={d} fill="none" stroke="var(--w-accent, var(--accent))" strokeWidth="2" />}

      {/* 데이터 점 + 월 라벨 */}
      {dots.map((pt) => (
        <g key={pt.month}>
          <circle cx={pt.x} cy={pt.y} r="3" fill="var(--w-accent, var(--accent))" />
          <text x={pt.x} y={H - 6} fontSize="8" fill="var(--muted)" textAnchor="middle">
            {pt.month.slice(5)}
          </text>
        </g>
      ))}
    </svg>
  );
}
