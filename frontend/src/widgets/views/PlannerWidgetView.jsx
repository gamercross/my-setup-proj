// 주간 플래너 위젯 뷰 — useTaskStore 파생 (P8·FR-OKR-05/06, 단일 캐시 FR-TASK-09).
// - GET /api/planner/weekly 는 호출하지 않는다. tasks 를 weekBuckets 로 버킷팅한다.
// - 완료 토글은 useTaskStore.toggleTask 1회만 호출한다.
// - 공통 컴포넌트 StatTile·Chip·ErrorBanner 만 재사용. 인라인 스타일 + CSS 변수만.

import React, { useEffect, useMemo } from 'react';
import StatTile from '../../components/StatTile.jsx';
import Chip from '../../components/Chip.jsx';
import ErrorBanner from '../../components/ErrorBanner.jsx';
import { useTaskStore } from '../../store/useTaskStore.js';
import { bucketTasks } from '../weekBuckets.js';
import { resolveDisplay } from '../displayConfig.js';

const PRIORITY_LABEL = { high: '높음', medium: '보통', low: '낮음' };

function TaskRow({ task, onToggle }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '4px 0' }}>
      <input
        type="checkbox"
        checked={task.status === 'done'}
        onChange={() => onToggle(task.id)}
        aria-label={`${task.title} 완료 토글`}
      />
      <span style={{ flex: 1, textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
        {task.title}
      </span>
      {task.due_date && <Chip variant="neutral">{String(task.due_date).slice(5, 10)}</Chip>}
      {(task.tags || []).map((t) => (
        <Chip key={t}>{t}</Chip>
      ))}
      <Chip variant={task.priority === 'high' ? 'bad' : task.priority === 'low' ? 'ok' : 'neutral'}>
        {PRIORITY_LABEL[task.priority] || task.priority}
      </Chip>
    </li>
  );
}

export default function PlannerWidgetView({ config, configSchema }) {
  const tasks = useTaskStore((s) => s.tasks);
  const loading = useTaskStore((s) => s.loading);
  const error = useTaskStore((s) => s.error);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const toggleTask = useTaskStore((s) => s.toggleTask);

  const d = resolveDisplay(configSchema, config?.display);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const buckets = useMemo(() => bucketTasks(tasks, new Date()), [tasks]);

  const shape = (items) => {
    let list = items;
    if (d.hideCompleted) list = list.filter((t) => t.status !== 'done');
    return list.slice(0, d.maxItems);
  };

  if (loading && tasks.length === 0) {
    return <p style={{ color: 'var(--muted)' }}>불러오는 중…</p>;
  }

  const thisItems = shape(buckets.thisWeek.items);
  const nextItems = shape(buckets.nextWeek.items);
  const nothing =
    buckets.lastWeek.total === 0 && buckets.thisWeek.total === 0 && buckets.nextWeek.total === 0;

  if (nothing) {
    return <p style={{ color: 'var(--muted)' }}>이번 주 마감인 할 일이 없습니다</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* CRUD 실패는 데이터를 유지한 채 배너만 오버레이한다 (위젯 전체가 사라지지 않도록). */}
      {error && <ErrorBanner message={error} onRetry={fetchTasks} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <StatTile label="지난주 완료" value={`${buckets.lastWeek.done}/${buckets.lastWeek.total}`} />
        <StatTile label="이번주 완료" value={`${buckets.thisWeek.done}/${buckets.thisWeek.total}`} tone="accent" />
        <StatTile label="다음주" value={buckets.nextWeek.total} />
      </div>

      <section>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>이번 주</div>
        {thisItems.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>표시할 항목이 없습니다</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {thisItems.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={toggleTask} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>다음 주</div>
        {nextItems.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>표시할 항목이 없습니다</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {nextItems.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={toggleTask} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
