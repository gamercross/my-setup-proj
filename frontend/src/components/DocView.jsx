// 문서 본문 렌더 (FR-UI-06, ADR-0031)
// - 서버가 만든 제한 토큰 배열을 React 요소로 매핑한다.
// - 마크다운 파서·dangerouslySetInnerHTML 없음 (NFR-SEC-04, BriefCard 선례).
//   (mermaid SVG 주입은 MermaidBlock 이 securityLevel:'strict' 하에 담당 — 여기선 안 함.)
// - 링크는 <a> 대신 복사 버튼 (Electron 외부 내비게이션 차단).
// - 색은 CSS 변수만 사용한다 (styles.css 무변경).

import React, { useEffect, useState } from 'react';
import MermaidBlock from './MermaidBlock.jsx';
import { groupSections, headingText } from '../widgets/docSections.js';

const P_STYLE = { whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6, margin: '0 0 10px' };
const CELL_STYLE = { border: '1px solid var(--border)', padding: '4px 8px' };

// 링크 → 복사 버튼 (BriefCard.copyNotion 패턴).
function CopyLink({ text, href }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 접근 실패는 조용히 무시
    }
  };
  return (
    <span>
      <span title={href} style={{ textDecoration: 'underline' }}>
        {text || href}
      </span>
      <button
        type="button"
        onClick={copy}
        title={`링크 복사: ${href}`}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '11px',
          color: 'var(--muted)',
          padding: '0 4px',
        }}
      >
        {copied ? '복사됨' : '📋'}
      </button>
    </span>
  );
}

function renderInline(nodes, keyPrefix) {
  return (Array.isArray(nodes) ? nodes : []).map((n, i) => {
    const k = `${keyPrefix}-${i}`;
    if (!n || typeof n !== 'object') return null;
    switch (n.type) {
      case 'text':
        return <React.Fragment key={k}>{n.text}</React.Fragment>;
      case 'code':
        return (
          <code
            key={k}
            style={{ background: 'var(--panel)', padding: '1px 4px', borderRadius: '4px', fontSize: '0.9em' }}
          >
            {n.text}
          </code>
        );
      case 'strong':
        return <strong key={k}>{n.text}</strong>;
      case 'em':
        return <em key={k}>{n.text}</em>;
      case 'link':
        return <CopyLink key={k} text={n.text} href={n.href} />;
      default:
        return null;
    }
  });
}

function renderBlock(token, key) {
  if (!token || typeof token !== 'object') return null;
  switch (token.type) {
    case 'heading': {
      const depth = Math.min(Math.max(token.depth || 1, 1), 4);
      const Tag = `h${depth}`;
      return (
        <Tag key={key} style={{ margin: '12px 0 6px' }}>
          {renderInline(token.inline, key)}
        </Tag>
      );
    }
    case 'paragraph':
      return (
        <p key={key} style={P_STYLE}>
          {renderInline(token.inline, key)}
        </p>
      );
    case 'list': {
      const Tag = token.ordered ? 'ol' : 'ul';
      return (
        <Tag key={key} style={{ margin: '0 0 10px', paddingLeft: '20px', lineHeight: 1.6 }}>
          {(token.items || []).map((it, i) => (
            <li key={`${key}-${i}`}>
              {renderInline(it.inline, `${key}-${i}`)}
              {Array.isArray(it.children) && it.children.length > 0 && (
                <Tag style={{ margin: 0, paddingLeft: '20px' }}>
                  {it.children.map((c, j) => (
                    <li key={`${key}-${i}-${j}`}>{renderInline(c.inline, `${key}-${i}-${j}`)}</li>
                  ))}
                </Tag>
              )}
            </li>
          ))}
        </Tag>
      );
    }
    case 'table':
      return (
        <div key={key} style={{ overflowX: 'auto', margin: '0 0 10px' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {(token.header || []).map((cell, i) => (
                  <th key={i} style={{ ...CELL_STYLE, textAlign: token.align?.[i] || 'left' }}>
                    {renderInline(cell, `${key}-h-${i}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(token.rows || []).map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} style={{ ...CELL_STYLE, textAlign: token.align?.[c] || 'left' }}>
                      {renderInline(cell, `${key}-${r}-${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'blockquote':
      return (
        <blockquote
          key={key}
          style={{ borderLeft: '3px solid var(--border)', margin: '0 0 10px', padding: '4px 0 4px 12px', color: 'var(--muted)' }}
        >
          {(token.tokens || []).map((t, i) => (
            <p key={i} style={P_STYLE}>
              {renderInline(t.inline, `${key}-${i}`)}
            </p>
          ))}
        </blockquote>
      );
    case 'hr':
      return <hr key={key} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />;
    case 'code':
      if (token.lang === 'mermaid') return <MermaidBlock key={key} code={token.code} />;
      return (
        <pre
          key={key}
          style={{ overflowX: 'auto', background: 'var(--panel)', padding: '10px', borderRadius: '6px', fontSize: '12px', margin: '0 0 10px' }}
        >
          <code>{token.code}</code>
        </pre>
      );
    default:
      // 알 수 없는 타입은 렌더하지 않는다 (서버 토큰 스키마가 앞서 나간 경우).
      console.warn('알 수 없는 문서 토큰 타입:', token.type);
      return null;
  }
}

export default function DocView({ tokens, isDefaultOpen }) {
  const sections = groupSections(tokens, isDefaultOpen);
  const [openIds, setOpenIds] = useState(
    () => new Set(sections.filter((s) => s.defaultOpen).map((s) => s.id))
  );

  // 자동 펼침 기준(isDefaultOpen)이 바뀌면 열림 상태를 다시 계산한다 (설정 즉시 반영).
  // 수동으로 접었다 편 상태는 이때 리셋돼도 무방하다.
  useEffect(() => {
    setOpenIds(new Set(sections.filter((s) => s.defaultOpen).map((s) => s.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDefaultOpen]);

  const toggle = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!sections.length) {
    return <p style={{ color: 'var(--muted)' }}>표시할 내용이 없습니다</p>;
  }

  return (
    <div>
      {sections.map((s) => {
        // preamble (첫 heading 이전) — 접기 없이 항상 표시
        if (s.heading === null) {
          return <div key={s.id}>{s.tokens.map((t, i) => renderBlock(t, `${s.id}-${i}`))}</div>;
        }
        const isOpen = openIds.has(s.id);
        return (
          <section key={s.id}>
            <button
              type="button"
              onClick={() => toggle(s.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--w-text, var(--text))',
                fontWeight: 600,
                fontSize: '14px',
                textAlign: 'left',
                width: '100%',
                padding: '6px 0',
                borderTop: '1px solid var(--border)',
              }}
            >
              {isOpen ? '▾' : '▸'} {headingText(s.heading)}
            </button>
            {isOpen && <div>{s.tokens.map((t, i) => renderBlock(t, `${s.id}-${i}`))}</div>}
          </section>
        );
      })}
    </div>
  );
}
