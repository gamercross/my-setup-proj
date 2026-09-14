// 기대정렬 체크인 위젯 뷰 — 스토어 구독·effect·4상태는 이 뷰가 소유한다 (개인 OS P10, ADR-0035).
// - 공통 컴포넌트 Chip·DotProgress·ErrorBanner 만 재사용한다.
// - 새 공용 컴포넌트는 만들지 않는다 (카드·폼은 이 파일의 로컬 컴포넌트).
// - 인라인 스타일 + CSS 변수만 (styles.css 무변경). 하드코딩 hex 없음.

import React, { useEffect, useState } from 'react';
import Chip from '../../components/Chip.jsx';
import DotProgress from '../../components/DotProgress.jsx';
import ErrorBanner from '../../components/ErrorBanner.jsx';
import { useCheckinStore } from '../../store/useCheckinStore.js';
import { useProjectStore } from '../../store/useProjectStore.js';
import { useOkrStore } from '../../store/useOkrStore.js';
import { resolveDisplay } from '../displayConfig.js';

// 7개 질문 — 순서·라벨 고정 (기대정렬 원 진술, ADR-0035 맥락 참조).
const QUESTIONS = [
  { key: 'what', label: '내가 뭘 하고 있지?' },
  { key: 'why', label: '이걸 왜 하지?' },
  { key: 'until', label: '언제까지 할 것인지?' },
  { key: 'goal', label: '어떤 목표지?' },
  { key: 'strategy', label: '어떤 전략이지?' },
  { key: 'action', label: '무엇을 구체적으로 할 것인지?' },
  { key: 'status', label: '어떤 상태인지?' },
];

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

// ── 체크인 카드 (로컬) ────────────────────────────────
function CheckinCard({ checkin, projects, objectives, onRemove }) {
  const answered = QUESTIONS.filter((q) => checkin[q.key]);
  const project = projects.find((p) => p.id === checkin.project_id);
  const objective = objectives.find((o) => o.id === checkin.objective_id);
  const dateLabel = checkin.period || String(checkin.created_at || '').slice(0, 10);

  return (
    <li
      style={{
        borderLeft: '2px solid var(--border)',
        paddingLeft: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: '13px' }}>{dateLabel}</span>
        {project && <Chip variant="neutral">{project.name}</Chip>}
        {objective && <Chip variant="neutral">{objective.title}</Chip>}
        <span style={{ marginLeft: 'auto' }}>
          <DotProgress pct={(answered.length / QUESTIONS.length) * 100} total={7} showPercent={false} />
        </span>
        <button
          type="button"
          onClick={() => onRemove(checkin.id)}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
          aria-label="체크인 삭제"
        >
          ✕
        </button>
      </div>
      {answered.map((q) => (
        <div key={q.key}>
          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{q.label}</div>
          <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>{checkin[q.key]}</div>
        </div>
      ))}
    </li>
  );
}

// ── 새 체크인 폼 (로컬, 기본 접힘) ─────────────────────
function CheckinForm({ projects, objectives, onSubmit, showForm }) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState('');
  const [answers, setAnswers] = useState({});
  const [projectId, setProjectId] = useState('');
  const [objectiveId, setObjectiveId] = useState('');
  const [notice, setNotice] = useState('');

  const reset = () => {
    setPeriod('');
    setAnswers({});
    setProjectId('');
    setObjectiveId('');
    setNotice('');
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = {};
    if (period.trim()) payload.period = period.trim();
    let hasAnswer = false;
    for (const q of QUESTIONS) {
      const v = (answers[q.key] || '').trim();
      if (v) {
        payload[q.key] = v;
        hasAnswer = true;
      }
    }
    if (!hasAnswer) {
      setNotice('최소 한 개 질문에는 답해야 합니다.');
      return;
    }
    if (projectId) payload.project_id = Number(projectId);
    if (objectiveId) payload.objective_id = Number(objectiveId);

    const ok = await onSubmit(payload);
    if (ok) {
      reset();
      setOpen(false);
    }
  };

  // showForm=false 면 토글 버튼 자체를 숨겨 폼 진입을 막는다.
  if (!showForm) return null;

  if (!open) {
    return (
      <button type="button" style={btnStyle} onClick={() => setOpen(true)}>
        + 새 체크인
      </button>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
      <input
        style={inputStyle}
        placeholder="시기 (예: 1주차)"
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
      />
      {QUESTIONS.map((q) => (
        <label key={q.key} style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px', color: 'var(--muted)' }}>
          {q.label}
          <textarea
            style={{ ...inputStyle, resize: 'vertical' }}
            rows={2}
            value={answers[q.key] || ''}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
          />
        </label>
      ))}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <select style={inputStyle} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">연결 없음</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select style={inputStyle} value={objectiveId} onChange={(e) => setObjectiveId(e.target.value)}>
          <option value="">연결 없음</option>
          {objectives.map((o) => (
            <option key={o.id} value={o.id}>{o.title}</option>
          ))}
        </select>
      </div>
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

export default function CheckinWidgetView({ config, configSchema }) {
  const checkins = useCheckinStore((s) => s.checkins);
  const loading = useCheckinStore((s) => s.loading);
  const loaded = useCheckinStore((s) => s.loaded);
  const error = useCheckinStore((s) => s.error);
  const fetchCheckins = useCheckinStore((s) => s.fetchCheckins);
  const addCheckin = useCheckinStore((s) => s.addCheckin);
  const removeCheckin = useCheckinStore((s) => s.removeCheckin);

  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const objectives = useOkrStore((s) => s.objectives);
  const fetchOkr = useOkrStore((s) => s.fetchOkr);

  const d = resolveDisplay(configSchema, config?.display);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  useEffect(() => {
    if (projects.length === 0) fetchProjects();
    if (objectives.length === 0) fetchOkr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !loaded) {
    return <p style={{ color: 'var(--muted)' }}>불러오는 중…</p>;
  }
  if (loaded && checkins.length === 0) {
    return (
      <div>
        {error && <ErrorBanner message={error} onRetry={() => fetchCheckins()} />}
        <p style={{ color: 'var(--muted)' }}>아직 체크인이 없습니다</p>
        <CheckinForm projects={projects} objectives={objectives} onSubmit={addCheckin} showForm={d.showForm} />
      </div>
    );
  }

  const shownCheckins = checkins.slice(0, d.maxItems);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {error && <ErrorBanner message={error} onRetry={() => fetchCheckins()} />}
      <CheckinForm projects={projects} objectives={objectives} onSubmit={addCheckin} showForm={d.showForm} />
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {shownCheckins.map((c) => (
          <CheckinCard key={c.id} checkin={c} projects={projects} objectives={objectives} onRemove={removeCheckin} />
        ))}
      </ul>
    </div>
  );
}
