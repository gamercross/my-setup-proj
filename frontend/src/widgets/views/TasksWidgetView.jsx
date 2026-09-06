// 할 일 위젯 뷰 — 스토어 구독·effect 는 이 뷰가 소유한다 (ADR-0020).
// - 기존 Dashboard.jsx 의 할일 섹션 로직을 그대로 옮겼다 (<h2> 는 위젯 타이틀바가 대신하므로 제거).
// - TaskList/TaskForm 는 순수 프레젠테이션이라 수정 없이 그대로 쓴다.
// - config.display 는 클라이언트 필터/정렬만 (C6). fetchTasks 계약 불변, 원본 배열 변형 금지.

import React, { useEffect, useMemo } from 'react';
import TaskList from '../../components/TaskList';
import TaskForm from '../../components/TaskForm';
import ErrorBanner from '../../components/ErrorBanner';
import { useTaskStore } from '../../store/useTaskStore.js';
import { resolveDisplay } from '../displayConfig.js';

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

export default function TasksWidgetView({ config, configSchema }) {
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

  const d = resolveDisplay(configSchema, config?.display);

  const visible = useMemo(() => {
    const src = Array.isArray(tasks) ? tasks : [];
    // 원본을 건드리지 않도록 복사본으로만 필터·정렬
    const list = d.hideCompleted ? src.filter((t) => t.status !== 'done') : src.slice();
    if (d.sortBy === 'due') {
      list.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return String(a.due_date).localeCompare(String(b.due_date));
      });
    } else if (d.sortBy === 'priority') {
      list.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1));
    } else {
      // created: created_at 내림차순
      list.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    }
    return list.slice(0, d.maxItems);
  }, [tasks, d.hideCompleted, d.sortBy, d.maxItems]);

  const showLoading = loading && tasks.length === 0;
  const showEmpty = !loading && visible.length === 0;

  return (
    <div>
      {error && <ErrorBanner message={error} onRetry={fetchTasks} />}

      {showLoading ? (
        <p style={{ color: 'var(--muted)' }}>불러오는 중…</p>
      ) : showEmpty ? (
        <TaskList tasks={[]} />
      ) : (
        <TaskList tasks={visible} onToggle={toggleTask} onDelete={removeTask} />
      )}

      <TaskForm onSubmit={addTask} disabled={loading} />
    </div>
  );
}
