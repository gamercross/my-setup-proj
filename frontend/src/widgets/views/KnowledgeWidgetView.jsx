// 지식 지도 위젯 뷰 — 스토어 구독·effect·4상태는 이 뷰가 소유한다 (개인 OS P11, ADR-0036).
// - 공통 컴포넌트 StatTile·LineChart·DotProgress·Chip·ErrorBanner 만 재사용한다.
// - 새 공용 컴포넌트는 만들지 않는다.
// - 인라인 스타일 + CSS 변수만 (styles.css 무변경). 하드코딩 hex 없음.

import React, { useEffect } from 'react';
import StatTile from '../../components/StatTile.jsx';
import LineChart from '../../components/LineChart.jsx';
import DotProgress from '../../components/DotProgress.jsx';
import Chip from '../../components/Chip.jsx';
import ErrorBanner from '../../components/ErrorBanner.jsx';
import { useKnowledgeStore } from '../../store/useKnowledgeStore.js';
import { formatPct } from '../../store/okrMath.js';
import { resolveDisplay } from '../displayConfig.js';

// 체크인 count(0~N건)를 LineChart 의 0~1 고정 스케일에 맞춰 정규화한다.
// linePath.js 의 스케일 공식은 건드리지 않는다 — 뷰가 정규화해서 넘긴다.
function normalizeCheckinPoints(points) {
  const pts = Array.isArray(points) ? points : [];
  const max = pts.reduce((acc, p) => Math.max(acc, p.count || 0), 0);
  return { points: pts.map((p) => ({ ...p, ratio: max > 0 ? p.count / max : 0 })), max };
}

export default function KnowledgeWidgetView({ config, configSchema }) {
  const trend = useKnowledgeStore((s) => s.trend);
  const loading = useKnowledgeStore((s) => s.loading);
  const loaded = useKnowledgeStore((s) => s.loaded);
  const error = useKnowledgeStore((s) => s.error);
  const fetchTrend = useKnowledgeStore((s) => s.fetchTrend);

  const d = resolveDisplay(configSchema, config?.display);

  useEffect(() => {
    fetchTrend({ weeks: d.weeks });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTrend, d.weeks]);

  if (loading && !loaded) {
    return <p style={{ color: 'var(--muted)' }}>불러오는 중…</p>;
  }

  if (error && !trend) {
    return <ErrorBanner message={error} onRetry={() => fetchTrend({ weeks: d.weeks })} />;
  }

  const checkins = trend?.checkins ?? { total: 0, points: [] };
  const okr = trend?.okr ?? { points: [], latestPct: 0 };
  const tags = trend?.tags ?? { total: 0, distinct: 0, otherCount: 0, items: [] };
  const summary = trend?.summary ?? { checkinWeeks: 0, activeWeeks: d.weeks, topTag: null };

  const isEmpty = loaded && checkins.total === 0 && okr.points.length === 0 && tags.total === 0;
  if (isEmpty) {
    return (
      <div>
        {error && <ErrorBanner message={error} onRetry={() => fetchTrend({ weeks: d.weeks })} />}
        <p style={{ color: 'var(--muted)' }}>
          아직 쌓인 기록이 없습니다. 체크인과 태그가 쌓이면 여기에 방향이 보입니다.
        </p>
      </div>
    );
  }

  const { points: checkinPoints, max: maxCheckin } = normalizeCheckinPoints(checkins.points);
  const maxTagCount = tags.items.reduce((acc, t) => Math.max(acc, t.count), 0) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {error && <ErrorBanner message={error} onRetry={() => fetchTrend({ weeks: d.weeks })} />}

      {/* 요약 타일 3개 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <StatTile label="체크인 총건수" value={checkins.total} tone="accent" />
        <StatTile label="기록한 주" value={`${summary.checkinWeeks}/${summary.activeWeeks}`} />
        <StatTile label="OKR 최신 달성률" value={formatPct(okr.latestPct)} tone="ok" />
      </div>

      {/* 상단: 체크인 빈도 차트 */}
      <div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
          기대정렬 체크인 빈도
        </div>
        <LineChart
          points={checkinPoints}
          valueKey="ratio"
          labelKey="label"
          stroke="var(--ok)"
          ariaLabel="주차별 기대정렬 체크인 빈도 추이"
          formatLabel={(label) => label}
        />
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
          최대 {maxCheckin}건/주
        </div>
      </div>

      {/* 중단: OKR 평균 달성률 차트 */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
          OKR 평균 달성률
        </div>
        <LineChart points={okr.points} />
      </div>

      {/* 하단: 태그 분포 */}
      {d.showTags && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
            태그 분포
          </div>
          {tags.items.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>
              아직 부착된 태그가 없습니다
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tags.items.map((t) => (
                <li key={t.tag} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Chip>{t.tag}</Chip>
                  <span style={{ flex: 1 }}>
                    <DotProgress pct={(t.count / maxTagCount) * 100} total={10} showPercent={false} />
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: '13px', width: '40px', textAlign: 'right' }}>
                    {t.count}건
                  </span>
                </li>
              ))}
              {tags.otherCount > 0 && (
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Chip variant="neutral">기타</Chip>
                  <span style={{ color: 'var(--muted)', fontSize: '13px' }}>{tags.otherCount}건</span>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
