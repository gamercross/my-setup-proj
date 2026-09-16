// 앱 셸 — 좌 Sidebar + 우 TopicView 2단 레이아웃 (ADR-0032).
// - 백엔드 /health 폴링을 여기서 소유하고 statusColor 와 함께 TopicView 에 내려준다
//   (기존 App.jsx 의 헬스 로직을 로직 변경 없이 이동한 것 — FR-UI-02 AC-5 회귀 방지).
// - 현재 주제는 useUiStore 가 소유. 미등록/손상 값은 기본 주제로 폴백한다.
// - 감독 모드(ADR-0016 결정 3항)에서 백엔드가 재기동 3회를 초과해 failed 상태가 되면
//   window.appInfo.onBackendState 구독으로 전역 ErrorBanner + "재시도" 를 띄운다.

import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import TopicView from './TopicView';
import ErrorBanner from './ErrorBanner';
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
  // 감독 모드 백엔드 상태 (connecting/online/disconnected/failed). 브리지 없으면 계속 null.
  const [backendState, setBackendState] = useState(null);

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

  // 감독 모드 백엔드 상태 구독 (브리지 없으면 no-op 구독 해제 함수를 받는다)
  useEffect(() => {
    if (!info.onBackendState) return undefined;
    const unsubscribe = info.onBackendState((payload) => {
      setBackendState(payload);
    });
    return unsubscribe;
  }, []);

  const handleRetry = async () => {
    setBackendState((prev) => (prev ? { ...prev, state: 'connecting' } : prev));
    try {
      if (info.retryBackend) await info.retryBackend();
    } catch (err) {
      console.error('백엔드 재시도 실패:', err);
    }
  };

  const statusColor =
    health.status === 'ok'
      ? 'var(--ok)'
      : health.status === 'error'
        ? 'var(--bad)'
        : 'var(--muted)';

  const showFailedBanner = backendState && backendState.state === 'failed';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar style={{ flex: '0 0 auto' }} demo={DEMO} version={info.version} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {showFailedBanner && (
          <ErrorBanner
            message="백엔드를 시작하지 못했습니다. 재시도해 주세요."
            onRetry={handleRetry}
          />
        )}
        <TopicView
          topic={topic}
          demo={DEMO}
          info={info}
          health={health}
          statusColor={statusColor}
        />
      </div>
    </div>
  );
}
