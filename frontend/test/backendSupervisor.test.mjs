// 백엔드 감독자 상태 머신 테스트 (TC-TOPO-06~10) — ADR-0016 결정 2~4항
// 포트 탐색·fork·헬스체크·타이머를 모두 fake 로 주입해 실제 대기 없이 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import { createBackendSupervisor } from '../src/main/backendSupervisor.js';

// 자식 프로세스 fake — EventEmitter + kill(호출 기록)
// 실제 child_process 동작을 최대한 흉내낸다: kill() 성공 직후 killed=true 가 되지만(종료 확인
// 전이어도), exitCode/signalCode 는 실제 'exit' 이 발생(emit)해야 채워진다 — Node 는 kill()
// 호출이 "신호 전달 성공"만을 의미하고(killed=true), 자식이 SIGTERM 을 받고도 최대 수 초간
// graceful shutdown 하는 동안에는 exitCode/signalCode 모두 null 로 남아있는 것과 동일하다.
// emit 을 감싸 리스너 유무와 무관하게 갱신되게 한다(backendSupervisor 가 exit 리스너를 떼어내도
// exitCode/signalCode 는 정확해야 isAlive() 판정이 맞는다).
function makeFakeChild() {
  const child = new EventEmitter();
  child.exitCode = null;
  child.signalCode = null;
  child.killed = false;
  child.killCalls = [];
  child.kill = (signal) => {
    child.killCalls.push(signal);
    child.killed = true;
  };
  const originalEmit = child.emit.bind(child);
  child.emit = (event, ...args) => {
    if (event === 'exit') {
      child.exitCode = args[0] !== undefined ? args[0] : 0;
      child.signalCode = args[1] !== undefined ? args[1] : null;
    }
    return originalEmit(event, ...args);
  };
  return child;
}

// setTimeout/clearTimeout fake — 실제로 기다리지 않고 호출을 기록만 한다.
// 테스트가 직접 스케줄된 콜백을 실행(fireAll)하거나 취소 여부를 확인한다.
function makeFakeTimers() {
  const scheduled = []; // { id, fn, ms, cancelled }
  let nextId = 1;
  const setTimeoutFn = (fn, ms) => {
    const id = nextId++;
    scheduled.push({ id, fn, ms, cancelled: false });
    return id;
  };
  const clearTimeoutFn = (id) => {
    const entry = scheduled.find((s) => s.id === id);
    if (entry) entry.cancelled = true;
  };
  const fireNext = () => {
    const entry = scheduled.find((s) => !s.cancelled && !s.fired);
    if (!entry) return null;
    entry.fired = true;
    entry.fn();
    return entry.ms;
  };
  return { setTimeoutFn, clearTimeoutFn, scheduled, fireNext };
}

function makeSupervisorHarness({ healthy = true } = {}) {
  const forkedChildren = [];
  const timers = makeFakeTimers();
  const states = [];

  const fork = () => {
    const child = makeFakeChild();
    forkedChildren.push(child);
    return child;
  };

  const findPort = async () => 3000;
  // healthRef.current=false 는 "한 번도 정상 기동에 성공하지 못하고 계속 죽는" 크래시 루프를 흉내낸다
  // (attempts 가 헬스 성공 시에만 리셋되므로, 계속 죽는 시나리오는 헬스도 계속 실패해야 한다).
  const healthRef = { current: healthy };
  const waitForHealth = async () => healthRef.current;
  const healthUrl = (port) => `http://127.0.0.1:${port}/api/health`;

  const supervisor = createBackendSupervisor({
    entryPath: '/fake/entry.js',
    findPort,
    fork,
    waitForHealth,
    healthUrl,
    onState: (payload) => states.push(payload),
    log: { error() {}, log() {} },
    setTimeoutFn: timers.setTimeoutFn,
    clearTimeoutFn: timers.clearTimeoutFn,
  });

  return { supervisor, forkedChildren, timers, states, healthRef };
}

test('TC-TOPO-06: 자식 1회 비정상 exit → 1000ms 후 재기동 1회, 상태 connecting→online', async () => {
  const { supervisor, forkedChildren, timers, states } = makeSupervisorHarness();

  await supervisor.start();
  assert.equal(supervisor.getState(), 'online');
  assert.equal(forkedChildren.length, 1);

  // 자식이 비정상 종료
  forkedChildren[0].emit('exit', 1, null);
  assert.equal(supervisor.getState(), 'connecting');
  assert.equal(timers.scheduled.length, 1);
  assert.equal(timers.scheduled[0].ms, 1000);

  // 스케줄된 재기동 콜백 실행
  timers.fireNext();
  // start() 는 비동기이므로 다음 틱까지 대기
  await new Promise((r) => setImmediate(r));

  assert.equal(forkedChildren.length, 2);
  assert.equal(supervisor.getState(), 'online');

  const stateSeq = states.map((s) => s.state);
  assert.ok(stateSeq.includes('connecting'));
  assert.ok(stateSeq.includes('online'));
});

test('TC-TOPO-07: 자식이 계속 죽음 → fork 총 4회(최초+3), state==failed, 타이머 잔여 0', async () => {
  const { supervisor, forkedChildren, timers } = makeSupervisorHarness({ healthy: false });

  await supervisor.start();
  assert.equal(forkedChildren.length, 1);

  // 1차 크래시 → 1000ms 후 재기동
  forkedChildren[0].emit('exit', 1, null);
  timers.fireNext();
  await new Promise((r) => setImmediate(r));
  assert.equal(forkedChildren.length, 2);

  // 2차 크래시 → 2000ms 후 재기동
  forkedChildren[1].emit('exit', 1, null);
  timers.fireNext();
  await new Promise((r) => setImmediate(r));
  assert.equal(forkedChildren.length, 3);

  // 3차 크래시 → 4000ms 후 재기동
  forkedChildren[2].emit('exit', 1, null);
  timers.fireNext();
  await new Promise((r) => setImmediate(r));
  assert.equal(forkedChildren.length, 4);

  // 4차 크래시 → 자동 재기동 한도 초과, failed 로 전이. 새 타이머 예약 없음.
  const timerCountBefore = timers.scheduled.filter((s) => !s.fired && !s.cancelled).length;
  forkedChildren[3].emit('exit', 1, null);
  const timerCountAfter = timers.scheduled.filter((s) => !s.fired && !s.cancelled).length;

  assert.equal(supervisor.getState(), 'failed');
  assert.equal(forkedChildren.length, 4);
  assert.equal(timerCountBefore, timerCountAfter); // 새로 예약된 타이머 없음(잔여 0)
});

test('TC-TOPO-08: failed 후 retry() → attempts 0 초기화, 다시 3회 기회', async () => {
  const { supervisor, forkedChildren, timers, healthRef } = makeSupervisorHarness({
    healthy: false,
  });

  await supervisor.start();
  for (let i = 0; i < 4; i += 1) {
    forkedChildren[forkedChildren.length - 1].emit('exit', 1, null);
    if (supervisor.getState() !== 'failed') {
      timers.fireNext();
      await new Promise((r) => setImmediate(r));
    }
  }
  assert.equal(supervisor.getState(), 'failed');
  assert.equal(forkedChildren.length, 4);

  // 수동 재시도 — 이번에는 헬스가 정상적으로 통과한다고 가정(사용자가 원인을 고친 뒤 재시도)
  healthRef.current = true;
  await supervisor.retry();
  assert.equal(supervisor.getState(), 'online');
  assert.equal(forkedChildren.length, 5);

  // 재시도로 attempts 가 리셋됐으므로, 재시도 후 1회 크래시는 failed 로 바로 전이하지 않는다
  healthRef.current = false;
  forkedChildren[4].emit('exit', 1, null);
  assert.notEqual(supervisor.getState(), 'failed');
});

test('TC-TOPO-09: stop() 중 자식 exit → 재기동 시도 0, SIGTERM 1회', async () => {
  const { supervisor, forkedChildren, timers } = makeSupervisorHarness();

  await supervisor.start();
  const child = forkedChildren[0];

  const stopPromise = supervisor.stop();
  assert.deepEqual(child.killCalls, ['SIGTERM']);

  // stop 이 SIGTERM 을 보낸 뒤 자식이 실제로 종료됐다고 가정
  child.emit('exit', 0, 'SIGTERM');
  await stopPromise;

  // quitting 상태에서의 exit 은 재기동을 시도하지 않는다
  assert.equal(forkedChildren.length, 1);
  assert.equal(
    timers.scheduled.filter((s) => !s.fired && !s.cancelled).length,
    0
  );
});

test('TC-TOPO-10: fork 옵션 캡처 → env.APP_ENV === packaged, env.PORT = 확정 포트', async () => {
  let capturedOptions = null;
  const timers = makeFakeTimers();
  const supervisor = createBackendSupervisor({
    entryPath: '/fake/entry.js',
    findPort: async () => 3005,
    fork: (entry, args, options) => {
      capturedOptions = options;
      return makeFakeChild();
    },
    waitForHealth: async () => true,
    healthUrl: (port) => `http://127.0.0.1:${port}/api/health`,
    onState: () => {},
    log: { error() {}, log() {} },
    setTimeoutFn: timers.setTimeoutFn,
    clearTimeoutFn: timers.clearTimeoutFn,
  });

  await supervisor.start();

  assert.equal(capturedOptions.env.APP_ENV, 'packaged');
  assert.equal(capturedOptions.env.PORT, '3005');
  assert.equal(supervisor.getPort(), 3005);
});

test('TC-TOPO-12: 살아있는 자식이 있는 상태에서 start() 재호출 → 2중 기동 없이 이전 자식을 먼저 종료', async () => {
  const { supervisor, forkedChildren } = makeSupervisorHarness();

  await supervisor.start();
  assert.equal(forkedChildren.length, 1);
  assert.equal(supervisor.getState(), 'online');

  // 최초 자식이 아직 살아있는(exit 되지 않은) 상태에서 start() 를 다시 부른다.
  // (retry() 도 내부적으로 start() 를 호출하므로 이 경로를 그대로 탄다.)
  const secondStart = supervisor.start();

  // 두 번째 fork 전에 이전 자식에게 SIGTERM 을 보내고, 그 종료를 기다려야 한다.
  assert.deepEqual(forkedChildren[0].killCalls, ['SIGTERM']);
  assert.equal(forkedChildren.length, 1); // 아직 새 자식을 fork 하지 않음

  // 이전 자식이 실제로 종료됐다고 알린다.
  forkedChildren[0].emit('exit', 0, 'SIGTERM');
  await secondStart;

  // 새 자식이 정확히 1개만 추가로 fork 됐고, 이전 자식은 실제로 종료(exitCode 확정)됐다.
  assert.equal(forkedChildren.length, 2);
  assert.equal(forkedChildren[0].exitCode, 0);
  assert.equal(supervisor.getState(), 'online');

  // 이전 자식의 exit 이 재기동을 중복 트리거하지 않았어야 한다(fork 는 정확히 2회).
  forkedChildren[0].emit('exit', 1, null); // 뒤늦게 exit 이 한 번 더 와도(이미 뗀 리스너) 무시
  assert.equal(forkedChildren.length, 2);
});

test('TC-TOPO-13: 헬스 실패 → 자식 종료 후 attempts 기반 백오프로 수렴(무한정 disconnected 아님)', async () => {
  const { supervisor, forkedChildren, timers, healthRef } = makeSupervisorHarness({
    healthy: false,
  });

  const ok = await supervisor.start();
  assert.equal(ok, false);
  assert.equal(forkedChildren.length, 1);
  // 헬스 실패 시 곧바로 이 자식에게 종료 신호를 보낸다.
  assert.deepEqual(forkedChildren[0].killCalls, ['SIGTERM']);

  // 자식이 실제로 종료되면 wireChild 의 exit 핸들러가 attempts 기반 백오프로 이어간다.
  forkedChildren[0].emit('exit', 1, 'SIGTERM');
  assert.equal(supervisor.getState(), 'connecting');
  assert.equal(timers.scheduled.filter((s) => !s.fired && !s.cancelled).length, 1);

  // 재기동해도 다시 헬스가 실패하면 결국 failed 로 수렴해야 한다(영원히 disconnected 아님).
  timers.fireNext();
  await new Promise((r) => setImmediate(r));
  forkedChildren[1].emit('exit', 1, 'SIGTERM');

  timers.fireNext();
  await new Promise((r) => setImmediate(r));
  forkedChildren[2].emit('exit', 1, 'SIGTERM');

  timers.fireNext();
  await new Promise((r) => setImmediate(r));
  forkedChildren[3].emit('exit', 1, 'SIGTERM');

  assert.equal(supervisor.getState(), 'failed');
  healthRef.current = true; // 다음 체크를 위해 원복(다른 테스트에 영향 없음, 지역 변수)
});

test('TC-TOPO-14: 헬스 실패로 SIGTERM 만 보내진(killed=true, 아직 exit 안 됨) 자식에 retry() → 새 fork 는 실제 exit 이후에만 일어난다', async () => {
  const { supervisor, forkedChildren, healthRef } = makeSupervisorHarness({ healthy: false });

  const ok = await supervisor.start();
  assert.equal(ok, false);
  assert.equal(forkedChildren.length, 1);

  const child0 = forkedChildren[0];
  // 헬스 실패 직후 상태: SIGTERM 은 보냈지만(killed=true) 아직 실제로 종료되지 않았다
  // (backend/src/lifecycle.js 의 최대 5초 graceful shutdown 을 흉내낸다).
  assert.deepEqual(child0.killCalls, ['SIGTERM']);
  assert.equal(child0.exitCode, null);
  assert.equal(child0.signalCode, null);

  // 사용자가 이 시점에 바로 "재시도" — child.killed 만 보고 죽었다고 오판하면 안 된다.
  healthRef.current = true;
  const retryPromise = supervisor.retry();

  // 마이크로태스크가 몇 차례 돌아도, child0 가 실제로 exit 하기 전까지는 새로 fork 되면 안 된다
  // (2중 기동 방지). 참고: terminateChild 가 SIGTERM 을 한 번 더 보내는 것 자체는 무해하다.
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  assert.equal(forkedChildren.length, 1);
  assert.equal(supervisor.getState(), 'disconnected');

  // child0 이 실제로 종료됐다고 알리면, 그제서야 새 자식이 fork 되고 online 으로 전이한다.
  child0.emit('exit', 0, 'SIGTERM');
  await retryPromise;

  assert.equal(forkedChildren.length, 2);
  assert.equal(supervisor.getState(), 'online');
});

test('TC-TOPO-15: 진행 중인 start() 가 헬스 대기 중 뒤처져도, 그 사이 새로 online 된 자식을 죽이지 않는다', async () => {
  const forkedChildren = [];
  const states = [];
  let healthCallCount = 0;
  let firstHealthResolve;

  const fork = () => {
    const c = makeFakeChild();
    forkedChildren.push(c);
    return c;
  };
  const findPort = async () => 3000;
  // 첫 번째 헬스체크 호출은 테스트가 직접 resolve 할 때까지 멈춰 있는다(느린 start#1을 흉내).
  // 두 번째 이후 호출(자동 재기동으로 뜬 start#2)은 즉시 성공한다.
  const waitForHealth = async () => {
    healthCallCount += 1;
    if (healthCallCount === 1) {
      return new Promise((resolve) => {
        firstHealthResolve = resolve;
      });
    }
    return true;
  };
  const healthUrl = (port) => `http://127.0.0.1:${port}/api/health`;
  const timers = makeFakeTimers();

  const supervisor = createBackendSupervisor({
    entryPath: '/fake/entry.js',
    findPort,
    fork,
    waitForHealth,
    healthUrl,
    onState: (payload) => states.push(payload),
    log: { error() {}, log() {} },
    setTimeoutFn: timers.setTimeoutFn,
    clearTimeoutFn: timers.clearTimeoutFn,
  });

  // start#1: child0 fork, 헬스체크가 응답하지 않는 상태로 멈춰 있다 (아직 await 중).
  const start1 = supervisor.start();
  await new Promise((r) => setImmediate(r));
  assert.equal(forkedChildren.length, 1);

  // child0 이 (start#1 의 헬스체크 결과와 무관하게) 곧바로 크래시했다고 가정한다.
  forkedChildren[0].emit('exit', 1, null);
  assert.equal(timers.scheduled.filter((s) => !s.fired && !s.cancelled).length, 1);

  // 자동 재기동(start#2) 발동 — child1 이 fork 되고 헬스체크는 즉시 성공한다.
  timers.fireNext();
  await new Promise((r) => setImmediate(r));
  assert.equal(forkedChildren.length, 2);
  assert.equal(supervisor.getState(), 'online');

  // 이제서야 start#1 의 헬스체크가(낡은 결과로) false 를 반환한다.
  firstHealthResolve(false);
  const result1 = await start1;

  // 낡은 start#1 은 아무 것도 하지 말아야 한다: online 상태는 그대로 유지되고,
  // 정상 가동 중인 child1 은 죽임당하지 않는다.
  assert.equal(result1, false);
  assert.equal(supervisor.getState(), 'online');
  assert.deepEqual(forkedChildren[1].killCalls, []);
});

test('TC-TOPO-16: retry() 연달아 2회 호출해도 살아있는 자식은 항상 1개, stop() 후 고아 0', async () => {
  // 회귀 재현 시나리오: "백오프 자동 재기동 타이머가 발화해 start() 가 이미 진행 중인데 사용자가
  // '재시도'를 한 번 누르는 경우, 또는 ErrorBanner 와 에러 창이 동시에 떠 있는 경우" 등으로
  // start() 가 거의 동시에 두 번 호출되는 상황을 흉내낸다. 커밋 락이 없으면 두 호출 모두
  // isAlive(child) 검사를 통과해버려 자식이 2개 fork 되고, 그중 하나가 고아로 남는다.
  const { supervisor, forkedChildren } = makeSupervisorHarness();

  await supervisor.start();
  assert.equal(forkedChildren.length, 1);
  const child0 = forkedChildren[0];

  // await 없이 곧바로 두 번째 retry() 를 호출 — 두 start() 호출이 거의 동시에 들어온 상황.
  const retry1 = supervisor.retry();
  const retry2 = supervisor.retry();

  // 첫 번째 호출만 커밋 구간에 진입해 child0 정리를 시작한다. 두 번째 호출은 커밋 락이 풀릴
  // 때까지 대기해야 하므로, 이 시점엔 SIGTERM 이 정확히 1번만 나가고 새 fork 도 없어야 한다.
  assert.deepEqual(child0.killCalls, ['SIGTERM']);
  assert.equal(forkedChildren.length, 1);

  // child0 이 실제로 종료되면 첫 번째 retry() 가 findPort → fork 를 이어간다.
  child0.emit('exit', 0, 'SIGTERM');
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));

  assert.equal(forkedChildren.length, 2);
  const child1 = forkedChildren[1];

  // 커밋 락이 풀리자마자 대기 중이던 두 번째 retry() 가 이번엔 child1(첫 번째가 막 띄운 자식)을
  // 넘겨받아 정리한다 — 두 자식이 동시에 살아있는 상태가 만들어지지 않는다.
  assert.deepEqual(child1.killCalls, ['SIGTERM']);
  child1.emit('exit', 0, 'SIGTERM');

  await retry1;
  await retry2;

  assert.equal(forkedChildren.length, 3);
  const child2 = forkedChildren[2];
  assert.equal(supervisor.getState(), 'online');

  // 앞선 두 자식은 실제로 종료됐고(고아 아님), 마지막 자식만 살아있다.
  assert.equal(child0.exitCode, 0);
  assert.equal(child1.exitCode, 0);
  assert.equal(child2.exitCode, null);

  const stopPromise = supervisor.stop();
  assert.deepEqual(child2.killCalls, ['SIGTERM']);
  child2.emit('exit', 0, 'SIGTERM'); // 실제 프로세스가 종료됐다고 알린다
  await stopPromise;

  const aliveCount = forkedChildren.filter((c) => c.exitCode === null).length;
  assert.equal(aliveCount, 0); // stop() 이후 살아있는(고아) 자식이 없어야 한다
});

test('TC-TOPO-17: 낡은 start() 가 세대 불일치로 빠질 때(헬스 성공이어도) 자신이 fork한 자식을 정리하고, 리스너도 해제한다', async () => {
  // TC-TOPO-15 는 "낡은 start() 의 헬스가 실패로 뒤늦게 돌아오는" 경우만 다룬다. 여기서는
  // 낡은 start() 의 헬스가 성공(ok=true)으로 뒤늦게 돌아오는 경우까지 포함해, 세대 불일치 가드가
  // 자신이 만든 자식을 방치(orphan)하지 않고 정리(및 리스너 해제)하는지 확인한다.
  const forkedChildren = [];
  const states = [];
  let healthCallCount = 0;
  let firstHealthResolve;

  const fork = () => {
    const c = makeFakeChild();
    forkedChildren.push(c);
    return c;
  };
  const findPort = async () => 3000;
  // 첫 번째 헬스체크(낡은 start#1)는 테스트가 직접 resolve 할 때까지 멈춰 있는다.
  const waitForHealth = async () => {
    healthCallCount += 1;
    if (healthCallCount === 1) {
      return new Promise((resolve) => {
        firstHealthResolve = resolve;
      });
    }
    return true;
  };
  const healthUrl = (port) => `http://127.0.0.1:${port}/api/health`;
  const timers = makeFakeTimers();

  const supervisor = createBackendSupervisor({
    entryPath: '/fake/entry.js',
    findPort,
    fork,
    waitForHealth,
    healthUrl,
    onState: (payload) => states.push(payload),
    log: { error() {}, log() {} },
    setTimeoutFn: timers.setTimeoutFn,
    clearTimeoutFn: timers.clearTimeoutFn,
  });

  // start#1: child0 fork, 헬스체크가 응답하지 않는 상태로 멈춰 있다.
  const start1 = supervisor.start();
  await new Promise((r) => setImmediate(r));
  assert.equal(forkedChildren.length, 1);
  const child0 = forkedChildren[0];

  // child0 이 곧바로 크래시한다 — 자동 재기동(start#2)이 앞질러 진행된다.
  child0.emit('exit', 1, null);
  assert.equal(timers.scheduled.filter((s) => !s.fired && !s.cancelled).length, 1);

  timers.fireNext();
  await new Promise((r) => setImmediate(r));
  assert.equal(forkedChildren.length, 2);
  assert.equal(supervisor.getState(), 'online');
  const child1 = forkedChildren[1];

  // 이제서야 start#1 의 헬스체크가(낡은 결과로) "성공"을 반환한다 — 성공이어도 이미 최신이
  // 아니므로 online 상태를 되돌리거나 child1 을 건드리면 안 된다.
  firstHealthResolve(true);
  const result1 = await start1;

  assert.equal(result1, false); // 낡은 결과는 무시되고 항상 false 를 반환한다
  assert.equal(supervisor.getState(), 'online'); // child1 이 만든 online 상태가 유지된다
  assert.deepEqual(child1.killCalls, []); // 정상 가동 중인 child1 은 건드리지 않는다

  // 낡은 start#1 이 만든 child0 은 이미 자기 크래시로 죽어 있었지만(exitCode 확정), 세대
  // 불일치 가드가 통과하며 남아있던 exit 리스너까지 마저 정리해야 한다 — 그래야 나중에 실수로
  // 같은 인스턴스에 exit 이 다시 전달돼도(테스트 목적의 재현) 재기동 로직이 잘못 발동하지 않는다.
  assert.equal(child0.listenerCount('exit'), 0);
});

test('TC-TOPO-18: start() 가 terminateChild 대기 중일 때 stop() 호출 → 옛 자식 exit 통지 후 fork 0회, 살아있는 자식 0', async () => {
  // 4차 수정 회귀 재현: "재시도" 로 start() 가 이전 자식을 정리(terminateChild)하려고 대기하는
  // 바로 그 사이 Cmd+Q 로 stop() 이 걸리는 시나리오. 커밋 락은 start() 끼리만 직렬화하고 stop()
  // 은 참여하지 않으므로, start() 가 무조건 stopped(구 quitting) 를 되돌리면 옛 자식이 종료된 뒤
  // start() 가 그대로 findPort → fork 까지 진행해 새 자식이 고아로 남을 수 있었다.
  const { supervisor, forkedChildren } = makeSupervisorHarness();

  await supervisor.start();
  assert.equal(forkedChildren.length, 1);
  const child0 = forkedChildren[0];

  // "재시도" — start() 가 child0 정리를 위해 terminateChild 에 진입해 대기한다(아직 exit 전).
  const retryPromise = supervisor.retry();
  assert.deepEqual(child0.killCalls, ['SIGTERM']);
  assert.equal(forkedChildren.length, 1); // 아직 새로 fork 하지 않음

  // 이 사이 사용자가 앱을 종료한다.
  const stopPromise = supervisor.stop();

  // 옛 자식이 이제야 실제로 종료됐다고 알린다 — start() 와 stop() 양쪽의 대기를 모두 깨운다.
  child0.emit('exit', 0, 'SIGTERM');

  await Promise.all([retryPromise, stopPromise]);

  // stop() 이 개입했으므로 findPort/fork 가 더 진행되지 않아야 한다: fork 총 횟수는 여전히 1.
  assert.equal(forkedChildren.length, 1);

  // 살아있는(exitCode 가 아직 확정되지 않은) 자식이 없어야 한다 — 고아 0.
  const aliveCount = forkedChildren.filter((c) => c.exitCode === null).length;
  assert.equal(aliveCount, 0);
});
