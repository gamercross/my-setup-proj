// 주제 아이콘 — 인라인 SVG (stroke="currentColor", 16px 기본, 장식용이라 aria-hidden).
// - 사이드바 항목·페이지 헤더가 <TopicIcon name={topic.icon} /> 로 쓴다.
// - 미등록 키는 기본(원) 아이콘으로 폴백한다.

import React from 'react';

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

const ICONS = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" {...P} />
      <rect x="14" y="3" width="7" height="7" rx="1" {...P} />
      <rect x="14" y="14" width="7" height="7" rx="1" {...P} />
      <rect x="3" y="14" width="7" height="7" rx="1" {...P} />
    </>
  ),
  tasks: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" {...P} />
      <path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" {...P} />
    </>
  ),
  brief: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" {...P} />
      <path d="M8 8h8M8 12h8M8 16h5" {...P} />
    </>
  ),
  projects: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...P} />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" {...P} />
      <path d="M3 10h18M8 3v4M16 3v4" {...P} />
    </>
  ),
  okr: (
    <>
      <circle cx="12" cy="12" r="8" {...P} />
      <circle cx="12" cy="12" r="4" {...P} />
      <circle cx="12" cy="12" r="1" {...P} />
    </>
  ),
  weekly: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" {...P} />
      <path d="M8 4v16M13 4v16M18 4v16" {...P} />
    </>
  ),
  activity: (
    <>
      <path d="M3 12h4l3 7 4-14 3 7h4" {...P} />
    </>
  ),
  progress: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-8M22 20V8" {...P} />
    </>
  ),
  diagrams: (
    <>
      <rect x="4" y="3" width="7" height="6" rx="1" {...P} />
      <rect x="13" y="15" width="7" height="6" rx="1" {...P} />
      <path d="M7.5 9v4a2 2 0 0 0 2 2h7" {...P} />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" {...P} />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" {...P} />
    </>
  ),
};

export default function TopicIcon({ name, size = 16 }) {
  const body = ICONS[name] ?? <circle cx="12" cy="12" r="8" {...P} />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {body}
    </svg>
  );
}
