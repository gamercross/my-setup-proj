// 구조 스캐폴드. Week 3에서 Dashboard가 API 데이터를 주입한다.

import React from 'react';
import TaskList from './TaskList';
import ProjectCard from './ProjectCard';

// 메인 대시보드 컴포넌트
export default function Dashboard() {
  // Week 3에서 fetch('http://localhost:3000/api/tasks') 로 로드
  const [tasks, setTasks] = React.useState([]);
  // Week 3에서 fetch('http://localhost:3000/api/projects') 로 로드
  const [projects, setProjects] = React.useState([]);

  // Week 3에서 PUT/DELETE 호출로 교체 (지금은 로컬 state 만 갱신)
  const handleToggle = (id) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t
      )
    );
  };

  // Week 3에서 PUT/DELETE 호출로 교체 (지금은 로컬 state 만 갱신)
  const handleDelete = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div style={{ padding: '24px', background: '#0f172a', color: '#e2e8f0', minHeight: '100vh' }}>
      <h1 style={{ marginTop: 0 }}>AI Computer OS</h1>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* 좌측: 할일 목록 */}
        <section style={{ flex: 1 }}>
          <h2 style={{ fontSize: '16px', color: '#94a3b8' }}>할 일</h2>
          <TaskList tasks={tasks} onToggle={handleToggle} onDelete={handleDelete} />
        </section>

        {/* 우측: 프로젝트 카드 목록 */}
        <section style={{ flex: 1 }}>
          <h2 style={{ fontSize: '16px', color: '#94a3b8' }}>프로젝트</h2>
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </section>
      </div>
    </div>
  );
}
