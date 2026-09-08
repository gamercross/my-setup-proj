// 파일 트리 (순수 프레젠테이션 — FR-UI-06)
// - props { nodes, selectedPath, onSelect }. fetch·store 참조 없음.
// - 폴더 접기/펼치기는 로컬 상태. 색은 CSS 변수만.

import React, { useState } from 'react';

const LIST_STYLE = { listStyle: 'none', margin: 0, padding: 0 };
const ROW_STYLE = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: '13px',
  padding: '3px 4px',
  borderRadius: '4px',
  whiteSpace: 'nowrap',
  color: 'var(--w-text, var(--text))',
};

function TreeNode({ node, depth, expanded, toggle, selectedPath, onSelect }) {
  const pad = { paddingLeft: `${depth * 12 + 4}px` };

  if (node.type === 'file') {
    const on = node.path === selectedPath;
    return (
      <li>
        <button
          type="button"
          onClick={() => onSelect(node.path)}
          aria-current={on ? 'true' : undefined}
          style={{
            ...ROW_STYLE,
            ...pad,
            background: on ? 'var(--w-accent, var(--accent))' : 'transparent',
            color: on ? 'var(--bg)' : 'var(--w-text, var(--text))',
          }}
        >
          📄 {node.name}
        </button>
      </li>
    );
  }

  const isOpen = expanded.has(node.path);
  return (
    <li>
      <button type="button" onClick={() => toggle(node.path)} style={{ ...ROW_STYLE, ...pad }}>
        {isOpen ? '▾' : '▸'} 📁 {node.name}
      </button>
      {isOpen && (
        <ul style={LIST_STYLE}>
          {(node.children || []).map((c) => (
            <TreeNode
              key={c.path}
              node={c}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function FileTree({ nodes, selectedPath, onSelect }) {
  const [expanded, setExpanded] = useState(() => new Set(['docs']));
  const toggle = (p) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  if (!nodes || nodes.length === 0) {
    return <p style={{ color: 'var(--muted)', fontSize: '13px' }}>표시할 문서가 없습니다</p>;
  }

  return (
    <ul style={LIST_STYLE}>
      {nodes.map((n) => (
        <TreeNode
          key={n.path}
          node={n}
          depth={0}
          expanded={expanded}
          toggle={toggle}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
