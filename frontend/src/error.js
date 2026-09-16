// 백엔드 기동 실패 에러 화면 스크립트 (ADR-0016 결정 2항)
// error.html 의 CSP(script-src 'self')가 인라인 스크립트를 막으므로 분리했다.

function reasonMessage(reason) {
  switch (reason) {
    case 'timeout':
      return '백엔드가 10초 안에 응답하지 않았습니다.';
    case 'no-port':
      return '사용 가능한 백엔드 포트를 찾지 못했습니다 (3000~3010).';
    case 'failed':
      return '백엔드가 반복적으로 종료되어 재기동을 멈췄습니다.';
    default:
      return '백엔드를 시작하지 못했습니다.';
  }
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const reason = params.get('reason');

  const messageEl = document.getElementById('message');
  if (messageEl) messageEl.textContent = reasonMessage(reason);

  // 백그라운드 자동 재기동(attempts 기반 백오프가 사용자 개입 없이 스스로 성공한 경우)을
  // 구독한다. 정상적으로는 main 프로세스가 이 online 브로드캐스트를 받아 정상 창을 열고
  // 이 창을 닫아주지만(main.js), 그 전환이 지연되는 사이 사용자가 이 화면을 계속 보고 있을
  // 수 있으므로 안내 문구만이라도 갱신해 "죽은 백엔드를 붙잡고 있다"는 오해를 막는다.
  if (window.appInfo && typeof window.appInfo.onBackendState === 'function') {
    window.appInfo.onBackendState((payload) => {
      if (payload && payload.state === 'online' && messageEl) {
        messageEl.textContent = '백엔드가 자동으로 복구되었습니다. 잠시 후 메인 화면으로 전환됩니다…';
      }
    });
  }

  const btn = document.getElementById('retry-btn');
  if (!btn) return;

  // 브리지가 없으면(웹 데모 등) 버튼을 비활성화한다
  if (!window.appInfo || typeof window.appInfo.retryBackend !== 'function') {
    btn.disabled = true;
    return;
  }

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = '재시도 중…';
    try {
      const result = await window.appInfo.retryBackend();
      // 성공 시 main 프로세스가 정상 창을 띄우고 이 창을 닫으므로 여기서 할 일이 없다.
      // 실패 시에는 사유를 반영해 화면 문구를 갱신한다(사용자가 계속 에러 화면에 남는 경우).
      if (result && result.ok === false && messageEl) {
        messageEl.textContent = reasonMessage(result.reason);
      }
    } catch (err) {
      console.error('재시도 실패:', err);
    } finally {
      btn.disabled = false;
      btn.textContent = '재시도';
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
