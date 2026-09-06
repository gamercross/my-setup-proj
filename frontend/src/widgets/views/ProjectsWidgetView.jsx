// 프로젝트 위젯 뷰 — 스토어 구독·effect 는 이 뷰가 소유한다 (ADR-0020).
// - 기존 Dashboard.jsx 의 프로젝트 섹션 로직을 그대로 옮겼다 (<h2> 제거).

import React, { useEffect } from 'react';
import ProjectCard from '../../components/ProjectCard';
import ProjectForm from '../../components/ProjectForm';
import ErrorBanner from '../../components/ErrorBanner';
import { useProjectStore } from '../../store/useProjectStore.js';

export default function ProjectsWidgetView() {
  const projects = useProjectStore((s) => s.projects);
  const projectsLoading = useProjectStore((s) => s.loading);
  const projectsError = useProjectStore((s) => s.error);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const addProject = useProjectStore((s) => s.addProject);
  const removeProject = useProjectStore((s) => s.removeProject);
  const updateProject = useProjectStore((s) => s.updateProject);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const showProjectsLoading = projectsLoading && projects.length === 0;
  const showProjectsEmpty = !projectsLoading && projects.length === 0 && !projectsError;

  return (
    <div>
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
    </div>
  );
}
