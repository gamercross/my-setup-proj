// 할일 보드(칸반) 뷰 — props-only 프레젠테이션 (FR-TASK-09).
// - 상위 뷰(TasksWidgetView)가 groupByPriority 로 만든 열 데이터를 columns 로 주입한다.
// - onToggle / onDelete 는 그대로 위로 전달한다.

import React from 'react';
import TaskCard from './TaskCard';
import { BOARD_COLUMNS } from '../widgets/taskBoard.js';

export default function TaskBoard({ columns = {}, onToggle, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
      {BOARD_COLUMNS.map((col) => {
        const items = Array.isArray(columns[col.key]) ? columns[col.key] : [];
        return (
          <div
            key={col.key}
            style={{
              minWidth: '180px',
              flex: 1,
              background: 'var(--panel-2)',
              borderRadius: 'var(--card-radius)',
              padding: '8px',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
              {col.label} ({items.length})
            </div>
            {items.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '12px', margin: 0 }}>비어 있음</p>
            ) : (
              items.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
