// 할일 태그 줄 — props-only 프레젠테이션 (FR-TASK-08).
// - tags: 문자열 배열 (정렬된 상태로 주입받는다)
// - activeTag: 현재 필터 중인 태그 (칩 활성 표시용, 없으면 null)
// - onSelect(tag): 칩 클릭 → 필터 토글   - onRemove(tag): × 클릭 → 태그 삭제
// - onAdd(tag): ＋ 인라인 입력 확정 → 태그 추가
// window.prompt 는 쓰지 않는다 — 인라인 <input> 만.

import React, { useState } from 'react';
import Chip from './Chip';

export default function TaskTags({ tags = [], activeTag = null, onSelect, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const close = () => {
    setAdding(false);
    setDraft('');
  };

  const confirm = () => {
    const t = draft.trim();
    if (t && onAdd) onAdd(t);
    close();
  };

  const list = Array.isArray(tags) ? tags : [];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
      {list.map((tag) => (
        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
          <Chip
            variant={tag === activeTag ? 'active' : 'neutral'}
            onClick={onSelect ? () => onSelect(tag) : undefined}
            title={tag === activeTag ? '필터 해제' : `'${tag}' 로 필터`}
          >
            {tag}
          </Chip>
          {onRemove && (
            <button
              type="button"
              aria-label={`${tag} 태그 삭제`}
              onClick={() => onRemove(tag)}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--muted)',
                fontSize: '11px',
                padding: '0 2px',
              }}
            >
              ×
            </button>
          )}
        </span>
      ))}

      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={close}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm();
            else if (e.key === 'Escape') close();
          }}
          placeholder="태그"
          style={{
            width: '80px',
            fontSize: '12px',
            padding: '2px 6px',
            borderRadius: 'var(--chip-radius)',
            border: '1px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--w-text, var(--text))',
          }}
        />
      ) : (
        onAdd && (
          <button
            type="button"
            aria-label="태그 추가"
            onClick={() => setAdding(true)}
            style={{
              border: 'none',
              background: 'var(--panel-2)',
              cursor: 'pointer',
              color: 'var(--muted)',
              borderRadius: 'var(--chip-radius)',
              fontSize: '12px',
              padding: '3px 8px',
            }}
          >
            ＋
          </button>
        )
      )}
    </div>
  );
}
