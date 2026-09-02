// Electron 메인 프로세스
// - 800x600 창을 생성한다 (최소 800x600)
// - dev 모드: Vite 개발 서버(:5173) 를 로드
// - prod 모드: 빌드 결과(../dist/index.html) 를 로드
// - 로드 실패 시 fallback.html 로 폴백한다

const { app, BrowserWindow } = require('electron');
const path = require('path');

// Vite 개발 서버 주소
const DEV_SERVER_URL = 'http://localhost:5173';
// 패키징되지 않았고 NODE_ENV 가 production 이 아니면 개발 모드로 본다
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

// 메인 창을 생성하는 함수
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    title: 'AI Computer OS',
    webPreferences: {
      // 보안을 위해 preload 스크립트를 통해서만 Node 기능을 노출한다
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

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
}

// Electron 준비가 끝나면 창을 만든다
app.whenReady().then(() => {
  try {
    createWindow();

    // macOS: 독 아이콘 클릭 시 창이 없으면 새로 만든다
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  } catch (err) {
    console.error('창 생성 중 오류가 발생했습니다:', err);
  }
});

// 모든 창이 닫히면 앱을 종료한다 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
