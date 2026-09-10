# ADR-0026: 웹 데모 모드 — 정적 프로토타입을 GitHub Pages 로 배포

- 상태: 채택 (2026-09-07)
- 관련: FR-UI-01~05, FR-WIDGET-*, [ADR-0001](ADR-0001-frontend-react-vite.md), [ADR-0004](ADR-0004-front-back-http-rest.md), Phase D 이후

## 맥락
지금까지 만든 대시보드(위젯 셸·할일·프로젝트·캘린더·다이어그램·브리핑)는 **Electron 앱**으로만
실행된다. 개발 샌드박스에서 GUI 창을 띄울 수 없어 UI 가 한 번도 시각적으로 검증되지 않았고,
"프로토타입을 보여줄 수 있는 곳"(공유 가능한 URL)이 필요하다는 요구가 나왔다.

풀 스택(Electron + 백엔드 + SQLite + 에이전트)을 호스팅하는 것은 이 시점에 과하다. 필요한 것은
**화면과 상호작용을 보여주는 것**이지 실제 데이터·인증·영속이 아니다.

## 결정
프런트엔드에 **데모 빌드 모드**를 추가한다.

- `VITE_DEMO=1` 환경변수로 빌드하면(`npm run build:demo`) `frontend/src/api/client.js` 가
  네트워크 대신 **인메모리 목 어댑터**(`api/demoClient.js` + `api/demoData.js`)로 요청을 처리한다.
- 목 어댑터는 백엔드 라우트의 행복 경로 + 최소 검증을 흉내 낸다(할일·프로젝트 CRUD 포함).
  상태는 메모리에만 살고 **새로고침하면 초기화**된다.
- 정적 산출물(`frontend/dist`)을 **GitHub Pages** 로 배포한다
  (`.github/workflows/deploy-demo.yml`, `main` 의 `frontend/**` 변경 시).
  결과 URL: `https://<owner>.github.io/<repo>/`.
- Electron 빌드(`npm run build`)와 앱 동작은 **전혀 바뀌지 않는다**. `VITE_DEMO` 가 없으면
  `client.js` 는 종전대로 `window.appInfo.apiBaseUrl` 로 fetch 한다.
- 헤더에 "데모 모드 · 샘플 데이터" 배지를 노출해 실제 앱과 혼동을 막는다.

## 근거
- **분리 비용이 작다.** 결합 지점은 `client.js` 한 곳(그리고 헤더의 버전 문자열)뿐이다.
  라우팅·상태관리(zustand)·위젯 셸·`localStorage` 레이아웃은 브라우저에서 그대로 동작한다.
- 목 어댑터가 CRUD 를 처리하므로 데모에서 **실제로 클릭·추가·이동**해볼 수 있다 —
  정적 스크린샷보다 설득력 있다.
- `vite.config.js` 의 `base: './'`(상대 경로) 덕분에 Pages 하위 경로(`/repo/`)에서 수정 없이 뜬다.
- GitHub Pages 는 저장소에 이미 있고 별도 인증·비용이 없다.

## 대안
- **로컬 실행 + 스크린샷:** 지속 URL 이 없고, 매번 재현해야 한다.
- **Electron 패키지(.dmg):** 로컬 설치가 필요해 "링크로 보여주기" 가 안 된다.
- **풀 스택 배포(Render/Fly 등):** 인증·비용·에이전트 스케줄러까지 얹어야 해 과투자. E 단계에서 재검토.
- **`msw`(Mock Service Worker):** 서비스워커 등록·CSP 완화가 필요. 직접 어댑터가 더 단순하다.

## 결과 / 트레이드오프
- 목 데이터와 실제 백엔드 응답 스키마가 어긋날 수 있다 → 목은 `backend/src/db.js` 의 컬럼
  목록과 `scripts/seed-demo.js` 를 기준으로 맞추고, `demoClient.test.mjs` 로 최소 계약을 고정한다.
- 데모에는 다이어그램·메일·동기화 로그가 비어 있다(`{ diagrams: [] }` 등) — 해당 위젯은
  "없음" 상태로 표시된다. 필요 시 나중에 채운다.
- Pages 활성화(저장소 Settings → Pages → Source: GitHub Actions)는 **1회 수동 설정**이 필요하다.

## 부록: 경로 패리티 감사 (2026-09-09)

데모 목 어댑터(`demoClient.DEMO_ROUTES`)와 백엔드 라우터(`backend/src/routes/api.js`)의
**경로(method + path) 대조** 결과.

- **(A) 양쪽 존재:** 29건 — 정상.
- **(B) 데모에만 있음:** 0건.
- **(C) 백엔드에만 있음:** 4건 — 전부 프런트 미사용, 예외로 등록.

  | 경로 | 사유 |
  | --- | --- |
  | `GET /tasks/:id` | 프런트 미사용 (`useTaskStore` 는 목록만 조회) |
  | `GET /projects/:id` | 프런트 미사용 |
  | `GET /sync/health` | 프런트 미사용 (UI 는 `/agent/activity` 사용) |
  | `GET /docs` | 경로 누락 400 스텁 — 목 대상 아님 |

자동 검사 `scripts/check-demo-parity.mjs` 가 이 대조를 수행하고 `verify.sh`(▶ 데모 패리티 확인)에
편입되어 있다. 예외 목록(`BACKEND_ONLY_ALLOW`)이 실제와 어긋나면(썩은 예외 포함) 실패한다.

**shape 패리티(응답 필드·상태코드)는 이 검사의 범위 밖** — 후속 과제.
알려진 차이: `GET /health` 가 백엔드는 `{ ok: true }`, 데모는 `{ status: 'ok', demo: true }`.
