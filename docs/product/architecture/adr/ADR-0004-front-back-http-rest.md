# ADR-0004: 프론트↔백엔드는 HTTP REST

- 상태: 채택 (2026-09-02)
- 관련: [AS_IS.md](../../vision/AS_IS.md) G3, [API_REFERENCE.md](../../reference/API_REFERENCE.md), 강의 Week 4(웹서버)

## 맥락
Electron 렌더러가 데이터를 받는 경로가 없다. 선택지는 (a) 백엔드 Express 를 HTTP 로 호출, (b) Electron IPC 로 메인 프로세스와 직접 통신.

## 결정
렌더러는 `http://localhost:{PORT}/api` 로 **HTTP REST** 호출한다. base URL 은 `preload.js` 가 `window.appInfo.apiBaseUrl` 로 노출한다.

## 근거
- 백엔드 로직을 Electron 밖(순수 Node 서버)에서도 재사용할 수 있다 — 향후 웹/모바일, Docker 배포.
- 강의의 Express·REST 실습과 직접 연결된다.
- API 를 `curl`/테스트로 독립 검증할 수 있다.

## 대안
- **Electron IPC 직결**: 백엔드가 Electron 에 묶여 재사용 불가. 배포 아키텍처(ARCHITECTURE.md)와 어긋난다.
- **GraphQL**: 이 규모엔 과하다.

## 결과 / 트레이드오프
- CORS 설정 필요 (로컬 오리진 화이트리스트, NFR-SEC-06) — Week 4 C1.
- `index.html` CSP 에 `connect-src` 허용 필요 — [UI_SPEC.md](../../reference/UI_SPEC.md) §7.
- 실시간 동기화(FR-SYNC-02)는 나중에 WebSocket 추가로 확장.
