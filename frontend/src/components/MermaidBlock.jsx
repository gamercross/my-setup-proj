// mermaid 코드 블록 렌더 (FR-UI-06, ADR-0031)
// - DiagramPanel 의 loadMermaid() 재사용 (mermaid 는 동적 import, securityLevel:'strict').
// - dangerouslySetInnerHTML 는 mermaid 가 sanitize 한 SVG 에만 쓴다 (DiagramPanel 선례 — 규범 예외).
// - 렌더 실패 시 원문 코드를 <pre> 로 보여준다 (DiagramPanel 과 동일 UX).

import React, { useEffect, useId, useState } from 'react';
import { loadMermaid } from './DiagramPanel.jsx';

export default function MermaidBlock({ code }) {
  const [svg, setSvg] = useState(null);
  const [failed, setFailed] = useState(false);
  const domId = 'mmdblk-' + useId().replace(/[^a-zA-Z0-9_-]/g, '-');

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setFailed(false);
    (async () => {
      try {
        const mermaid = await loadMermaid();
        const { svg: out } = await mermaid.render(domId, code);
        if (!cancelled) setSvg(out);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        // mermaid.render 가 남기는 임시 DOM 노드 정리
        document.getElementById(domId)?.remove();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, domId]);

  if (svg) {
    // securityLevel:'strict' 로 mermaid 가 sanitize 한 SVG 라 주입해도 안전
    return <div dangerouslySetInnerHTML={{ __html: svg }} />;
  }
  if (failed) {
    return (
      <div>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>⚠️ 이 다이어그램을 그릴 수 없습니다</p>
        <pre style={{ overflowX: 'auto', fontSize: '12px' }}>{code}</pre>
      </div>
    );
  }
  return <p style={{ color: 'var(--muted)', fontSize: '13px' }}>그리는 중…</p>;
}
