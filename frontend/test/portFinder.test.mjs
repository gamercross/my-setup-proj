// 백엔드 포트 탐색 테스트 (TC-TOPO-01·02) — ADR-0016 결정 4항

import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import { findFreePort } from '../src/main/portFinder.js';

// 지정한 포트 집합만 EADDRINUSE 로 실패시키는 fake net.createServer
function makeFakeCreateServer(busyPorts) {
  return () => {
    const server = new EventEmitter();
    server.listen = (port) => {
      setImmediate(() => {
        if (busyPorts.has(port)) {
          const err = new Error('port in use');
          err.code = 'EADDRINUSE';
          server.emit('error', err);
        } else {
          server.emit('listening');
        }
      });
    };
    server.close = (cb) => cb && cb();
    return server;
  };
}

test('TC-TOPO-01: 3000 점유 시 3001 반환', async () => {
  const createServer = makeFakeCreateServer(new Set([3000]));
  const port = await findFreePort({ start: 3000, count: 11, createServer });
  assert.equal(port, 3001);
});

test('TC-TOPO-02: 3000~3010 전부 점유 → 한국어 메시지로 reject, 11회만 시도', async () => {
  const tried = [];
  const baseCreateServer = makeFakeCreateServer(
    new Set(Array.from({ length: 11 }, (_, i) => 3000 + i))
  );
  const createServer = () => {
    const server = baseCreateServer();
    const origListen = server.listen.bind(server);
    server.listen = (port) => {
      tried.push(port);
      origListen(port);
    };
    return server;
  };

  await assert.rejects(
    findFreePort({ start: 3000, count: 11, createServer }),
    /사용 가능한 백엔드 포트를 찾지 못했습니다/
  );
  assert.equal(tried.length, 11);
});
