// 할일 카드 1장 — props-only 프레젠테이션 (TaskList.jsx 선례).
// 보드 뷰(TaskBoard)와 리스트 뷰가 공유하는 표시 규칙(우선순위 색)을 여기 한 곳에 둔다.

import React from 'react';

// 우선순위별 배지 색상 (TaskList 도 이걸 import 한다 — 중복 제거)
export function priorityColor(p) {
  if (p === 'high') return 'var(--priority-high)';
  if (p === 'low') return 'var(--priority-low)';
  return 'var(--priority-medium)'; // medium 기본
}

// 카드: 체크박스 + 제목(완료 시 취소선) + 기한 + 우선순위 배지 + 삭제 버튼
export default function TaskCard({ task, onToggle, onDelete }) {
  if (!task) return null;
  const done = task.status === 'done';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 10px',
        marginBottom: '8px',
        background: 'var(--panel)',
        borderRadius: 'var(--card-radius)',
        boxShadow: 'var(--shadow-card)',
        color: 'var(--w-text, var(--text))',
      }}
    >
      <input
        type="checkbox"
        checked={done}
        onChange={() => onToggle && onToggle(task.id)}
      />
      <span style={{ flex: 1, textDecoration: done ? 'line-through' : 'none' }}>{task.title}</span>
      {task.due_date && (
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{task.due_date}</span>
      )}
      <span
        style={{
          fontSize: '12px',
          padding: '2px 8px',
          borderRadius: '999px',
          background: priorityColor(task.priority),
          color: 'var(--bg)',
        }}
      >
        {task.priority || 'medium'}
      </span>
      <button onClick={() => onDelete && onDelete(task.id)}>삭제</button>
    </div>
  );
}
