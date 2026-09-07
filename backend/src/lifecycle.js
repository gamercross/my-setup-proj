// 프로세스 수명주기 정책 (C1) — 미처리 예외/종료 신호 시 안전 종료.
//
// 규칙 (ADR-0016 "실패·종료 정책"):
//  - uncaughtException: 기존 로그 정책(1줄 + 스택) 기록 후 안전 종료(exit 1). 프로세스 유지 안 함.
//  - SIGTERM / SIGINT: 같은 종료 절차 + exit 0.
//  - unhandledRejection: 기존 동작 유지 — 로그만 남기고 죽지 않는다 (회귀 0).
//  - 재기동은 감독자(Electron main) 책임.
//
// 순수 함수 + 의존성 주입으로 테스트 가능하게 만든다. NODE_ENV 로 정책을 분기하지 않는다.

// 치명적 오류를 기존 정책대로 기록한다 (console.error 1줄 + 스택).
function logFatal(kind, err, log = console) {
  const message = (err && err.message) || String(err);
  log.error(`[fatal] ${kind}: ${message}`);
  if (err && err.stack) log.error(err.stack);
}

// 멱등 종료 함수를 만든다.
// 반환: async (reason, exitCode=0) => void
//  - 여러 번 호출해도 종료 절차는 한 번만 실행된다 (신호 2회, 예외 중 예외 대비).
//  - server.close() 콜백 오류는 삼키고 종료를 계속한다.
//  - closeDb 는 커넥션이 없으면 no-op, 예외는 로그 후 무시.
//  - server.close 가 timeoutMs 안에 안 끝나면 강제 종료한다.
function createShutdown({ server, closeDb, exit, timeoutMs = 5000, log = console }) {
  let started = false;

  return async function shutdown(reason, exitCode = 0) {
    if (started) return;
    started = true;

    log.log(`[lifecycle] ${reason} — 서버 종료 중...`);

    // 강제 종료 타이머 — 이벤트 루프를 잡지 않도록 unref()
    const forceTimer = setTimeout(() => {
      log.error(`[lifecycle] 종료가 ${timeoutMs}ms 안에 끝나지 않아 강제 종료합니다.`);
      exit(exitCode);
    }, timeoutMs);
    if (forceTimer && typeof forceTimer.unref === 'function') forceTimer.unref();

    // 1) 열린 HTTP 서버 close (콜백/예외 오류는 삼키고 계속)
    await new Promise((resolve) => {
      if (!server || typeof server.close !== 'function') return resolve();
      try {
        server.close((err) => {
          if (err) log.error('[lifecycle] 서버 close 오류:', err.message);
          resolve();
        });
      } catch (err) {
        log.error('[lifecycle] 서버 close 예외:', err.message);
        resolve();
      }
    });

    // 2) SQLite WAL 체크포인트 + 커넥션 종료
    try {
      if (typeof closeDb === 'function') closeDb();
    } catch (err) {
      log.error('[lifecycle] DB 정리 오류:', err.message);
    }

    clearTimeout(forceTimer);
    log.log(`[lifecycle] 종료 완료 (exit ${exitCode})`);
    exit(exitCode);
  };
}

// 프로세스 핸들러를 등록한다. 조립 지점(server.js)에서 한 번 호출한다.
// 반환: { shutdown } (테스트/수동 트리거용)
function registerProcessHandlers({ server, closeDb, exit, timeoutMs, log } = {}) {
  const resolvedLog = log || console;
  const shutdown = createShutdown({
    server,
    closeDb: closeDb || require('../db/index').checkpointAndClose,
    exit: exit || ((code) => process.exit(code)),
    timeoutMs,
    log: resolvedLog,
  });

  process.on('uncaughtException', (err) => {
    logFatal('uncaughtException', err, resolvedLog);
    shutdown('uncaughtException', 1);
  });

  // unhandledRejection 은 기존 동작 유지: 로그만, 종료하지 않는다.
  process.on('unhandledRejection', (reason) => {
    resolvedLog.error('처리되지 않은 Promise 거부:', reason);
  });

  process.on('SIGTERM', () => shutdown('SIGTERM', 0));
  process.on('SIGINT', () => shutdown('SIGINT', 0));

  return { shutdown };
}

module.exports = { logFatal, createShutdown, registerProcessHandlers };
