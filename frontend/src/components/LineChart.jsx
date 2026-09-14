// 라인차트 (순수 프레젠테이션, 인라인 SVG — PO-8, FR-OKR-04 AC-5).
// 외부 차트 라이브러리 import 금지. 색은 CSS 변수만.
// 기본값(valueKey='krAvgPct', labelKey='month', stroke=accent)은 기존 OKR 추이 동작과 동일하다
// (지식 지도 위젯 — 개인 OS P11, ADR-0036 — 이 체크인 빈도 차트에 다른 색·키로 재사용한다).

import React from 'react';
import { buildLinePath } from './linePath.js';

const W = 320;
const H = 120;

export default function LineChart({
  points,
  valueKey = 'krAvgPct',
  labelKey = 'month',
  stroke = 'var(--w-accent, var(--accent))',
  ariaLabel = '월별 KR 평균 달성률 추이',
  formatLabel = (label) => String(label ?? '').slice(5),
}) {
  const model = buildLinePath(points, { width: W, height: H, padding: 24, valueKey, labelKey });

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
      aria-label={ariaLabel}
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
      {d && <path d={d} fill="none" stroke={stroke} strokeWidth="2" />}

      {/* 데이터 점 + 라벨 */}
      {dots.map((pt, i) => (
        <g key={`${pt.label ?? pt.month ?? i}`}>
          <circle cx={pt.x} cy={pt.y} r="3" fill={stroke} />
          <text x={pt.x} y={H - 6} fontSize="8" fill="var(--muted)" textAnchor="middle">
            {formatLabel(pt.label ?? pt.month)}
          </text>
        </g>
      ))}
    </svg>
  );
}
