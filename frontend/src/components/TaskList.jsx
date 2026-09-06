// props-only 프레젠테이션 컴포넌트. 데이터·로딩·에러 상태는 상위 뷰(TasksWidgetView → useTaskStore)가 주입한다.

import React from 'react';

// 우선순위별 배지 색상
function priorityColor(p) {
  if (p === 'high') return 'var(--priority-high)';
  if (p === 'low') return 'var(--priority-low)';
  return 'var(--priority-medium)'; // medium 기본
}

// 할일 목록 컴포넌트
export default function TaskList({ tasks = [], onToggle, onDelete }) {
  // 배열이 아니거나 비어 있으면 안내 문구
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return <p style={{ color: 'var(--muted)' }}>할 일이 없습니다</p>;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {tasks.map((task) => (
        <li
          key={task.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            marginBottom: '6px',
            background: 'var(--panel)',
            borderRadius: 'var(--radius)',
            color: 'var(--w-text, var(--text))',
          }}
        >
          <input
            type="checkbox"
            checked={task.status === 'done'}
            onChange={() => onToggle && onToggle(task.id)}
          />
          <span style={{ flex: 1 }}>{task.title}</span>
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
        </li>
      ))}
    </ul>
  );
}
