# ADR-0017: REST 오류 응답 계약 (RFC 9457 스타일)

- 상태: 채택 (2026-09-16, 제안 2026-09-03)
- 관련: NFR-SEC-07, [CROSSCUTTING.md](../CROSSCUTTING.md) §2, `backend/src/errors.js` (C2), `backend/src/problem.js`, [API_REFERENCE.md](../../reference/API_REFERENCE.md)

## 맥락
현재 오류 응답은 `{ "error": "메시지" }` + 상태코드뿐이다. 클라이언트가 오류 종류를 구분하려면 한국어 문자열을 매칭해야 한다 — 취약하고, 다중 사용자/동기화 단계에서 오류 분기가 늘면 깨진다.

## 결정
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

- `type`: 안정적인 기계용 코드. 확정 집합(6종) — `validation_error`(400), `not_found`(404), `conflict`(409, 예약 — 현재 발생원 없음), `payload_too_large`(413), `upstream_unavailable`(503), `internal_error`(500). **type → status 는 1:1 불변식** — 하나의 type 이 두 status 를 갖지 않는다(그래서 413 은 `validation_error` 에 얹지 않고 별도 type 으로 뺐다).
- `title`/`detail`: 사람이 읽는 한국어(`title` 은 type 별 고정 문구, `detail` 은 상황별 구체 메시지). `errors[]`: 필드 단위(폼 표시용) — 필드명을 아는 지점(예: title/name/progress/project_id/limit/from/to/weeks 등)에서만 채우고, SQLite 제약 위반처럼 필드를 특정할 수 없는 경우는 생략한다.
- 5xx 는 `detail` 에 내부 정보·스택·SQLite 원문 금지 → 로그에만, 응답엔 `request_id`.
- `Content-Type: application/problem+json`.
- 기존 `errors.js` 의 `isValidationError`/`toClientMessage`(SQLite 제약 판정·`/필수|0~100/` 정규식 포함)는 그대로 유지하고, `backend/src/problem.js` 가 그 위에 이 포맷터를 얹는다. `ConflictError`/`UpstreamUnavailableError` 클래스를 `errors.js` 에 추가했다(각각 409/503).

### request_id
- 형식: `r-YYYYMMDD-<hex8>` (`crypto.randomBytes(4).toString('hex')`, 새 의존성 없음).
- `backend/src/middleware/requestId.js` 가 체인 최상단(requestLogger 보다 앞)에서 부여한다.
- 클라이언트가 `X-Request-Id` 를 보내면 `^[A-Za-z0-9._-]{1,64}$` 를 통과할 때만 그대로 채택하고, 아니면 새로 발급한다(헤더 인젝션 방지).
- `req.requestId` 에 저장 + 응답 헤더 `X-Request-Id` 로 에코. `requestLogger` 의 로그 줄 끝에도 붙는다.

### 배선 방식 — "중앙 포맷터 + 라우트가 호출"
기존 관례(라우트가 상태코드를 결정)를 유지한다. `backend/src/problem.js` 의 `sendProblem(res, type, opts)` 이 JSON 생성·헤더 설정을 단일 지점에서 하고, 각 라우트가 그 함수를 호출한다. 서비스 오류(404/400/500) 판정은 `sendServiceError(err, res, {...})` 가 7개 라우트에 복붙돼 있던 `handleError` 를 대체하는 유일본이다. 모든 라우트를 `next(err)` 로 바꾸는 대안은 diff 가 과다하고 기존 동기 try/catch 구조를 훼손해 채택하지 않았다.

### payload_too_large 를 별도 type 으로 둔 이유
`errorHandler` 의 body-parser `entity.too.large`(413)를 처음엔 `validation_error`(400)에 합치는 안도 검토했으나, type→status 1:1 불변식이 깨진다. 그래서 6번째 type 으로 분리했다.

### docs.js 경로 탈출 시도의 type
`services/docs.js` 의 `resolveDocPath` 는 형태 위반(`..`·절대경로·허용 밖 루트 등, 탈출 시도 포함)을 400, 파일을 찾지 못한 경우(심링크 탈출 대상 포함)를 404 로 이미 분류해 왔다. 이번 변경에서도 그 `code`(400/404) 를 그대로 `validation_error`/`not_found` 에 매핑할 뿐, 별도의 `path_traversal` type 은 만들지 않는다. 탈출 시도 전용 type 을 노출하면 "이 요청이 탈출 시도로 감지됐다"는 정보를 공격자에게 알려주게 되므로, 기존과 같은 정보 은닉 의도를 유지한다.

## 근거
- 클라이언트가 `type` 으로 분기 → 문자열 매칭 제거.
- 표준 형식이라 학습·툴 지원 이점.
- `request_id` 로 사용자 신고 ↔ 서버 로그 연결.

## 대안
- **현행 `{error}` 유지:** 단순하나 확장성 없음.
- **GraphQL 식 `errors[]` 배열:** REST 관례와 안 맞음.
- **HTTP 상태코드만:** 같은 400 안에서 세부 구분 불가.
- **모든 라우트를 `next(err)` 로 전환:** 더 "Express 다운" 구조지만 이번 변경 범위에서 diff 가 과도해 보류.

## 결과 / 트레이드오프
- 모든 라우트·`errorHandler`·프론트 `api/client.js`·`api/demoClient.js` 파싱을 한 번에 바꿨다.
- [API_REFERENCE.md](../../reference/API_REFERENCE.md) 의 모든 오류 예시 갱신.
- `type` 값은 한번 공개하면 계약 — 신중히 추가, 제거는 major 변경 취급. `PROBLEM_TYPES` 표를 단위 테스트(`backend/test/errorContract.test.js`)로 고정해 오타·누락을 방지한다.
- 프론트는 1차로 `client.js` 파싱만 갱신했다(`type/title/detail/status/fieldErrors/requestId` 부착). `type` 기반 분기 로직 확장은 이번 범위 밖 — 스토어의 `error` 문자열 표시 동작은 기존과 동일하다(회귀 없음).
- 하위 호환을 위한 `error` 키 병기는 하지 않는다 — 백엔드·프론트가 한 리포에서 함께 빌드·배포되어 버전 스큐가 없다.
