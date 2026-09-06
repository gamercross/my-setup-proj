// 할 일 위젯 뷰 — 스토어 구독·effect 는 이 뷰가 소유한다 (ADR-0020).
// - 기존 Dashboard.jsx 의 할일 섹션 로직을 그대로 옮겼다 (<h2> 는 위젯 타이틀바가 대신하므로 제거).
// - TaskList/TaskForm 는 순수 프레젠테이션이라 수정 없이 그대로 쓴다.

import React, { useEffect } from 'react';
import TaskList from '../../components/TaskList';
import TaskForm from '../../components/TaskForm';
import ErrorBanner from '../../components/ErrorBanner';
import { useTaskStore } from '../../store/useTaskStore.js';

export default function TasksWidgetView() {
  // 필드별 개별 셀렉터로 구독한다 (객체 리터럴 반환 금지 — 불필요한 리렌더 방지)
  const tasks = useTaskStore((s) => s.tasks);
  const loading = useTaskStore((s) => s.loading);
  const error = useTaskStore((s) => s.error);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const addTask = useTaskStore((s) => s.addTask);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const removeTask = useTaskStore((s) => s.removeTask);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const showLoading = loading && tasks.length === 0;
  const showEmpty = !loading && tasks.length === 0;

  return (
    <div>
      {error && <ErrorBanner message={error} onRetry={fetchTasks} />}

      {showLoading ? (
        <p style={{ color: '#94a3b8' }}>불러오는 중…</p>
      ) : showEmpty ? (
        <TaskList tasks={[]} />
      ) : (
        <TaskList tasks={tasks} onToggle={toggleTask} onDelete={removeTask} />
      )}

      <TaskForm onSubmit={addTask} disabled={loading} />
    </div>
  );
}
