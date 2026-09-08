// 진행 현황·파일 탐색 위젯 뷰 (FR-UI-06, ADR-0031)
// - 트리/문서 상태는 새 스토어 없이 이 뷰의 로컬 useState (D-8).
// - 좌/우 분할 비율은 config.display.treePct 로 영속 (드래그 중 로컬, pointerup 에서 1회 persist).
// - 색은 CSS 변수만 (styles.css 무변경). 강조색은 var(--w-accent, var(--accent)).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ErrorBanner from '../../components/ErrorBanner.jsx';
import FileTree from '../../components/FileTree.jsx';
import DocView from '../../components/DocView.jsx';
import { apiGet } from '../../api/client.js';
import { resolveDisplay } from '../displayConfig.js';
import { clampSplitPct, matchDefaultOpen } from '../docSections.js';
import { useLayoutStore } from '../../store/useLayoutStore.js';

// 파일 미선택 시 자동 선택 대상 (있을 때만 — D-12).
const AUTO_SELECT = 'docs/progress/PROGRESS.md';
const NEVER_OPEN = () => false;

// 트리에 특정 path 의 파일 노드가 있는지.
function hasFile(nodes, target) {
  for (const n of nodes || []) {
    if (n.type === 'file' && n.path === target) return true;
    if (n.type === 'dir' && hasFile(n.children, target)) return true;
  }
  return false;
}

const crumbBtn = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  color: 'var(--muted)',
  cursor: 'pointer',
  fontSize: '12px',
  padding: '2px 6px',
};

export default function ProgressWidgetView({ instanceId, config, configSchema }) {
  const d = resolveDisplay(configSchema, config?.display);
  const updateConfig = useLayoutStore((s) => s.updateConfig);

  const [treeNodes, setTreeNodes] = useState([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState(null);

  const [selectedPath, setSelectedPath] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState(null);
  const [docNonce, setDocNonce] = useState(0);

  const [pct, setPct] = useState(() => clampSplitPct(d.treePct));
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [docCollapsed, setDocCollapsed] = useState(false);

  const containerRef = useRef(null);
  const draggingRef = useRef(false);

  // ── 트리 조회 (마운트 + 재시도) ──
  const loadTree = useCallback(() => {
    let cancelled = false;
    setTreeLoading(true);
    setTreeError(null);
    apiGet('/tree')
      .then((data) => {
        if (cancelled) return;
        const nodes = Array.isArray(data?.tree) ? data.tree : [];
        setTreeNodes(nodes);
        setSelectedPath((prev) => prev ?? (hasFile(nodes, AUTO_SELECT) ? AUTO_SELECT : null));
      })
      .catch((err) => {
        if (!cancelled) setTreeError(err.message || '파일 트리를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setTreeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => loadTree(), [loadTree]);

  // ── 선택 문서 조회 ──
  useEffect(() => {
    if (!selectedPath) {
      setTokens([]);
      return undefined;
    }
    let cancelled = false;
    setDocLoading(true);
    setDocError(null);
    const encoded = selectedPath.split('/').map(encodeURIComponent).join('/');
    apiGet('/docs/' + encoded)
      .then((data) => {
        if (!cancelled) setTokens(Array.isArray(data?.tokens) ? data.tokens : []);
      })
      .catch((err) => {
        if (!cancelled) setDocError(err.message || '문서를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setDocLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPath, docNonce]);

  // config 로 treePct 가 바뀌면(설정 패널) 로컬 값도 따라간다.
  useEffect(() => {
    setPct(clampSplitPct(d.treePct));
  }, [d.treePct]);

  // ── 분할선 드래그 ──
  const onPointerDown = (e) => {
    if (treeCollapsed || docCollapsed) return;
    draggingRef.current = true;
    e.target.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    setPct(clampSplitPct(((e.clientX - rect.left) / rect.width) * 100));
  };
  const onPointerUp = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.target.releasePointerCapture?.(e.pointerId);
    // pointerup 에서 1회만 persist
    updateConfig(instanceId, { display: { ...config?.display, treePct: pct } });
  };

  // ── 패널 접기 (둘 다 접기 금지 — 마지막 하나는 토글 무시) ──
  const toggleTree = () => {
    if (!treeCollapsed && docCollapsed) return;
    setTreeCollapsed((v) => !v);
  };
  const toggleDoc = () => {
    if (!docCollapsed && treeCollapsed) return;
    setDocCollapsed((v) => !v);
  };

  const crumb = selectedPath ? selectedPath.split('/').join(' › ') : '문서를 선택하세요';
  const treeWidth = docCollapsed ? 100 : pct;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* 브레드크럼 바 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          paddingBottom: '6px',
          borderBottom: '1px solid var(--border)',
          fontSize: '12px',
          color: 'var(--muted)',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          📄 {crumb}
        </span>
        <button type="button" onClick={toggleTree} title="트리 패널 접기/펼치기" style={crumbBtn}>
          ◧
        </button>
        <button type="button" onClick={toggleDoc} title="내용 패널 접기/펼치기" style={crumbBtn}>
          ◨
        </button>
      </div>

      <div ref={containerRef} style={{ display: 'flex', flex: 1, minHeight: 0, paddingTop: '6px' }}>
        {!treeCollapsed && (
          <div
            style={{
              width: `${treeWidth}%`,
              overflow: 'auto',
              minWidth: 0,
              minHeight: 0,
              paddingRight: '6px',
            }}
          >
            {treeError ? (
              <ErrorBanner message={treeError} onRetry={loadTree} />
            ) : treeLoading ? (
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>불러오는 중…</p>
            ) : (
              <FileTree nodes={treeNodes} selectedPath={selectedPath} onSelect={setSelectedPath} />
            )}
          </div>
        )}

        {!treeCollapsed && !docCollapsed && (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ width: '6px', flexShrink: 0, cursor: 'col-resize', background: 'var(--border)' }}
          />
        )}

        {!docCollapsed && (
          <div style={{ flex: 1, overflow: 'auto', minWidth: 0, minHeight: 0, paddingLeft: '6px' }}>
            {docError ? (
              <ErrorBanner message={docError} onRetry={() => setDocNonce((n) => n + 1)} />
            ) : docLoading ? (
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>불러오는 중…</p>
            ) : !selectedPath ? (
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>왼쪽에서 문서를 선택하세요</p>
            ) : (
              <DocView
                key={selectedPath}
                tokens={tokens}
                isDefaultOpen={d.autoExpandSections ? matchDefaultOpen : NEVER_OPEN}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
