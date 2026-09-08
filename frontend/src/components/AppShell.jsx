// 앱 셸 — 좌 Sidebar + 우 TopicView 2단 레이아웃 (ADR-0032).
// - 백엔드 /health 폴링을 여기서 소유하고 statusColor 와 함께 TopicView 에 내려준다
//   (기존 App.jsx 의 헬스 로직을 로직 변경 없이 이동한 것 — FR-UI-02 AC-5 회귀 방지).
// - 현재 주제는 useUiStore 가 소유. 미등록/손상 값은 기본 주제로 폴백한다.

import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import TopicView from './TopicView';
import { useUiStore } from '../store/useUiStore.js';
import { getTopic, DEFAULT_TOPIC_ID } from '../widgets/topics.js';
import { apiGet } from '../api/client.js';

// preload 로 노출된 정보 (없을 수도 있으므로 방어)
const info = (typeof window !== 'undefined' && window.appInfo) || {};

// 웹 데모(프로토타입) 빌드 여부 (ADR-0026)
const DEMO =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEMO === '1';

export default function AppShell() {
  // 백엔드 헬스체크 상태 1개로 관리
  const [health, setHealth] = useState({ status: 'loading', message: '백엔드 확인 중…' });

  const activeTopic = useUiStore((s) => s.activeTopic);
  const topic = getTopic(activeTopic) ?? getTopic(DEFAULT_TOPIC_ID);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        await apiGet('/health');
        if (!aborted) setHealth({ status: 'ok', message: '백엔드 연결됨' });
      } catch (err) {
        // 스택·상태코드 원문은 콘솔에만, 화면에는 한국어 요약만
        console.error('헬스체크 실패:', err);
        if (!aborted) setHealth({ status: 'error', message: '백엔드 연결 안 됨' });
      }
    })();

    return () => {
      aborted = true;
    };
  }, []);

  const statusColor =
    health.status === 'ok'
      ? 'var(--ok)'
      : health.status === 'error'
        ? 'var(--bad)'
        : 'var(--muted)';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar style={{ flex: '0 0 auto' }} demo={DEMO} version={info.version} />
      <TopicView
        topic={topic}
        demo={DEMO}
        info={info}
        health={health}
        statusColor={statusColor}
      />
    </div>
  );
}
