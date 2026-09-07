// 브리핑 카드 (순수 프레젠테이션)
// - fetch·store 를 참조하지 않는다. props = { brief, showMeta }.
// - 본문은 plain text. 마크다운 파서·dangerouslySetInnerHTML 를 쓰지 않는다 (NFR-SEC-04).
// - 테마 색은 WidgetFrame 이 주입하는 CSS 변수만 사용한다.
// - Notion 링크는 <a> 대신 클립보드 복사 버튼이다 (Electron 외부 내비게이션 차단 — 결정 8).

import React, { useState } from 'react';

// ISO8601 → 로컬 'HH:MM' (파싱 불가면 원문 그대로)
function localTime(iso) {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return String(iso);
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function BriefCard({ brief, showMeta = true }) {
  const [copied, setCopied] = useState(false);
  if (!brief) return null;

  const copyNotion = async () => {
    try {
      await navigator.clipboard.writeText(brief.notion_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 접근 실패는 조용히 무시한다 (권한 없음 등).
    }
  };

  return (
    <div>
      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}>
        {brief.content}
      </div>

      {showMeta && (
        <div
          style={{
            marginTop: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
            color: 'var(--muted)',
          }}
        >
          {brief.created_at && <span>생성 {localTime(brief.created_at)}</span>}
          {brief.notion_url && (
            <button
              onClick={copyNotion}
              style={{
                background: 'transparent',
                border: '1px solid var(--muted)',
                borderRadius: '6px',
                padding: '2px 8px',
                color: 'var(--w-text, var(--text))',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {copied ? '복사됨' : '🔗 Notion 링크 복사'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
