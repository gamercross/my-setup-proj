// 백엔드 포트 탐색 (ADR-0016 결정 4항)
// - start~start+count-1 범위를 순차 탐색해 첫 빈 포트를 반환한다.
// - listen-probe 방식은 TOCTOU 여지가 있다(탐색 시점~자식 bind 시점 사이 다른 프로세스가 선점 가능).
//   자식이 EADDRINUSE 로 즉시 죽으면 backendSupervisor 가 재기동마다 이 함수를 다시 호출해 재탐색한다.

const net = require('net');

function findFreePort({
  start = 3000,
  count = 11,
  host = '127.0.0.1',
  createServer = net.createServer,
} = {}) {
  return new Promise((resolve, reject) => {
    let port = start;
    let tries = 0;

    const tryNext = () => {
      if (tries >= count) {
        reject(new Error('사용 가능한 백엔드 포트를 찾지 못했습니다 (3000~3010).'));
        return;
      }
      tries += 1;

      let server;
      try {
        server = createServer();
      } catch (err) {
        reject(err);
        return;
      }

      server.once('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
          port += 1;
          tryNext();
          return;
        }
        // 권한 오류 등은 재시도해도 소용없으므로 즉시 reject
        reject(err);
      });

      server.once('listening', () => {
        const boundPort = port;
        server.close(() => resolve(boundPort));
      });

      server.listen(port, host);
    };

    tryNext();
  });
}

module.exports = { findFreePort };
