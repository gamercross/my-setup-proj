// 백엔드 자식 프로세스 감독자 (ADR-0016 결정 2~4항)
// - fork → 헬스체크 → 상태 전이. 비정상 종료 시 백오프 재기동(최대 3회), 초과 시 failed.
// - 수동 retry() 는 attempts 를 0으로 초기화해 새로 3회 기회를 준다.
// - 모든 외부 의존(포트 탐색·fork·헬스체크·타이머)은 주입받아 순수 로직을 테스트 가능하게 한다.

const { nextDelay } = require('./backoff');

// 상태 머신: connecting → online → disconnected → connecting(재기동) → failed(3회 초과)
function createBackendSupervisor({
  entryPath,
  findPort,
  fork,
  waitForHealth,
  healthUrl,
  onState = () => {},
  log = console,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
}) {
  let child = null;
  let port = null;
  let attempts = 0;
  // stop() 이 걸렸는지("종료 의사")를 나타낸다. wireChild 의 exit 핸들러가 재기동을 억제하는
  // 용도뿐 아니라, start() 가 진행 중(각 await 지점)에 stop() 이 끼어들면 즉시 중단하고 지금까지
  // 커밋한 것(fork 한 자식 등)을 정리한 뒤 빠지는 데도 쓰인다(아래 start() 본문 참고).
  // 새 start() 호출은 진입 시 이 플래그를 다시 false 로 되돌려, stop() 이후 다시 정상적으로
  // 재기동할 수 있게 한다 — 다만 그 사이(자신의 await 지점)에 stop() 이 다시 걸리면 그 값을
  // 그대로 존중해서 중단해야 하므로, "무조건 false 로 되돌리고 끝"이 아니라 각 await 재개 지점마다
  // 다시 확인한다.
  let stopped = false;
  let restartTimer = null;
  let state = 'idle';
  // start() 호출 세대 카운터. 동시에 진행되는 start() 가 있을 때, 뒤늦게 헬스 결과가 온 낡은
  // start() 가 그 사이 이미 새로 뜬 자식(다른 start() 가 online 으로 만든)을 건드리지 못하게 막는다.
  // (아래 startLock 이 "이전 자식 정리 → fork → child 대입" 구간의 동시 진입 자체를 막아주므로,
  // 이 카운터는 이제 방어적 이중 안전장치다.)
  let generation = 0;
  // "이전 자식 정리 → findPort → fork → child 대입"까지의 커밋 구간을 한 번에 하나의 start() 만
  // 통과하도록 직렬화하는 락. 이 구간 중간(findPort 의 await 등)에 다른 start() 가 끼어들면
  // 아직 child 가 갱신되지 않아 정리 검사를 그냥 통과해버려 2중 fork/고아가 생기던 문제를 막는다.
  // 헬스체크 대기(await waitForHealth)는 이 락 밖에서 진행되므로, 크래시로 인한 자동 재기동처럼
  // 앞선 start() 가 아직 헬스 응답을 못 받은 상태에서 새 start() 가 진행되는 정상 시나리오는
  // 여전히 막지 않는다.
  // null 이면 "락이 비어있다"는 뜻 — 이 경우 await 없이 바로 커밋 구간을 시작해야 한다(경합이
  // 없을 때는 기존과 동일하게 동기적으로 진행되어야 하는 호출부 가정을 깨지 않기 위함).
  let commitLock = null;

  function setState(next) {
    state = next;
    try {
      onState({ state, port, attempts });
    } catch (err) {
      log.error('backendSupervisor 상태 콜백 오류:', err.message);
    }
  }

  // 자식이 살아있는지(아직 exit 이 확정되지 않았는지) 판단한다.
  // Node 의 child.killed 는 "신호 전달에 성공했다"는 뜻일 뿐 "프로세스가 죽었다"가 아니다
  // (backend/src/lifecycle.js 가 최대 5초 graceful shutdown 을 하므로, SIGTERM 직후에도 최대
  // 5초간 실제로는 살아있을 수 있다). exitCode/signalCode 는 실제 'exit' 이벤트가 발생해야
  // 채워지므로, 이 둘이 모두 null 이면 "아직 종료가 확정되지 않은 자식"으로 판단한다.
  function isAlive(c) {
    return !!c && c.exitCode === null && c.signalCode === null;
  }

  // attempts 를 1 증가시키고 백오프 스케줄에 따라 재기동하거나, 한도 초과 시 failed 로 전이한다.
  function scheduleRestartOrFail() {
    attempts += 1;
    const delay = nextDelay(attempts - 1);
    if (delay === null) {
      setState('failed');
      return;
    }
    setState('connecting');
    restartTimer = setTimeoutFn(() => {
      restartTimer = null;
      start().catch((err) => log.error('백엔드 재기동 실패:', err.message));
    }, delay);
  }

  function wireChild(c) {
    const onExit = (code, signal) => {
      if (stopped) return; // stop() 이 이미 종료를 주도 중 — 재기동하지 않는다

      log.error(`백엔드가 종료되었습니다 (code=${code}, signal=${signal})`);
      scheduleRestartOrFail();
    };
    c.on('exit', onExit);
    // 나중에 이 리스너만 콕 집어 뗄 수 있도록 참조를 보관한다(fork() 호출부가 backendLog 등
    // 다른 'exit' 리스너를 이미 붙였을 수 있으므로 removeAllListeners 는 쓰지 않는다).
    c.__supervisorExitHandler = onExit;
  }

  // 지정된 자식 프로세스를 종료시키고 실제 종료(exit)까지 기다린다.
  // 재기동(start()) 직전 "고아가 된 이전 자식"을 정리할 때, 그리고 헬스 실패 후 이 자식을
  // 백오프 경로로 넘길 때 공통으로 쓴다. wireChild 가 붙인 리스너만 떼어 중복 처리를 막는다
  // (다른 소비자가 붙인 'exit' 리스너, 예: backendLog 의 스트림 정리는 그대로 유지한다).
  function terminateChild(c) {
    return new Promise((resolve) => {
      if (!isAlive(c)) {
        resolve();
        return;
      }
      if (c.__supervisorExitHandler) {
        c.removeListener('exit', c.__supervisorExitHandler);
        c.__supervisorExitHandler = null;
      }

      const forceTimer = setTimeoutFn(() => {
        try {
          c.kill('SIGKILL');
        } catch (err) {
          log.error('이전 백엔드 SIGKILL 실패:', err.message);
        }
      }, 5000);

      c.once('exit', () => {
        clearTimeoutFn(forceTimer);
        resolve();
      });

      try {
        c.kill('SIGTERM');
      } catch (err) {
        clearTimeoutFn(forceTimer);
        log.error('이전 백엔드 SIGTERM 실패:', err.message);
        resolve();
      }
    });
  }

  async function start() {
    // 이 호출이 "새로 재기동을 시도하겠다"는 의사이므로, 직전에 stop() 이 걸어둔 종료 의사를
    // 일단 취소한다. 다만 아래 각 await 지점에서 stop() 이 다시 걸리면(= 내가 진행되는 도중
    // 앱 종료가 요청되면) 그 값을 존중해 즉시 중단·정리하고 빠진다 — "무조건 false 로 되돌리고
    // 끝"이었던 예전 로직이 재시도 도중 종료 시 고아 백엔드를 남기던 버그의 원인이었다.
    stopped = false;

    // "이전 자식 정리 → findPort → fork → child 대입"까지를 한 번에 하나만 실행되게 직렬화한다.
    // 락이 비어있으면(경합 없음) await 를 거치지 않고 곧바로 내 차례로 세팅해, 기존처럼 동기적으로
    // (호출 직후 첫 실제 await 전까지) 커밋 구간에 진입할 수 있게 한다 — async 함수를 감싼 별도
    // 헬퍼를 await 하면 이미 resolve 된 프로미스라도 반드시 한 틱이 걸리므로 일부러 인라인한다.
    // 이미 누군가 커밋 구간을 도는 중이면 그 프로미스가 끝날 때까지 기다린 뒤 내 차례를 잡는다.
    // 이렇게 하면 거의 동시에 들어온 두 start() 호출도 반드시 순서대로 이 구간을 통과하므로,
    // 뒤에 들어온 쪽이 항상 갱신된 child 값을 보고 정리 검사를 한다(2중 fork 방지).
    while (commitLock) {
      await commitLock;
    }
    // 락을 기다리는 동안 stop() 이 걸렸다면(예: 대기 중이던 두 번째 재시도를 앱 종료가 앞질렀다)
    // 아직 아무 것도 커밋하지 않았으므로 그냥 빠진다.
    if (stopped) return false;

    let release;
    commitLock = new Promise((resolve) => {
      release = resolve;
    });

    let myGeneration;
    let forked;
    let foundPort;
    try {
      // 이전 자식이 아직 살아있으면(예: 헬스 실패 후 곧바로 retry() 가 불린 경우, 혹은 동시에
      // 들어온 다른 start() 가 방금 fork 한 경우) 먼저 정리한다. 이 처리 없이 fork 하면
      // 백엔드가 2중으로 떠서 고아 프로세스가 남는다.
      if (isAlive(child)) {
        await terminateChild(child);
      }
      // 이전 자식 종료를 기다리는 사이 stop() 이 걸렸다면, 아직 새로 fork 한 것이 없으므로
      // (이전 자식은 이미 방금 terminateChild 로 정리됐다) 더 진행하지 않고 빠진다.
      if (stopped) return false;

      setState('connecting');

      try {
        foundPort = await findPort();
      } catch (err) {
        log.error('백엔드 포트 탐색 실패:', err.message);
        setState('failed');
        throw err;
      }
      // 포트 탐색을 기다리는 사이 stop() 이 걸렸어도 아직 fork 전이므로 정리할 대상이 없다.
      if (stopped) return false;
      port = foundPort;

      // 이 start() 호출이 "최신"인지 뒤에서 판별할 수 있도록 세대 번호를 찍는다.
      myGeneration = ++generation;

      try {
        forked = fork(entryPath, [], {
          env: { ...process.env, APP_ENV: 'packaged', PORT: String(port) },
          stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        });
      } catch (err) {
        log.error('백엔드 fork 실패:', err.message);
        setState('failed');
        throw err;
      }

      wireChild(forked);
      child = forked;

      // fork ~ child 대입까지는 await 없이 동기적으로 진행되므로 중간에 stop() 이 끼어들 수 없다.
      // 하지만 방금 막 fork 를 커밋한 이 시점에는 이미 stop() 이 걸려 있을 수 있다(예: 바로 위
      // findPort 대기 중에 stop() 이 걸렸던 경우) — 그렇다면 방금 띄운 자식을 고아로 남기지 않고
      // 이 자리에서 바로 정리한 뒤 빠진다.
      if (stopped) {
        await terminateChild(forked);
        return false;
      }
    } finally {
      // 커밋(정리~fork~child 대입)이 끝났으니 락을 비우고 대기 중이던 다음 start() 에게 차례를
      // 넘긴다. 이 아래의 헬스체크 대기는 락 밖에서 진행되어, 크래시로 인한 자동 재기동처럼 앞선
      // start() 가 아직 헬스 응답을 못 받은 정상 시나리오까지 막지는 않는다.
      commitLock = null;
      release();
    }

    const ok = await waitForHealth({ url: healthUrl(foundPort) });

    // 헬스체크를 기다리는 사이 stop() 이 걸렸다면(방금 fork 한 이 자식을 대상으로) 앱 종료가
    // 진행 중이므로 온라인 전환 없이 정리하고 빠진다. isAlive 는 stop() 이 이미 이 자식을 처리해
    // 죽어있는 경우까지 함께 방어한다.
    if (stopped) {
      if (isAlive(forked)) {
        await terminateChild(forked);
      } else if (forked.__supervisorExitHandler) {
        forked.removeListener('exit', forked.__supervisorExitHandler);
        forked.__supervisorExitHandler = null;
      }
      return false;
    }

    // 대기하는 동안 더 최신 start() 가 이미 새 자식을 띄웠다면(예: 이 자식이 그 사이 크래시해서
    // 자동 재기동이 앞질러 간 경우), 이 낡은 결과로 최신 자식의 상태나 생명주기를 건드리지 않는다.
    // startLock 이 정상적으로 동작하는 한 이 분기의 forked 는 이미 죽어있는(다음 start() 가
    // 정리 단계에서 처리한) 상태여야 하지만, 방어적으로 살아있으면 직접 정리해 고아로 남기지
    // 않는다(가드에 걸려 빠지면서 자기 자식을 방치하는 회귀를 막는다). isAlive(forked) 가
    // false 로 관측되는 경로는 이론상 terminateChild() 내부의 kill() 이 throw 한 뒤 resolve
    // 되는 경우뿐이다(그 외에는 항상 실제 exit 이벤트를 거쳐 오므로) — 죽은 코드가 아니다.
    if (myGeneration !== generation) {
      if (isAlive(forked)) {
        await terminateChild(forked);
      } else if (forked.__supervisorExitHandler) {
        forked.removeListener('exit', forked.__supervisorExitHandler);
        forked.__supervisorExitHandler = null;
      }
      return false;
    }

    if (ok) {
      attempts = 0; // 안정 가동 후의 첫 크래시가 재기동 횟수를 이어받지 않도록 리셋
      setState('online');
      return true;
    }

    // 헬스 실패 — disconnected 로 알린 뒤 이 자식을 종료시켜 attempts 기반 백오프 경로로 넘긴다.
    // 종료된 자식의 exit 이벤트를 wireChild 가 받아 재기동(한도 초과 시 failed)을 이어간다.
    setState('disconnected');
    try {
      forked.kill('SIGTERM');
    } catch (err) {
      log.error('헬스 실패 후 백엔드 종료 실패:', err.message);
    }
    return false;
  }

  // 수동 재시도(ErrorBanner "재시도"): 카운터를 초기화하고 새로 3회 기회를 준다.
  function retry() {
    attempts = 0;
    if (restartTimer) {
      clearTimeoutFn(restartTimer);
      restartTimer = null;
    }
    return start();
  }

  // 앱 종료 시 호출. SIGTERM → 5s 내 미종료면 SIGKILL (backend/src/lifecycle.js 의 5s 타임아웃과 정렬).
  // stopped 를 가장 먼저 세워, 마침 진행 중인 start() 가 각자의 await 재개 지점에서 이를 보고
  // 스스로 중단·정리하게 한다(재시도 도중 종료 시 고아 백엔드가 남던 버그의 핵심 수정 지점).
  // 이후 현재 알고 있는 child 를 terminateChild 로 정리한다 — start() 가 그 사이 새 child 를
  // 커밋했다면 위 stopped 체크에 의해 start() 자신이 그 자식을 정리하므로, 여기서는 "지금 이
  // 순간 알려진" child 하나만 책임지면 충분하다.
  function stop() {
    stopped = true;
    if (restartTimer) {
      clearTimeoutFn(restartTimer);
      restartTimer = null;
    }
    return terminateChild(child);
  }

  function getPort() {
    return port;
  }

  function getState() {
    return state;
  }

  return { start, retry, stop, getPort, getState };
}

module.exports = { createBackendSupervisor };
