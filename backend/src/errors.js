// 오류 판정·변환 헬퍼 (라우트 공통)
//
// 두 종류의 오류를 400(클라이언트 입력 오류)으로 취급한다.
//  1) 라우트/DB 계층이 던지는 일반 Error — 메시지에 '필수' 또는 '0~100' 이 포함
//  2) better-sqlite3 의 제약 위반 (CHECK / NOT NULL / FOREIGN KEY)
//
// 클라이언트에는 SQLite 영문 원문을 절대 노출하지 않는다 (한국어 메시지로 치환).

// 400 으로 매핑할 SQLite 제약 위반 코드
const CLIENT_SQLITE_CODES = new Set([
  'SQLITE_CONSTRAINT_CHECK',
  'SQLITE_CONSTRAINT_NOTNULL',
  'SQLITE_CONSTRAINT_FOREIGNKEY',
]);

// 검증(400) 오류인지 판정한다
function isValidationError(err) {
  if (!err) return false;
  if (err.code && CLIENT_SQLITE_CODES.has(err.code)) return true;
  return /필수|0~100/.test(err.message || '');
}

// 400 응답 본문에 담을 한국어 메시지를 만든다
function toClientMessage(err) {
  if (err && err.code) {
    switch (err.code) {
      case 'SQLITE_CONSTRAINT_CHECK':
        return '입력값이 허용된 값 범위를 벗어났습니다.';
      case 'SQLITE_CONSTRAINT_FOREIGNKEY':
        return '연결할 프로젝트를 찾을 수 없습니다.';
      case 'SQLITE_CONSTRAINT_NOTNULL':
        return '필수 값이 누락되었습니다.';
      default:
        break;
    }
  }
  // 일반 Error 는 기존 메시지 문자열을 그대로 보존한다 (TC-PROJ-02/03 등)
  return (err && err.message) || '잘못된 요청입니다.';
}

module.exports = { isValidationError, toClientMessage };
