// 에이전트 활동 위젯 뷰 — 스토어 구독·effect·4상태는 이 뷰가 소유한다 (ADR-0020, P7·FR-AGENT-08).
// - 공통 컴포넌트 StatTile·Chip·ErrorBanner 만 재사용한다 (새 프레젠테이션 컴포넌트 없음).
// - 자동 폴링 없음: 최초 1회만 조회하고, 이후는 "지금 실행"·재시도 버튼으로만 갱신한다.
// - 인라인 스타일 + CSS 변수만 사용 (styles.css 무변경).

import React, { useEffect } from 'react';
import StatTile from '../../components/StatTile.jsx';
import Chip from '../../components/Chip.jsx';
import ErrorBanner from '../../components/ErrorBanner.jsx';
import { useAgentStore } from '../../store/useAgentStore.js';
import { resolveDisplay } from '../displayConfig.js';

// ISO 문자열 → HH:MM (로컬). 실패하면 원문 앞 16자.
function hhmm(iso) {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return String(iso).slice(0, 16);
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 에러 메시지 1줄 말줄임용 절단본.
function truncate(text, n = 80) {
  const s = String(text ?? '');
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

// Supabase 상태 → Chip variant
const HEALTH_VARIANT = { ok: 'ok', error: 'bad', unconfigured: 'neutral' };

export default function AgentActivityWidgetView({ config, configSchema }) {
  const activity = useAgentStore((s) => s.activity);
  const loading = useAgentStore((s) => s.loading);
  const loaded = useAgentStore((s) => s.loaded);
  const error = useAgentStore((s) => s.error);
  const requesting = useAgentStore((s) => s.requesting);
  const requestMessage = useAgentStore((s) => s.requestMessage);
  const fetchActivity = useAgentStore((s) => s.fetchActivity);
  const requestRun = useAgentStore((s) => s.requestRun);

  const d = resolveDisplay(configSchema, config?.display);

  useEffect(() => {
    fetchActivity(d.maxLogs);
  }, [fetchActivity, d.maxLogs]);

  if (error) {
    return <ErrorBanner message={error} onRetry={() => fetchActivity(d.maxLogs)} />;
  }
  if (loading && !loaded) {
    return <p style={{ color: 'var(--muted)' }}>불러오는 중…</p>;
  }
  if (!activity) return null;

  const logs = activity.logs || [];
  const lastSuccess = logs.find((l) => l.status === 'success');
  const lastFailure = logs.find((l) => l.status === 'failed');
  const nextRun = activity.nextRun || {};
  const runNow = activity.runNow || {};
  const health = activity.health || {};

  const btnDisabled = requesting || !runNow.available;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 상단 스탯 행 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <StatTile label="최근 성공" value={lastSuccess ? hhmm(lastSuccess.last_sync) : '—'} tone="ok" />
        <StatTile label="최근 실패" value={lastFailure ? hhmm(lastFailure.last_sync) : '—'} tone={lastFailure ? 'bad' : 'default'} />
        <StatTile
          label="다음 실행"
          value={
            Number.isInteger(nextRun.hour) && Number.isInteger(nextRun.minute)
              ? `${String(nextRun.hour).padStart(2, '0')}:${String(nextRun.minute).padStart(2, '0')}`
              : '—'
          }
        />
      </div>

      {/* 배지 행 */}
      {d.showHealth && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <Chip variant={HEALTH_VARIANT[health.supabase] || 'neutral'} title={health.detail || ''}>
            Supabase: {health.supabase || '알 수 없음'}
          </Chip>
          {runNow.pending && <Chip variant="warn">요청 대기 중</Chip>}
        </div>
      )}

      {/* 지금 실행 */}
      <div>
        <button
          type="button"
          onClick={requestRun}
          disabled={btnDisabled}
          style={{
            background: btnDisabled ? 'var(--panel-2)' : 'var(--w-accent, var(--accent))',
            color: btnDisabled ? 'var(--muted)' : 'var(--bg)',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: btnDisabled ? 'default' : 'pointer',
          }}
        >
          {requesting ? '요청 중…' : '지금 실행'}
        </button>
        {requestMessage && (
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted)' }}>{requestMessage}</p>
        )}
      </div>

      {/* 로그 리스트 */}
      {logs.length === 0 ? (
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '13px' }}>아직 에이전트 실행 기록이 없습니다</p>
      ) : (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {logs.map((l) => (
          <li
            key={l.id}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
          >
            <Chip variant={l.status === 'failed' ? 'bad' : 'ok'}>{l.service}</Chip>
            <span style={{ color: 'var(--muted)' }}>{hhmm(l.last_sync)}</span>
            {l.error_message && (
              <span
                title={truncate(l.error_message, 200)}
                style={{
                  color: 'var(--bad)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {truncate(l.error_message)}
              </span>
            )}
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}
