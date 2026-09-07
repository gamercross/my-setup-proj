// 프로세스 수명주기 테스트 (TC-REL-01~06).
//  - 단위(01~04): createShutdown / logFatal 에 mock 의존성 주입.
//  - 통합(05~06): child_process.spawn 으로 실제 프로세스 종료 절차 확인 (10초 가드).

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createShutdown, logFatal } = require('../src/lifecycle');

const SERVER_JS = path.resolve(__dirname, '../src/server.js');
const CRASH_FIXTURE = path.resolve(__dirname, './helpers/crashFixture.js');

// mock 로그 수집기
function makeLog() {
  const lines = [];
  return {
    lines,
    log: (...a) => lines.push(a.join(' ')),
    error: (...a) => lines.push(a.join(' ')),
  };
}

describe('수명주기 — 단위 (TC-REL-01~04)', () => {
  it('TC-REL-01: shutdown(uncaughtException,1) → server.close 1회 → closeDb 1회 → exit(1) 순서', async () => {
    const calls = [];
    const server = {
      close: (cb) => {
        calls.push('server.close');
        cb();
      },
    };
    const shutdown = createShutdown({
      server,
      closeDb: () => calls.push('closeDb'),
      exit: (code) => calls.push(`exit(${code})`),
      timeoutMs: 5000,
      log: makeLog(),
    });

    await shutdown('uncaughtException', 1);

    assert.deepEqual(calls, ['server.close', 'closeDb', 'exit(1)']);
  });

  it('TC-REL-02: shutdown 2회 연속 → closeDb·exit 각 1회 (멱등)', async () => {
    let closeDbCount = 0;
    let exitCount = 0;
    const shutdown = createShutdown({
      server: { close: (cb) => cb() },
      closeDb: () => { closeDbCount += 1; },
      exit: () => { exitCount += 1; },
      timeoutMs: 5000,
      log: makeLog(),
    });

    await shutdown('SIGTERM', 0);
    await shutdown('SIGTERM', 0);

    assert.equal(closeDbCount, 1);
    assert.equal(exitCount, 1);
  });

  it('TC-REL-03: server.close 콜백 미호출 + timeoutMs=20 → 타임아웃 후 exit(0)', async () => {
    let exitCode = null;
    const shutdown = createShutdown({
      server: { close: () => { /* 콜백을 부르지 않는다 */ } },
      closeDb: () => {},
      exit: (code) => { exitCode = code; },
      timeoutMs: 20,
      log: makeLog(),
    });

    shutdown('SIGTERM', 0);
    await new Promise((r) => setTimeout(r, 60));

    assert.equal(exitCode, 0);
  });

  it('TC-REL-04: logFatal(uncaughtException, Error(boom)) → 1줄 로그에 종류·메시지, 스택 유실 없음', () => {
    const log = makeLog();
    logFatal('uncaughtException', new Error('boom'), log);

    const head = log.lines[0];
    assert.match(head, /uncaughtException/);
    assert.match(head, /boom/);
    // 스택은 별도 줄로 보존된다
    assert.ok(log.lines.some((l) => /lifecycle\.test\.js|at /.test(l)));
  });
});

describe('수명주기 — 통합 (TC-REL-05~06)', () => {
  it('TC-REL-05: SIGTERM → exit 0, 종료 로그, -wal/-shm 정리', { timeout: 10000 }, async () => {
    const port = 3900 + Math.floor(Math.random() * 80);
    const tmpDb = path.join(os.tmpdir(), `lifecycle_${Date.now()}.db`);

    const child = spawn(process.execPath, [SERVER_JS], {
      env: { ...process.env, PORT: String(port), DATABASE_PATH: tmpDb, NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });

    // health 대기
    await waitFor(async () => {
      try {
        await httpGet(`http://localhost:${port}/api/health`);
        return true;
      } catch {
        return false;
      }
    }, 8000);

    const exited = new Promise((resolve) => child.on('exit', (code) => resolve(code)));
    child.kill('SIGTERM');
    const code = await exited;

    try {
      assert.equal(code, 0);
      assert.match(out, /\[lifecycle\]/);
      assert.ok(!fs.existsSync(`${tmpDb}-wal`), '-wal 이 정리되어야 한다');
      assert.ok(!fs.existsSync(`${tmpDb}-shm`), '-shm 이 정리되어야 한다');
    } finally {
      for (const f of [tmpDb, `${tmpDb}-wal`, `${tmpDb}-shm`]) {
        try { fs.unlinkSync(f); } catch { /* 무시 */ }
      }
    }
  });

  it('TC-REL-06: 비동기 예외 → exit 1 + uncaughtException 로그 1줄', { timeout: 10000 }, async () => {
    const child = spawn(process.execPath, [CRASH_FIXTURE], {
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });

    const code = await new Promise((resolve) => child.on('exit', (c) => resolve(c)));

    assert.equal(code, 1);
    assert.match(out, /uncaughtException/);
    assert.match(out, /의도된 예외/);
  });
});

// ── 헬퍼 ─────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume();
      if (res.statusCode === 200) resolve();
      else reject(new Error(`status ${res.statusCode}`));
    });
    req.on('error', reject);
  });
}

async function waitFor(fn, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('waitFor 타임아웃');
}
