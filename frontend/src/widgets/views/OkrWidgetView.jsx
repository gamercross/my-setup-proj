// OKR 위젯 뷰 — 스토어 구독·effect·4상태는 이 뷰가 소유한다 (ADR-0020, P8·FR-OKR-06).
// - 공통 컴포넌트 StatTile·DotProgress·Chip·ErrorBanner·LineChart 만 재사용한다.
// - 새 공용 컴포넌트는 만들지 않는다 (폼·행은 이 파일의 로컬 컴포넌트).
// - 인라인 스타일 + CSS 변수만 (styles.css 무변경). 강조색은 var(--w-accent, var(--accent)).

import React, { useEffect, useState } from 'react';
import StatTile from '../../components/StatTile.jsx';
import DotProgress from '../../components/DotProgress.jsx';
import Chip from '../../components/Chip.jsx';
import ErrorBanner from '../../components/ErrorBanner.jsx';
import LineChart from '../../components/LineChart.jsx';
import { useOkrStore } from '../../store/useOkrStore.js';
import { formatPct } from '../../store/okrMath.js';
import { resolveDisplay } from '../displayConfig.js';

const STATUS_LABEL = { active: '진행', done: '완료', archived: '보관' };

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

// ── 목표 추가 폼 (로컬) ──────────────────────────────
function ObjectiveForm({ onSubmit }) {
  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState('');
  const [status, setStatus] = useState('active');

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !period.trim()) return;
    const ok = await onSubmit({ title: title.trim(), period: period.trim(), status });
    if (ok) {
      setTitle('');
      setPeriod('');
      setStatus('active');
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
      <input style={inputStyle} placeholder="목표 제목" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input style={{ ...inputStyle, width: '110px' }} placeholder="2026 / 2026-Q3" value={period} onChange={(e) => setPeriod(e.target.value)} />
      <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="active">진행</option>
        <option value="done">완료</option>
        <option value="archived">보관</option>
      </select>
      <button type="submit" style={btnStyle}>목표 추가</button>
    </form>
  );
}

// ── 핵심 결과 추가 폼 (로컬) ─────────────────────────
function KeyResultForm({ objectiveId, onSubmit }) {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [unit, setUnit] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const t = Number(target);
    if (!title.trim() || !Number.isFinite(t)) return;
    const payload = {
      objective_id: objectiveId,
      title: title.trim(),
      target: t,
      current: current === '' ? 0 : Number(current),
    };
    if (unit.trim()) payload.unit = unit.trim();
    const ok = await onSubmit(payload);
    if (ok) {
      setTitle('');
      setTarget('');
      setCurrent('');
      setUnit('');
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
      <input style={inputStyle} placeholder="핵심 결과" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input style={{ ...inputStyle, width: '70px' }} type="number" placeholder="목표" value={target} onChange={(e) => setTarget(e.target.value)} />
      <input style={{ ...inputStyle, width: '70px' }} type="number" placeholder="현재" value={current} onChange={(e) => setCurrent(e.target.value)} />
      <input style={{ ...inputStyle, width: '60px' }} placeholder="단위" value={unit} onChange={(e) => setUnit(e.target.value)} />
      <button type="submit" style={btnStyle}>KR 추가</button>
    </form>
  );
}

// ── KR 한 줄 (현재치 인라인 편집) ────────────────────
function KeyResultRow({ kr, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(kr.current));

  const save = async () => {
    const n = Number(value);
    if (Number.isFinite(n)) await onUpdate(kr.id, { current: n });
    setEditing(false);
  };

  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '4px 0' }}>
      <span style={{ flex: 1 }}>{kr.title}</span>
      {editing ? (
        <>
          <input
            style={{ ...inputStyle, width: '64px' }}
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button type="button" style={btnStyle} onClick={save}>저장</button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            setValue(String(kr.current));
            setEditing(true);
          }}
          style={{ ...inputStyle, cursor: 'pointer' }}
          title="현재치 편집"
        >
          {kr.current}/{kr.target}
          {kr.unit ? ` ${kr.unit}` : ''}
        </button>
      )}
      <span style={{ width: '90px' }}>
        <DotProgress pct={(kr.pct || 0) * 100} total={10} showPercent={false} />
      </span>
      <span style={{ color: 'var(--muted)', width: '48px', textAlign: 'right' }}>{formatPct(kr.pct)}</span>
      <button
        type="button"
        onClick={() => onRemove(kr.id)}
        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
        aria-label="핵심 결과 삭제"
      >
        ✕
      </button>
    </li>
  );
}

export default function OkrWidgetView({ config, configSchema }) {
  const objectives = useOkrStore((s) => s.objectives);
  const summary = useOkrStore((s) => s.summary);
  const trend = useOkrStore((s) => s.trend);
  const loading = useOkrStore((s) => s.loading);
  const loaded = useOkrStore((s) => s.loaded);
  const error = useOkrStore((s) => s.error);
  const fetchOkr = useOkrStore((s) => s.fetchOkr);
  const fetchTrend = useOkrStore((s) => s.fetchTrend);
  const addObjective = useOkrStore((s) => s.addObjective);
  const addKeyResult = useOkrStore((s) => s.addKeyResult);
  const updateKeyResult = useOkrStore((s) => s.updateKeyResult);
  const removeObjective = useOkrStore((s) => s.removeObjective);
  const removeKeyResult = useOkrStore((s) => s.removeKeyResult);

  const d = resolveDisplay(configSchema, config?.display);
  const [expanded, setExpanded] = useState(() => new Set());

  useEffect(() => {
    fetchOkr({ includeArchived: d.includeArchived });
    if (d.showTrend) fetchTrend();
  }, [fetchOkr, fetchTrend, d.includeArchived, d.showTrend]);

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const s = summary || { krAvgPct: 0, objectiveCount: 0, keyResultCount: 0, bucket: { high: 0, mid: 0, low: 0 } };

  if (loading && !loaded) {
    return <p style={{ color: 'var(--muted)' }}>불러오는 중…</p>;
  }
  if (loaded && objectives.length === 0) {
    return (
      <div>
        <p style={{ color: 'var(--muted)' }}>아직 목표가 없습니다</p>
        <ObjectiveForm onSubmit={addObjective} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* CRUD 실패는 데이터를 유지한 채 배너만 오버레이한다 (위젯 전체가 사라지지 않도록). */}
      {error && <ErrorBanner message={error} onRetry={() => fetchOkr({ includeArchived: d.includeArchived })} />}

      {/* 스탯 타일 6개 (3열 2행) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <StatTile label="KR 평균 달성률" value={formatPct(s.krAvgPct)} tone="accent" />
        <StatTile label="Objective 수" value={s.objectiveCount} />
        <StatTile label="Key Result 수" value={s.keyResultCount} />
        <StatTile label="90% 이상" value={s.bucket.high} tone="ok" />
        <StatTile label="40~89.9%" value={s.bucket.mid} tone="warn" />
        <StatTile label="40% 미만" value={s.bucket.low} tone="bad" />
      </div>

      {/* 목표 목록 */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {objectives.map((o) => (
          <li key={o.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => toggle(o.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontWeight: 600, fontSize: '14px', flex: 1, textAlign: 'left' }}
              >
                {expanded.has(o.id) ? '▾' : '▸'} {o.title}
              </button>
              <Chip variant={o.status === 'done' ? 'ok' : o.status === 'archived' ? 'neutral' : 'active'}>
                {STATUS_LABEL[o.status] || o.status}
              </Chip>
              <span style={{ color: 'var(--muted)', fontSize: '13px' }}>{o.period}</span>
              <button
                type="button"
                onClick={() => removeObjective(o.id)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                aria-label="목표 삭제"
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: '8px' }}>
              <DotProgress label={formatPct(o.pct)} pct={(o.pct || 0) * 100} showPercent={false} />
            </div>

            {expanded.has(o.id) && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {(o.keyResults || []).map((kr) => (
                    <KeyResultRow key={kr.id} kr={kr} onUpdate={updateKeyResult} onRemove={removeKeyResult} />
                  ))}
                </ul>
                <KeyResultForm objectiveId={o.id} onSubmit={addKeyResult} />
              </div>
            )}
          </li>
        ))}
      </ul>

      <ObjectiveForm onSubmit={addObjective} />

      {/* 월별 추이 라인차트 */}
      {d.showTrend && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>월별 KR 평균 달성률</div>
          <LineChart points={trend} />
        </div>
      )}
    </div>
  );
}
