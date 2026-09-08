// 할 일 위젯 뷰 — 스토어 구독·effect 는 이 뷰가 소유한다 (ADR-0020).
// - 기존 Dashboard.jsx 의 할일 섹션 로직을 그대로 옮겼다 (<h2> 는 위젯 타이틀바가 대신하므로 제거).
// - TaskList/TaskBoard/TaskForm 는 순수 프레젠테이션이라 데이터만 주입한다.
// - config.display 는 클라이언트 필터/정렬/보기만 (C6). fetchTasks 계약 불변, 원본 배열 변형 금지.
// - view 는 config.display.view 로 저장한다 (ADR-0028 §결정4 각주, FR-TASK-09).

import React, { useEffect, useMemo } from 'react';
import TaskList from '../../components/TaskList';
import TaskBoard from '../../components/TaskBoard';
import TaskForm from '../../components/TaskForm';
import ErrorBanner from '../../components/ErrorBanner';
import { useTaskStore } from '../../store/useTaskStore.js';
import { useLayoutStore } from '../../store/useLayoutStore.js';
import { resolveDisplay } from '../displayConfig.js';
import { groupByPriority } from '../taskBoard.js';

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

// 리스트/보드 전환 버튼 스타일 (WidgetSettings.jsx TAB_BTN 규격 재사용)
const SEG_BTN = (active) => ({
  flex: 1,
  background: active ? 'var(--accent)' : 'transparent',
  color: active ? 'var(--bg)' : 'var(--muted)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '4px 8px',
  fontSize: '12px',
  cursor: 'pointer',
});

export default function TasksWidgetView({ instanceId, config, configSchema }) {
  // 필드별 개별 셀렉터로 구독한다 (객체 리터럴 반환 금지 — 불필요한 리렌더 방지)
  const tasks = useTaskStore((s) => s.tasks);
  const loading = useTaskStore((s) => s.loading);
  const error = useTaskStore((s) => s.error);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const addTask = useTaskStore((s) => s.addTask);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const removeTask = useTaskStore((s) => s.removeTask);
  const updateConfig = useLayoutStore((s) => s.updateConfig);

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

  // 보기 전환 — patchDisplay 병합 규약과 동일하게 display 하위 객체를 통째로 넘긴다.
  const setView = (next) => {
    if (!instanceId || next === d.view) return;
    updateConfig(instanceId, { display: { ...d, view: next } });
  };

  const showLoading = loading && tasks.length === 0;
  const showEmpty = !loading && visible.length === 0;

  return (
    <div>
      {error && <ErrorBanner message={error} onRetry={fetchTasks} />}

      <div role="group" aria-label="보기 방식" style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        <button style={SEG_BTN(d.view !== 'board')} aria-pressed={d.view !== 'board'} onClick={() => setView('list')}>
          리스트
        </button>
        <button style={SEG_BTN(d.view === 'board')} aria-pressed={d.view === 'board'} onClick={() => setView('board')}>
          보드
        </button>
      </div>

      {showLoading ? (
        <p style={{ color: 'var(--muted)' }}>불러오는 중…</p>
      ) : showEmpty ? (
        <TaskList tasks={[]} />
      ) : d.view === 'board' ? (
        <TaskBoard columns={groupByPriority(visible)} onToggle={toggleTask} onDelete={removeTask} />
      ) : (
        <TaskList tasks={visible} onToggle={toggleTask} onDelete={removeTask} />
      )}

      <TaskForm onSubmit={addTask} disabled={loading} />
    </div>
  );
}
