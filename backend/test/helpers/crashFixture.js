// C1 통합 테스트용 자식 프로세스 픽스처 (TC-REL-06).
// 프로덕션 앱에 크래시 라우트를 넣지 않기 위해 별도 진입점으로 분리한다.
// 수명주기 핸들러 등록 후 비동기 예외를 던져 uncaughtException 경로를 실행한다.

const { registerProcessHandlers } = require('../../src/lifecycle');

registerProcessHandlers({ server: null });

// 핸들러 등록이 끝난 다음 틱에 예외를 던진다 → uncaughtException → 로그 후 exit 1
setImmediate(() => {
  throw new Error('crashFixture 의 의도된 예외');
});
