// 주제 뷰 — 페이지 헤더 + 그 주제의 위젯 그리드 (ADR-0032).
// - 헤더: 좌(아이콘 + 제목 + 부제) / 우(데모·버전 · health · 편집 · +위젯 · 초기화).
// - 편집/초기화는 useLayoutStore, +위젯은 useUiStore.togglePicker 를 직접 호출한다.
// - health 표시는 기존 App 헤더의 것을 그대로 옮긴 것 (FR-UI-02 AC-5).

import React from 'react';
import TopicIcon from './TopicIcons';
import WidgetShell from './WidgetShell';
import { useLayoutStore } from '../store/useLayoutStore.js';
import { useUiStore } from '../store/useUiStore.js';

const btnStyle = (active) => ({
  background: active ? 'var(--accent)' : 'var(--panel-2)',
  color: active ? '#ffffff' : 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '4px 10px',
  fontSize: '13px',
  cursor: 'pointer',
});

export default function TopicView({ topic, demo, info, health, statusColor }) {
  const editMode = useLayoutStore((s) => s.editMode);
  const toggleEditMode = useLayoutStore((s) => s.toggleEditMode);
  const resetLayout = useLayoutStore((s) => s.resetLayout);
  const togglePicker = useUiStore((s) => s.togglePicker);

  const onReset = () => {
    if (window.confirm('이 주제의 레이아웃을 기본값으로 되돌릴까요?')) {
      resetLayout();
    }
  };

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      {/* 페이지 헤더 */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--panel)',
        }}
      >
        <span style={{ color: 'var(--muted)', display: 'flex' }}>
          <TopicIcon name={topic.icon} size={20} />
        </span>
        <div style={{ lineHeight: 1.3 }}>
          <h1 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>{topic.label}</h1>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{topic.subtitle}</div>
        </div>

        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: 12,
            color: 'var(--muted)',
          }}
        >
          {demo ? (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 'var(--chip-radius)',
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                fontWeight: 600,
              }}
            >
              데모 모드 · 샘플 데이터 (새로고침하면 초기화)
            </span>
          ) : (
            <span>
              v{info.version ?? '?'} · Electron {info.electron ?? '?'} · Node {info.node ?? '?'}
            </span>
          )}
          <span style={{ color: statusColor }}>● {demo ? '데모 데이터' : health.message}</span>

          <button style={btnStyle(editMode)} onClick={toggleEditMode}>
            ✎ 편집
          </button>
          <button style={btnStyle(false)} onClick={() => togglePicker()}>
            + 위젯
          </button>
          <button style={btnStyle(false)} onClick={onReset}>
            초기화
          </button>
        </div>
      </header>

      {/* 본문 그리드 */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: 'var(--section-gap)' }}>
        <WidgetShell topicId={topic.id} />
      </div>
    </div>
  );
}
