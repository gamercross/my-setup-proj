// props-only 프레젠테이션 컴포넌트. 데이터·콜백은 상위 뷰(ProjectsWidgetView → useProjectStore)가 주입한다.

import React, { useState, useEffect } from 'react';

// 값을 min~max 범위로 자른다
function clamp(v, min, max) {
  const n = Number(v);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

// 상태 코드 → 한글 라벨 (스키마: active/done/on_hold)
function statusLabel(s) {
  if (s === 'done') return '완료';
  if (s === 'on_hold') return '보류';
  if (!s || s === 'active') return '진행 중';
  return s; // 알 수 없는 값은 원문 노출
}

// 프로젝트 카드 컴포넌트 (순수 프레젠테이션 — 스토어/fetch 직접 참조 금지)
// - onDelete(id), onProgressChange(id, next), onStatusChange(id, value) 콜백이 없으면
//   해당 컨트롤을 렌더하지 않는다 (기존 사용처 호환).
// 훅은 Rules of Hooks 를 지키기 위해 항상 함수 최상단에서 호출하고, 가드는 훅 이후에 둔다.
export default function ProjectCard({ project, onDelete, onProgressChange, onStatusChange }) {
  const pct = clamp(project?.progress, 0, 100);

  // 슬라이더 드래그 중에는 로컬 값만 갱신하고, 확정 시점(onMouseUp/onBlur)에만 콜백을 호출한다.
  const [draft, setDraft] = useState(pct);

  // props 로 들어온 진행도가 바뀌면 로컬 값도 맞춘다 (낙관적 갱신/서버 응답 반영)
  useEffect(() => {
    setDraft(pct);
  }, [pct]);

  if (!project) return null;

  const commitProgress = () => {
    if (onProgressChange && draft !== pct) onProgressChange(project.id, draft);
  };

  return (
    <div
      style={{
        padding: '12px 16px',
        marginBottom: '10px',
        background: 'var(--panel)',
        borderRadius: 'var(--card-radius)',
        color: 'var(--w-text, var(--text))',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{project.name}</strong>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onStatusChange ? (
            <select
              value={project.status || 'active'}
              onChange={(e) => onStatusChange(project.id, e.target.value)}
              style={{
                fontSize: '12px',
                padding: '2px 6px',
                borderRadius: '6px',
                background: 'var(--bg)',
                color: 'var(--muted)',
                border: '1px solid var(--muted)',
              }}
            >
              <option value="active">진행 중</option>
              <option value="done">완료</option>
              <option value="on_hold">보류</option>
            </select>
          ) : (
            <span
              style={{
                fontSize: '12px',
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'var(--bg)',
                color: 'var(--muted)',
              }}
            >
              {statusLabel(project.status)}
            </span>
          )}
          {onDelete && (
            <button onClick={() => onDelete(project.id)}>삭제</button>
          )}
        </span>
      </div>

      {/* 진행도 바 */}
      <div
        style={{
          marginTop: '8px',
          height: '8px',
          background: 'var(--bg)',
          borderRadius: '999px',
          overflow: 'hidden',
        }}
      >
        <div style={{ width: pct + '%', height: '100%', background: 'var(--w-accent, var(--accent))' }} />
      </div>
      <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--muted)' }}>{pct}%</div>

      {onProgressChange && (
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={draft}
          onChange={(e) => setDraft(Number(e.target.value))}
          onMouseUp={commitProgress}
          onBlur={commitProgress}
          style={{ width: '100%', marginTop: '6px' }}
        />
      )}
    </div>
  );
}
