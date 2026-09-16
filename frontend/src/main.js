// Electron 메인 프로세스
// - 800x600 창을 생성한다 (최소 800x600)
// - dev 모드: Vite 개발 서버(:5173) 를 로드
// - prod 모드: 빌드 결과(../dist/index.html) 를 로드
// - 로드 실패 시 fallback.html 로 폴백한다
//
// ADR-0016 결정 2~4항: 패키징/감독 모드에서는 백엔드(Express)를 자식 프로세스로 fork 하여
// 감독(기동·헬스체크·재기동·포트 탐색)한다. dev 모드(scripts/dev.sh)는 백엔드가 이미 별도로
// 떠 있으므로 여기서 다시 fork 하지 않는다(SQLite 이중 오픈 방지).

const { app, BrowserWindow, ipcMain } = require('electron');
const { fork } = require('child_process');
const path = require('path');

const { createBackendSupervisor } = require('./main/backendSupervisor');
const { findFreePort } = require('./main/portFinder');
const { waitForHealth } = require('./main/healthCheck');
const { attachBackendLog } = require('./main/backendLog');
const { DEFAULT_API_BASE_URL, buildApiBaseUrl } = require('./main/apiBaseUrl');

// Vite 개발 서버 주소
const DEV_SERVER_URL = 'http://localhost:5173';
// 패키징되지 않았고 NODE_ENV 가 production 이 아니면 개발 모드로 본다
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

// 감독 모드 게이트: 패키징 빌드거나 명시적으로 켠 경우에만 백엔드를 fork 한다.
const superviseBackend = app.isPackaged || process.env.APP_SUPERVISE_BACKEND === '1';

// 백엔드 엔트리 경로(개발/감독 공통).
// TODO: 패키징 리소스 경로(extraResources 등) 대응은 electron-builder 설정 도입 시 함께 처리한다(범위 밖).
const BACKEND_ENTRY = path.join(__dirname, '../../backend/src/server.js');

let supervisor = null;
let apiBaseUrl = DEFAULT_API_BASE_URL;
let quitting = false; // before-quit 재진입 가드
let errorWindow = null; // 백엔드 기동 실패 화면 — 재시도 성공 시 이 창을 닫는다

function healthUrl(port) {
  return `http://127.0.0.1:${port}/api/health`;
}

// 메인 창을 생성하는 함수
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    title: 'AI Computer OS',
    show: false,
    webPreferences: {
      // 보안을 위해 preload 스크립트를 통해서만 Node 기능을 노출한다
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [`--api-base-url=${apiBaseUrl}`],
    },
  });

  // 준비가 끝난 뒤 표시 — 로딩 중 흰 화면 깜빡임 방지
  win.once('ready-to-show', () => win.show());

  // 폴백을 이미 로드했는지 표시해 무한 루프를 막는다
  let loadedFallback = false;
  const loadFallback = (reason) => {
    if (loadedFallback) return;
    loadedFallback = true;
    console.error('화면 로드 실패, 폴백으로 전환합니다:', reason);
    win.loadFile(path.join(__dirname, 'fallback.html')).catch((err) => {
      console.error('폴백 화면 로드도 실패했습니다:', err);
    });
  };

  // 렌더러 로드 (dev = Vite 서버, prod = 빌드본)
  const loadPromise = isDev
    ? win.loadURL(DEV_SERVER_URL)
    : win.loadFile(path.join(__dirname, '../dist/index.html'));
  loadPromise.catch((err) => loadFallback(err));

  // 네트워크/파일 로드 자체가 실패한 경우
  win.webContents.on('did-fail-load', (_e, errorCode, errorDescription, _url, isMainFrame) => {
    // 메인 프레임 로드 실패만 폴백 대상. HMR 등 하위 프레임 실패는 무시한다.
    if (!isMainFrame) return;
    loadFallback(`${errorCode} ${errorDescription}`);
  });

  // 개발 모드일 때 개발자 도구를 연다
  if (process.argv.includes('--enable-logging') || !app.isPackaged) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  return win;
}

// 백엔드 기동 실패 화면 (reason: 'timeout' | 'no-port' 등)
function createErrorWindow(reason) {
  const win = new BrowserWindow({
    width: 480,
    height: 320,
    title: 'AI Computer OS — 오류',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [`--api-base-url=${apiBaseUrl}`],
    },
  });
  win.once('ready-to-show', () => win.show());
  win
    .loadFile(path.join(__dirname, 'error.html'), { search: `reason=${encodeURIComponent(reason)}` })
    .catch((err) => console.error('에러 화면 로드 실패:', err));
  win.on('closed', () => {
    if (errorWindow === win) errorWindow = null;
  });
  errorWindow = win;
  return win;
}

// 재기동 직후 수퍼바이저 상태를 사람이 읽을 에러 사유 문자열로 매핑한다 (activate 복구용).
function reasonForState(state) {
  return state === 'failed' ? 'failed' : 'timeout';
}

// 열려 있는 모든 창에 백엔드 상태를 알린다 (AppShell 의 ErrorBanner 배선용)
function broadcastBackendState(payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('backend:state', payload);
  }
}

// 감독 모드 백엔드 기동: 포트 탐색 → fork → 헬스 확인까지 마치고 결과를 반환한다.
async function startSupervisedBackend() {
  supervisor = createBackendSupervisor({
    entryPath: BACKEND_ENTRY,
    findPort: () => findFreePort(),
    fork: (entry, args, options) => {
      const child = fork(entry, args, options);
      attachBackendLog(child, path.join(app.getPath('userData'), 'logs'));
      return child;
    },
    waitForHealth: (opts) => waitForHealth(opts),
    healthUrl,
    onState: (payload) => {
      if (payload.port) apiBaseUrl = buildApiBaseUrl(payload.port);
      broadcastBackendState(payload);
      // 백그라운드 자동 재기동(사용자가 "재시도"를 누르지 않아도 attempts 기반 백오프가 스스로
      // 성공한 경우)으로 online 이 됐는데 에러 창이 여전히 떠 있으면, 수동 재시도 성공 때와
      // 동일하게 정상 창을 열고 에러 창을 닫는다. 그렇지 않으면 사용자가 정상 동작하는
      // 백엔드를 두고도 계속 에러 화면에 남게 된다.
      if (payload.state === 'online' && errorWindow && !errorWindow.isDestroyed()) {
        createWindow();
        errorWindow.close();
        // close() 는 비동기라 'closed' 이벤트가 아직 안 왔을 수 있다 — backend:retry 핸들러가
        // (retry() 의 결과를 기다리는 동안 이 콜백이 먼저 실행되므로) 같은 창을 또 열지 않도록
        // 즉시 참조를 비운다.
        errorWindow = null;
      }
    },
    log: console,
  });

  const ok = await supervisor.start();
  if (supervisor.getPort()) apiBaseUrl = buildApiBaseUrl(supervisor.getPort());
  return ok;
}

// macOS: 독 아이콘 클릭 시 창이 없으면 새로 만든다. 에러 화면을 닫은 뒤에도 복구할 수 있도록
// 정상/에러 어느 경로로 시작했든 항상 등록한다(item 9).
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length > 0) return;
  if (superviseBackend && supervisor && supervisor.getState() !== 'online') {
    createErrorWindow(reasonForState(supervisor.getState()));
    return;
  }
  createWindow();
});

// Electron 준비가 끝나면 창을 만든다
app.whenReady().then(async () => {
  try {
    if (superviseBackend) {
      let healthOk = false;
      try {
        healthOk = await startSupervisedBackend();
      } catch (err) {
        // 포트 소진 등 start() 가 던진 경우 — 한국어 메시지와 함께 에러 화면
        console.error('백엔드 기동 실패:', err.message);
        createErrorWindow('no-port');
        return;
      }

      if (!healthOk) {
        createErrorWindow('timeout');
        return;
      }
    }

    createWindow();
  } catch (err) {
    console.error('창 생성 중 오류가 발생했습니다:', err);
  }
});

// ErrorBanner(정상 창 내부)/에러 화면(별도 창) "재시도" 버튼이 공통으로 쓰는 채널이다.
// - 초기 기동 실패로 에러 창만 떠 있던 경우: 성공하면 정상 창을 새로 열고 에러 창을 닫는다
//   (재시도 성공 후 사용자가 에러 화면에 갇히는 문제 방지, errorWindow 유무로 판별).
// - 이미 정상 창이 떠 있는 채로(예: 가동 중 반복 크래시 → failed) 재시도한 경우: onState 의
//   broadcastBackendState 가 이미 같은 창에 새 상태를 전달하므로 창을 새로 열 필요가 없다.
// 실패하면 사유를 함께 돌려줘 error.js 가 메시지를 갱신할 수 있게 한다.
ipcMain.handle('backend:retry', async () => {
  if (!supervisor) return { ok: false, reason: 'no-port' };
  try {
    const ok = await supervisor.retry();
    if (ok) {
      if (errorWindow && !errorWindow.isDestroyed()) {
        createWindow();
        errorWindow.close();
      }
      return { ok: true };
    }
    return { ok: false, reason: reasonForState(supervisor.getState()) };
  } catch (err) {
    console.error('백엔드 재시도 실패:', err.message);
    return { ok: false, reason: 'no-port' };
  }
});

// 모든 창이 닫히면 앱을 종료한다 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// 자식 백엔드를 종료한다 (중복 호출 안전 — supervisor.stop() 은 멱등하게 작성돼 있음)
async function shutdownSupervisor() {
  if (!supervisor) return;
  try {
    await supervisor.stop();
  } catch (err) {
    console.error('백엔드 종료 중 오류:', err.message);
  }
}

// 앱 종료 시 자식 백엔드도 함께 종료한다. 재진입 가드 필수(무한 루프 방지).
// before-quit 이 유일한 정리 경로다 — 'quit' 이벤트는 동기적으로 완료를 기다려주지 않으므로
// (비동기 shutdownSupervisor() 를 걸어도 프로세스 종료 전 완료를 보장 못 함) 안전망으로 쓰지 않는다.
// OS 강제 종료(kill -9 등)처럼 Electron 이벤트 자체가 안 뜨는 경우는 어떤 핸들러로도 못 막는다.
app.on('before-quit', (e) => {
  if (quitting || !supervisor) return;
  quitting = true;
  e.preventDefault();
  shutdownSupervisor().finally(() => app.quit());
});
