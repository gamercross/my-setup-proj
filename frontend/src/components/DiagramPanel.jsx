// 다이어그램 패널 (Phase C4, ADR-0014)
// - GET /api/diagrams 로 docs 의 mermaid 블록을 받아 클라이언트에서 SVG 로 렌더한다.
// - mermaid 는 동적 import (초기 대시보드 번들에서 분리). 4상태(에러/로딩/빈/정상)를 이 패널이 소유한다.
// - 줌·패닝·복사는 이번 범위 밖. 렌더 + 블록 단위 실패 폴백까지만.

import React, { useCallback, useEffect, useState } from 'react';
import ErrorBanner from './ErrorBanner';
import { apiGet } from '../api/client.js';

// mermaid 는 최초 1회만 로드·initialize 한다 (모듈 스코프 캐시)
let mermaidPromise = null;
function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => {
      const mermaid = m.default ?? m;
      // securityLevel:'strict' — mermaid 가 SVG 출력을 sanitize 한다 (dangerouslySetInnerHTML 안전성 근거)
      mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' });
      return mermaid;
    });
  }
  return mermaidPromise;
}

const key = (d) => `${d.path}#${d.index}`;
const domId = (d) => 'mmd-' + key(d).replace(/[^a-zA-Z0-9_-]/g, '-');

const PALETTE = { bg: '#0f172a', panel: '#1e293b', text: '#e2e8f0', muted: '#94a3b8', accent: '#38bdf8' };

export default function DiagramPanel() {
  const [diagrams, setDiagrams] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rendered, setRendered] = useState({}); // { [key]: { svg } | { failed: true } }

  // 목록 조회 (마운트 + 재시도)
  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGet('/diagrams')
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.diagrams) ? data.diagrams : [];
        setDiagrams(list);
        setRendered({});
        setActiveDoc((prev) => prev ?? (list.length > 0 ? list[0].doc : null));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || '다이어그램을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => reload(), [reload]);

  // 문서 목록(순서 보존) · 현재 문서의 블록
  const docs = [...new Set(diagrams.map((d) => d.doc))];
  const visible = diagrams.filter((d) => d.doc === activeDoc);

  // 선택 문서의 블록을 순차 렌더한다
  useEffect(() => {
    if (visible.length === 0) return undefined;
    let cancelled = false;

    (async () => {
      let mermaid;
      try {
        mermaid = await loadMermaid();
      } catch {
        if (!cancelled) setError('다이어그램 렌더러를 불러오지 못했습니다.');
        return;
      }
      for (const d of visible) {
        if (cancelled) return;
        const k = key(d);
        try {
          const { svg } = await mermaid.render(domId(d), d.code);
          if (!cancelled) setRendered((r) => ({ ...r, [k]: { svg } }));
        } catch {
          if (!cancelled) setRendered((r) => ({ ...r, [k]: { failed: true } }));
        } finally {
          // mermaid.render 가 남기는 임시 DOM 노드 정리
          document.getElementById(domId(d))?.remove();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoc, diagrams]);

  if (error) {
    return <ErrorBanner message={error} onRetry={reload} />;
  }
  if (loading && diagrams.length === 0) {
    return <p style={{ color: PALETTE.muted }}>불러오는 중…</p>;
  }
  if (!loading && diagrams.length === 0) {
    return <p style={{ color: PALETTE.muted }}>다이어그램이 없습니다</p>;
  }

  return (
    <div>
      {/* 문서 선택 바 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        {docs.map((doc) => {
          const on = doc === activeDoc;
          return (
            <button
              key={doc}
              onClick={() => setActiveDoc(doc)}
              style={{
                background: on ? PALETTE.accent : PALETTE.panel,
                color: on ? PALETTE.bg : PALETTE.text,
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {doc}
            </button>
          );
        })}
      </div>

      {/* 블록 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {visible.map((d) => {
          const state = rendered[key(d)];
          return (
            <div
              key={key(d)}
              style={{ background: PALETTE.panel, borderRadius: '8px', padding: '12px' }}
            >
              <div style={{ fontSize: '13px', color: PALETTE.muted, marginBottom: '8px' }}>{d.title}</div>
              {state?.svg ? (
                // securityLevel:'strict' 로 mermaid 가 sanitize 한 SVG 라 주입해도 안전
                <div dangerouslySetInnerHTML={{ __html: state.svg }} />
              ) : state?.failed ? (
                <div>
                  <p style={{ color: PALETTE.muted, fontSize: '13px' }}>
                    ⚠️ 이 다이어그램을 그릴 수 없습니다
                  </p>
                  <pre style={{ overflowX: 'auto', color: PALETTE.text, fontSize: '12px' }}>{d.code}</pre>
                </div>
              ) : (
                <p style={{ color: PALETTE.muted, fontSize: '13px' }}>그리는 중…</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
