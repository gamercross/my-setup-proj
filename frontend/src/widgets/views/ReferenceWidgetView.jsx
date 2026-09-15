// 레퍼런스 자료 위젯 뷰 — 스토어 구독·effect·4상태는 이 뷰가 소유한다 (개인 OS P12, ADR-0037).
// - 공통 컴포넌트 Chip·DotProgress·StatTile·ErrorBanner 만 재사용한다.
// - 새 공용 컴포넌트는 만들지 않는다 (카드·폼은 이 파일의 로컬 컴포넌트).
// - 인라인 스타일 + CSS 변수만 (styles.css 무변경). 하드코딩 hex 없음.
// - 상태 필터 바는 클라이언트 측 필터다 (재fetch 안 함 — ADR-0028 단일캐시 관례).
// - 요약 진행도(%) 는 서버가 계산하지 않는다. DotProgress 는 프런트 전용 표시(ADR-0035 선례).

import React, { useEffect, useState } from 'react';
import Chip from '../../components/Chip.jsx';
import DotProgress from '../../components/DotProgress.jsx';
import StatTile from '../../components/StatTile.jsx';
import ErrorBanner from '../../components/ErrorBanner.jsx';
import { useReferenceStore } from '../../store/useReferenceStore.js';
import { useProjectStore } from '../../store/useProjectStore.js';
import { resolveDisplay } from '../displayConfig.js';

// status → { 라벨, 프런트 전용 진행도(%) } — 4단계 고정 (ADR-0037).
const STATUS_META = {
  todo: { label: '할 일', pct: 0 },
  reading: { label: '읽는 중', pct: 33 },
  summarizing: { label: '요약 중', pct: 66 },
  done: { label: '완료', pct: 100 },
};
const STATUS_ORDER = ['todo', 'reading', 'summarizing', 'done'];
const FILTER_OPTIONS = ['all', ...STATUS_ORDER];

const inputStyle = {
  padding: '5px 8px',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  background: 'var(--panel)',
  color: 'var(--text)',
  fontSize: '13px',
};
const btnStyle = {
  background: 'var(--w-accent, var(--accent))',
  color: 'var(--bg)',
  border: 'none',
  borderRadius: '6px',
  padding: '5px 12px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

// 오늘로부터 며칠 남았는지(음수면 지남). due_date 는 'YYYY-MM-DD' 문자열.
function daysUntil(dueDate) {
  if (!dueDate) return null;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const ms = new Date(dueDate) - new Date(todayKey);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// http(s):// 로 시작할 때만 링크로 렌더한다 (스킴 주입 방지).
function LocationField({ location }) {
  if (!location) return null;
  const isLink = /^https?:\/\//.test(location);
  if (isLink) {
    return (
      <a href={location} target="_blank" rel="noreferrer" style={{ color: 'var(--w-accent, var(--accent))', fontSize: '12px' }}>
        {location}
      </a>
    );
  }
  return <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{location}</span>;
}

// ── 요약 단계 추가 폼 (로컬) ────────────────────────────
function StepForm({ onAdd }) {
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!note.trim()) {
      setNotice('요약 단계 내용을 입력해 주세요.');
      return;
    }
    const ok = await onAdd(note.trim());
    if (ok) {
      setNote('');
      setNotice('');
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
      <input
        style={{ ...inputStyle, flex: 1 }}
        placeholder="이번 요약 단계에서 한 일"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button type="submit" style={btnStyle}>추가</button>
      {notice && <span style={{ fontSize: '12px', color: 'var(--priority-high)' }}>{notice}</span>}
    </form>
  );
}

// ── 레퍼런스 카드 (로컬) ────────────────────────────────
function ReferenceCard({ reference, expanded, onToggle, onRemove, onAddStep, onRemoveStep }) {
  const statusMeta = STATUS_META[reference.status] || STATUS_META.todo;
  const remain = daysUntil(reference.due_date);
  const steps = reference.steps || [];

  return (
    <li style={{ borderLeft: '2px solid var(--border)', paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', cursor: 'pointer' }} onClick={onToggle}>
        <span style={{ fontWeight: 600, fontSize: '13px' }}>{reference.title}</span>
        {reference.category && <Chip variant="neutral">{reference.category}</Chip>}
        <Chip variant={reference.status === 'done' ? 'ok' : 'neutral'}>{statusMeta.label}</Chip>
        {reference.due_date && (
          <span style={{ fontSize: '12px', color: remain !== null && remain < 0 ? 'var(--bad)' : 'var(--muted)' }}>
            {reference.due_date}{remain !== null ? ` (${remain >= 0 ? `D-${remain}` : `${-remain}일 지남`})` : ''}
          </span>
        )}
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>단계 {steps.length}개</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(reference.id); }}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
          aria-label="레퍼런스 삭제"
        >
          ✕
        </button>
      </div>
      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <DotProgress pct={statusMeta.pct} total={4} showPercent={false} />
          <LocationField location={reference.location} />
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>요약 절차 이력</div>
            {steps.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>아직 기록된 단계가 없습니다.</p>
            ) : (
              <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {steps.map((s) => (
                  <li key={s.id} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ flex: 1 }}>{s.note}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveStep(reference.id, s.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                      aria-label="요약 단계 삭제"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <StepForm onAdd={(note) => onAddStep(reference.id, note)} />
          </div>
        </div>
      )}
    </li>
  );
}

// ── 새 레퍼런스 폼 (로컬, 기본 접힘) ─────────────────────
function ReferenceForm({ projects, onSubmit, showForm }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('');
  const [notice, setNotice] = useState('');

  const reset = () => {
    setTitle('');
    setCategory('');
    setLocation('');
    setDueDate('');
    setProjectId('');
    setNotice('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setNotice('title 은 필수입니다.');
      return;
    }
    const payload = { title: title.trim() };
    if (category.trim()) payload.category = category.trim();
    if (location.trim()) payload.location = location.trim();
    if (dueDate.trim()) payload.due_date = dueDate.trim();
    if (projectId) payload.project_id = Number(projectId);

    const ok = await onSubmit(payload);
    if (ok) {
      reset();
      setOpen(false);
    }
  };

  if (!showForm) return null;

  if (!open) {
    return (
      <button type="button" style={btnStyle} onClick={() => setOpen(true)}>
        + 새 레퍼런스
      </button>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
      <input style={inputStyle} placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input style={inputStyle} placeholder="카테고리 (예: 강의)" value={category} onChange={(e) => setCategory(e.target.value)} />
      <input style={inputStyle} placeholder="자료 위치 (URL 또는 메모)" value={location} onChange={(e) => setLocation(e.target.value)} />
      <input style={inputStyle} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      <select style={inputStyle} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
        <option value="">연결 없음</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {notice && <p style={{ fontSize: '12px', color: 'var(--priority-high)' }}>{notice}</p>}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button type="submit" style={btnStyle}>저장</button>
        <button type="button" style={{ ...inputStyle, cursor: 'pointer' }} onClick={() => { reset(); setOpen(false); }}>
          취소
        </button>
      </div>
    </form>
  );
}

export default function ReferenceWidgetView({ config, configSchema }) {
  const references = useReferenceStore((s) => s.references);
  const loading = useReferenceStore((s) => s.loading);
  const loaded = useReferenceStore((s) => s.loaded);
  const error = useReferenceStore((s) => s.error);
  const fetchReferences = useReferenceStore((s) => s.fetchReferences);
  const addReference = useReferenceStore((s) => s.addReference);
  const removeReference = useReferenceStore((s) => s.removeReference);
  const addStep = useReferenceStore((s) => s.addStep);
  const removeStep = useReferenceStore((s) => s.removeStep);

  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);

  const d = resolveDisplay(configSchema, config?.display);
  const [filter, setFilter] = useState(d.statusFilter);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchReferences();
  }, [fetchReferences]);

  useEffect(() => {
    if (projects.length === 0) fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !loaded) {
    return <p style={{ color: 'var(--muted)' }}>불러오는 중…</p>;
  }

  const total = references.length;
  const dueSoon = references.filter((r) => {
    const remain = daysUntil(r.due_date);
    return remain !== null && remain >= 0 && remain <= 3;
  }).length;
  const done = references.filter((r) => r.status === 'done').length;

  if (loaded && total === 0) {
    return (
      <div>
        {error && <ErrorBanner message={error} onRetry={() => fetchReferences()} />}
        <p style={{ color: 'var(--muted)' }}>아직 등록된 레퍼런스가 없습니다</p>
        <ReferenceForm projects={projects} onSubmit={addReference} showForm={d.showForm} />
      </div>
    );
  }

  const filtered = filter === 'all' ? references : references.filter((r) => r.status === filter);
  const shown = filtered.slice(0, d.maxItems);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {error && <ErrorBanner message={error} onRetry={() => fetchReferences()} />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <StatTile label="총 자료" value={total} />
        <StatTile label="마감 임박(3일)" value={dueSoon} tone={dueSoon > 0 ? 'warn' : 'default'} />
        <StatTile label="요약 완료" value={done} tone="ok" />
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {FILTER_OPTIONS.map((opt) => (
          <Chip
            key={opt}
            variant={filter === opt ? 'active' : 'neutral'}
            onClick={() => setFilter(opt)}
          >
            {opt === 'all' ? '전체' : STATUS_META[opt].label}
          </Chip>
        ))}
      </div>
      <ReferenceForm projects={projects} onSubmit={addReference} showForm={d.showForm} />
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {shown.map((r) => (
          <ReferenceCard
            key={r.id}
            reference={r}
            expanded={expandedId === r.id}
            onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
            onRemove={removeReference}
            onAddStep={addStep}
            onRemoveStep={removeStep}
          />
        ))}
      </ul>
    </div>
  );
}
