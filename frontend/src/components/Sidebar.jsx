// 사이드바 — 브랜드 · 검색 · 그룹 네비 · 하단 사용자 블록 (ADR-0032, UI_STYLE v2).
// - 항목은 <button> (a 태그·라우팅 금지). 클릭 = useUiStore.setActiveTopic.
// - 활성 항목: --nav-active-bg 알약 + 좌측 3px --accent 바 (inset box-shadow). 강한 색 채움 금지.
// - 검색 인풋은 지금은 자리만 (readOnly, 후속 지원 예정).

import React from 'react';
import TopicIcon from './TopicIcons';
import { useUiStore } from '../store/useUiStore.js';
import { TOPIC_GROUPS, getTopicsByGroup } from '../widgets/topics.js';

const ROOT_STYLE = {
  position: 'sticky',
  top: 0,
  height: '100vh',
  width: 'var(--sidebar-w)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--sidebar-bg)',
  borderRight: '1px solid var(--border)',
};

const GROUP_HEADER_STYLE = {
  margin: '14px 12px 4px',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
};

function navItemStyle(active) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: 'calc(100% - 16px)',
    margin: '1px 8px',
    padding: '7px 10px',
    border: 'none',
    borderRadius: '8px',
    background: active ? 'var(--nav-active-bg)' : 'transparent',
    boxShadow: active ? 'inset 3px 0 0 0 var(--accent)' : 'none',
    color: active ? 'var(--text)' : 'var(--muted)',
    fontSize: '13px',
    textAlign: 'left',
    cursor: 'pointer',
  };
}

export default function Sidebar({ style, demo, version }) {
  const activeTopic = useUiStore((s) => s.activeTopic);
  const setActiveTopic = useUiStore((s) => s.setActiveTopic);

  return (
    <nav style={{ ...ROOT_STYLE, ...style }} aria-label="주제 탐색">
      {/* 브랜드 블록 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 14px 10px' }}>
        <div
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'var(--accent)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          OS
        </div>
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>AI Computer OS</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>개인 생산성 OS</div>
        </div>
      </div>

      {/* 검색 (자리표시 — 후속 지원 예정) */}
      <div style={{ position: 'relative', padding: '0 12px 6px' }}>
        <input
          type="text"
          readOnly
          placeholder="검색"
          title="후속 지원 예정"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '6px 34px 6px 10px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--panel)',
            color: 'var(--muted)',
            fontSize: 12,
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 20,
            top: 6,
            padding: '1px 6px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--chip-radius)',
            fontSize: 10,
            color: 'var(--muted)',
          }}
        >
          ⌘K
        </span>
      </div>

      {/* 그룹 네비 — 이 영역만 스크롤 */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        {TOPIC_GROUPS.map((group) => (
          <div key={group.id}>
            <div style={GROUP_HEADER_STYLE}>{group.label}</div>
            {getTopicsByGroup(group.id).map((t) => {
              const active = t.id === activeTopic;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setActiveTopic(t.id)}
                  style={navItemStyle(active)}
                >
                  <TopicIcon name={t.icon} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* 하단 사용자 블록 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'var(--panel-2)',
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          로
        </div>
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontSize: 12, color: 'var(--text)' }}>로컬 사용자</div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
            {demo ? '데모 모드' : `v${version ?? '?'}`}
          </div>
        </div>
      </div>
    </nav>
  );
}
