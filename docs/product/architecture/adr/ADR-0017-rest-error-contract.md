# ADR-0017: REST 오류 응답 계약 (RFC 9457 스타일)

- 상태: 제안 (2026-09-03)
- 관련: NFR-SEC-07, [CROSSCUTTING.md](../CROSSCUTTING.md) §2, `backend/src/errors.js` (C2), [API_REFERENCE.md](../../reference/API_REFERENCE.md)

## 맥락
현재 오류 응답은 `{ "error": "메시지" }` + 상태코드뿐이다. 클라이언트가 오류 종류를 구분하려면 한국어 문자열을 매칭해야 한다 — 취약하고, 다중 사용자/동기화 단계에서 오류 분기가 늘면 깨진다.

## 결정 (제안)
오류 응답을 RFC 9457(Problem Details) 스타일로 확장한다.

```json
{
  "type": "validation_error",
  "title": "입력이 올바르지 않습니다",
  "status": 400,
  "detail": "progress 는 0~100 이어야 합니다",
  "errors": [{ "field": "progress", "message": "0~100" }],
  "request_id": "r-20260903-abc123"
}
```

- `type`: 안정적인 기계용 코드. 초기 집합: `validation_error`, `not_found`, `conflict`, `internal_error`, `upstream_unavailable`.
- `title`/`detail`: 사람이 읽는 한국어. `errors[]`: 필드 단위(폼 표시용).
- 5xx 는 `detail` 에 내부 정보·스택·SQLite 원문 금지 → 로그에만, 응답엔 `request_id`.
- `Content-Type: application/problem+json`.
- 기존 `errors.js` 의 `isValidationError`/`toClientMessage` 는 유지하고 그 위에 이 포맷터를 얹는다.

## 근거
- 클라이언트가 `type` 으로 분기 → 문자열 매칭 제거.
- 표준 형식이라 학습·툴 지원 이점.
- `request_id` 로 사용자 신고 ↔ 서버 로그 연결.

## 대안
- **현행 `{error}` 유지:** 단순하나 확장성 없음.
- **GraphQL 식 `errors[]` 배열:** REST 관례와 안 맞음.
- **HTTP 상태코드만:** 같은 400 안에서 세부 구분 불가.

## 결과 / 트레이드오프
- 모든 라우트·`errorHandler`·프론트 `api/client.js` 파싱을 한 번에 바꿔야 함 → C 단계 초에 일괄.
- [API_REFERENCE.md](../../reference/API_REFERENCE.md) 의 모든 오류 예시 갱신.
- `type` 값은 한번 공개하면 계약 — 신중히 추가, 제거는 major 변경 취급.
