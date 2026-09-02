// Electron 메인 프로세스
// - 800x600 크기의 창을 생성한다
// - 개발자 도구를 활성화한다
// - 최소 기능만 구현한다 (Week 1 수준)

const { app, BrowserWindow } = require('electron');
const path = require('path');

// 메인 창을 생성하는 함수
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'AI Computer OS',
    webPreferences: {
      // 보안을 위해 preload 스크립트를 통해서만 Node 기능을 노출한다
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 렌더러 HTML 로드
  win.loadFile(path.join(__dirname, 'index.html'));

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
