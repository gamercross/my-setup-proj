// 오늘 브리핑 위젯 뷰 — 스토어 구독·effect·4상태는 이 뷰가 소유한다 (ADR-0020).
// - 프레젠테이션은 BriefCard 가 담당한다.
// - 테마 코드는 없다 (WidgetFrame 이 CSS 변수를 주입).

import React, { useEffect } from 'react';
import BriefCard from '../../components/BriefCard.jsx';
import ErrorBanner from '../../components/ErrorBanner.jsx';
import { useBriefStore } from '../../store/useBriefStore.js';
import { resolveDisplay } from '../displayConfig.js';

export default function BriefWidgetView({ config, configSchema }) {
  const brief = useBriefStore((s) => s.brief);
  const loading = useBriefStore((s) => s.loading);
  const loaded = useBriefStore((s) => s.loaded);
  const error = useBriefStore((s) => s.error);
  const fetchBrief = useBriefStore((s) => s.fetchBrief);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  const d = resolveDisplay(configSchema, config?.display);

  if (error) {
    return <ErrorBanner message={error} onRetry={fetchBrief} />;
  }
  if (loading && !loaded) {
    return <p style={{ color: 'var(--muted)' }}>불러오는 중…</p>;
  }
  if (loaded && !brief) {
    return <p style={{ color: 'var(--muted)' }}>오늘 브리핑이 아직 없습니다</p>;
  }
  return <BriefCard brief={brief} showMeta={d.showMeta} />;
}
