// 이메일(mail) 서비스 계층 — FR-MAIL-01 (조회 API)
// - 데이터 원천은 `emails` 캐시 테이블이다 (에이전트가 `agent/sync.py` 로 채운다, ADR-0011).
//   백엔드는 SELECT 만 한다 — 보내기·읽음 처리·외부 호출 없음.
// - 캐시가 비어 있으면 빈 목록. 오류 아님.

const db = require('../db');

// 미읽음 메일 목록 (received_at 최신순, 기본 50건).
function listUnread({ limit } = {}) {
  return db.getUnreadEmails({ limit });
}

module.exports = { listUnread };
