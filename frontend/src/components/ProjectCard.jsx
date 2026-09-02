// 구조 스캐폴드. Week 3에서 Dashboard가 API 데이터를 주입한다.

import React from 'react';

// 값을 min~max 범위로 자른다
function clamp(v, min, max) {
  const n = Number(v);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

// 상태 코드 → 한글 라벨
function statusLabel(s) {
  if (s === 'done') return '완료';
  if (s === 'hold') return '보류';
  return '진행 중'; // active 기본
}

// 프로젝트 카드 컴포넌트
export default function ProjectCard({ project }) {
  if (!project) return null;

  const pct = clamp(project.progress, 0, 100);

  return (
    <div
      style={{
        padding: '12px 16px',
        marginBottom: '10px',
        background: '#1e293b',
        borderRadius: '10px',
        color: '#e2e8f0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{project.name}</strong>
        <span
          style={{
            fontSize: '12px',
            padding: '2px 8px',
            borderRadius: '999px',
            background: '#0f172a',
            color: '#94a3b8',
          }}
        >
          {statusLabel(project.status)}
        </span>
      </div>

      {/* 진행도 바 */}
      <div
        style={{
          marginTop: '8px',
          height: '8px',
          background: '#0f172a',
          borderRadius: '999px',
          overflow: 'hidden',
        }}
      >
        <div style={{ width: pct + '%', height: '100%', background: '#f59e0b' }} />
      </div>
      <div style={{ marginTop: '4px', fontSize: '12px', color: '#94a3b8' }}>{pct}%</div>
    </div>
  );
}
