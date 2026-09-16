// 자식 백엔드 stdout/stderr → 파일 로그 (NFR-DEPLOY-04)
// - app.getPath('userData')/logs/backend.log 에 append. 5MB 초과 시 1단계 회전(backend.log.1).
// - 스트림 오류는 콘솔로 폴백하고 앱을 막지 않는다.

const fs = require('fs');
const path = require('path');

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function createBackendLogStream(logDir) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (err) {
    console.error('백엔드 로그 디렉터리 생성 실패:', err.message);
  }

  const logPath = path.join(logDir, 'backend.log');

  try {
    const st = fs.statSync(logPath);
    if (st.size > MAX_BYTES) {
      fs.renameSync(logPath, `${logPath}.1`);
    }
  } catch {
    // 파일이 없거나 stat 실패 — 회전 없이 새로 시작
  }

  const stream = fs.createWriteStream(logPath, { flags: 'a' });
  stream.on('error', (err) => {
    console.error('백엔드 로그 파일 쓰기 실패:', err.message);
  });
  return stream;
}

// 자식 프로세스의 stdout/stderr 를 로그 스트림에 연결한다. 스트림을 반환한다(수명 관리는 호출부).
function attachBackendLog(child, logDir) {
  let stream;
  try {
    stream = createBackendLogStream(logDir);
  } catch (err) {
    console.error('백엔드 로그 스트림 생성 실패, 콘솔로 폴백합니다:', err.message);
    return null;
  }

  try {
    if (child.stdout) child.stdout.pipe(stream, { end: false });
    if (child.stderr) child.stderr.pipe(stream, { end: false });
  } catch (err) {
    console.error('백엔드 로그 연결 실패:', err.message);
  }

  // 재기동마다 새 스트림이 생기므로, 자식이 종료되면 이 스트림을 닫아 파일 핸들이 쌓이지 않게 한다.
  // 'exit' 이 아니라 'close' 를 써야 한다 — 'exit' 은 stdout/stderr 파이프가 flush 되기 전에
  // 발생할 수 있어(close 는 모든 stdio 스트림이 닫힌 뒤 발생) 'exit' 시점에 stream.end() 를
  // 부르면 마지막 로그 몇 줄이 유실되거나 write-after-end 오류가 날 수 있다.
  child.once('close', () => {
    stream.end();
  });

  return stream;
}

module.exports = { createBackendLogStream, attachBackendLog };
