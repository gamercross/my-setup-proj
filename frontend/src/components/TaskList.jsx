// props-only 프레젠테이션 컴포넌트. 데이터·로딩·에러 상태는 상위 뷰(TasksWidgetView → useTaskStore)가 주입한다.
// 카드 렌더는 TaskCard 로 통일한다 (<ul>/<li> 시맨틱은 유지).

import React from 'react';
import TaskCard from './TaskCard';

// 할일 목록 컴포넌트
export default function TaskList({
  tasks = [],
  onToggle,
  onDelete,
  activeTag,
  onTagSelect,
  onTagAdd,
  onTagRemove,
}) {
  // 배열이 아니거나 비어 있으면 안내 문구
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return <p style={{ color: 'var(--muted)' }}>할 일이 없습니다</p>;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {tasks.map((task) => (
        <li key={task.id}>
          <TaskCard
            task={task}
            onToggle={onToggle}
            onDelete={onDelete}
            activeTag={activeTag}
            onTagSelect={onTagSelect}
            onTagAdd={onTagAdd}
            onTagRemove={onTagRemove}
          />
        </li>
      ))}
    </ul>
  );
}
