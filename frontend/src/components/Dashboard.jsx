// 메인 대시보드. 할일 패널은 useTaskStore, 프로젝트 패널은 useProjectStore 로 배선되어 있다.

import React, { useEffect } from 'react';
import TaskList from './TaskList';
import ProjectCard from './ProjectCard';
import TaskForm from './TaskForm';
import ProjectForm from './ProjectForm';
import ErrorBanner from './ErrorBanner';
import { useTaskStore } from '../store/useTaskStore.js';
import { useProjectStore } from '../store/useProjectStore.js';

export default function Dashboard() {
  // 필드별 개별 셀렉터로 구독한다 (객체 리터럴 반환 금지 — 불필요한 리렌더 방지)
  const tasks = useTaskStore((s) => s.tasks);
  const loading = useTaskStore((s) => s.loading);
  const error = useTaskStore((s) => s.error);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const addTask = useTaskStore((s) => s.addTask);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const removeTask = useTaskStore((s) => s.removeTask);

  const projects = useProjectStore((s) => s.projects);
  const projectsLoading = useProjectStore((s) => s.loading);
  const projectsError = useProjectStore((s) => s.error);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const addProject = useProjectStore((s) => s.addProject);
  const removeProject = useProjectStore((s) => s.removeProject);
  const updateProject = useProjectStore((s) => s.updateProject);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const showLoading = loading && tasks.length === 0;
  const showEmpty = !loading && tasks.length === 0;

  const showProjectsLoading = projectsLoading && projects.length === 0;
  const showProjectsEmpty = !projectsLoading && projects.length === 0 && !projectsError;

  return (
    <div style={{ padding: '24px', background: '#0f172a', color: '#e2e8f0', minHeight: '100vh' }}>
      <h1 style={{ marginTop: 0 }}>AI Computer OS</h1>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* 좌측: 할일 패널 */}
        <section style={{ flex: 1 }}>
          <h2 style={{ fontSize: '16px', color: '#94a3b8' }}>할 일</h2>

          {/* 에러 배너는 목록 위에. 에러가 있어도 기존 tasks 는 계속 렌더 */}
          {error && <ErrorBanner message={error} onRetry={fetchTasks} />}

          {showLoading ? (
            <p style={{ color: '#94a3b8' }}>불러오는 중…</p>
          ) : showEmpty ? (
            <TaskList tasks={[]} />
          ) : (
            <TaskList tasks={tasks} onToggle={toggleTask} onDelete={removeTask} />
          )}

          <TaskForm onSubmit={addTask} disabled={loading} />
        </section>

        {/* 우측: 프로젝트 패널 */}
        <section style={{ flex: 1 }}>
          <h2 style={{ fontSize: '16px', color: '#94a3b8' }}>프로젝트</h2>

          {projectsError && <ErrorBanner message={projectsError} onRetry={fetchProjects} />}

          {showProjectsLoading ? (
            <p style={{ color: '#94a3b8' }}>불러오는 중…</p>
          ) : showProjectsEmpty ? (
            <p style={{ color: '#94a3b8' }}>프로젝트가 없습니다</p>
          ) : (
            projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onDelete={removeProject}
                onProgressChange={(id, v) => updateProject(id, { progress: v })}
                onStatusChange={(id, v) => updateProject(id, { status: v })}
              />
            ))
          )}

          <ProjectForm onSubmit={addProject} disabled={projectsLoading} />
        </section>
      </div>
    </div>
  );
}
