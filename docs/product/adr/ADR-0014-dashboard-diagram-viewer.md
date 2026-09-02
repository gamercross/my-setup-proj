# ADR-0014: 대시보드 다이어그램 뷰어

- 상태: **제안** (2026-09-03) — Phase C1(CORS·미들웨어) 완료 후 착수 예정
- 관련: FR-UI-05, [ADR-0004](ADR-0004-front-back-http-rest.md), [ADR-0013](ADR-0013-dashboard-agent-queue.md), [DIAGRAMS.md](../../setup/DIAGRAMS.md), [DESIGN.md](../DESIGN.md) §8

## 맥락
`docs/**/*.md` 안에 20개 넘는 Mermaid 다이어그램(목표 아키텍처, 로드맵 gantt, 오케스트레이션
상태 그래프, 모듈 의존 관계 등)이 있지만, **저장소를 열어야만** 볼 수 있다. "프로젝트가
지금 어디까지 왔는가"를 앱 안에서 그림으로 보고 싶다는 요구(FR-UI-05)가 나왔다.

정해야 할 것:
1. 다이어그램 원천(`docs/*.md` 의 mermaid 블록)을 프론트가 어떻게 얻는가.
2. 렌더링을 무엇으로 하는가 — CSP·번들 크기 제약 안에서.
3. 패키지(배포) 빌드에 `docs/` 를 동봉하는가.

제약:
- prod CSP(`frontend/src/index.html`): `script-src 'self'; style-src 'self' 'unsafe-inline';
  connect-src 'self' http://localhost:3000`.
- 프론트 Vite `root` 는 `frontend/src/` — `../../docs` 를 직접 import 하기 어렵고,
  prod 는 `dist/` 산출물만 로드([ADR-0010](ADR-0010-vite-dev-vs-build.md)).
- 계층 고정: `routes → services → db` (DESIGN §1). 라우트에 로직·IO 금지.
- 번들 크기는 Week 13 최적화 대상(NFR-PERF).

## 결정
**백엔드 `GET /api/diagrams` 가 `docs/**/*.md` 를 읽어 Mermaid 블록을 반환하고, 프론트는
`mermaid` 를 동적 import 하여 클라이언트에서 SVG 로 렌더한다.**

- **소스**: `backend/src/services/diagrams.js` 가 저장소 루트의 `docs/` 를 glob(`docs/**/*.md`),
  ```` ```mermaid ```` 펜스를 파싱해 `[{ doc, index, title, code }]` 반환.
  `title` = 블록 직전 최근접 heading 텍스트. `routes/diagrams.js` 는 서비스 호출만.
- **렌더**: `frontend/src/components/DiagramPanel.jsx` 가 패널 진입 시 `import('mermaid')`
  (코드 스플릿), `mermaid.initialize({ startOnLoad: false, theme: 'dark',
  securityLevel: 'strict' })` 후 블록별 `mermaid.render()`.
- **CSP**: 추가 완화 없음. mermaid 는 Vite 번들이라 `script-src 'self'` 로 실행되고,
  주입하는 `<style>` 은 기존 `style-src 'unsafe-inline'` 로 커버된다. `connect-src` 는
  `http://localhost:3000` 이 이미 허용.
- **CORS**: `/api/diagrams` 도 C1 에서 도입하는 `cors`(로컬 오리진 화이트리스트)를 그대로 탄다.
  따라서 이 기능은 **C1 이후**에 착수한다.
- **prod 동봉**: 패키지 빌드에 `docs/` 를 `extraResources` 로 동봉하고, 서비스는 dev 는
  저장소 루트, 패키지는 `process.resourcesPath/docs` 를 본다. `docs/` 를 못 찾으면
  빈 배열(200)로 응답 — 앱이 죽지 않는다.
- **읽기 전용**: 이 엔드포인트는 파일시스템 read 만 한다. DB·쓰기·에이전트 관여 없음.

## 근거
- 백엔드 소스는 **라이브**다(문서 고치면 즉시 반영). 빌드타임 수집은 재빌드 전까지 stale.
- `services/` 계층에 파일 IO 를 두는 것은 외부 API 캐시([ADR-0006](ADR-0006-agent-owns-external-apis.md))와
  같은 패턴이라 일관적이다.
- 클라이언트 렌더는 줌·패닝·복사 등 인터랙션을 열어 두고, 사전 렌더 SVG 방식이 요구하는
  Chromium(`@mermaid-js/mermaid-cli`) 의존과 복사 파이프라인을 피한다.
- 동적 import 로 mermaid(~2–3MB)가 초기 대시보드 번들에 들어가지 않는다.
- 향후 [ADR-0013](ADR-0013-dashboard-agent-queue.md) 방향(에이전트가 코드 스캔으로
  의존 그래프 자동 생성)으로 갈 때, 같은 `/api/diagrams` 응답 형태에 소스만 추가하면 된다.

## 대안
- **빌드타임 수집(Vite 플러그인이 docs → JSON 에셋)**: 백엔드·CORS 불필요하나 stale,
  Electron prod 는 재빌드해야 갱신. 탈락.
- **사전 렌더 SVG 를 `<img>`**: `scripts/render-diagrams.sh` 산출물 사용. 번들은 가볍지만
  `docs/diagrams/` 가 `.gitignore` 대상이고 Chromium 이 필요하며 인터랙션이 없다. 탈락.
- **프론트가 `docs/` 를 직접 읽기**: Vite `root`/Electron 파일 접근 경계상 복잡, 계층 위반.
- **mermaid 를 CDN 에서 로드**: 오프라인 우선(NFR-REL-04) 위배, CSP `script-src` 완화 필요.

## 결과 / 트레이드오프
- 신규 파일: `backend/src/services/diagrams.js`, `backend/src/routes/diagrams.js`,
  `backend/test/diagrams.test.js`, `frontend/src/components/DiagramPanel.jsx`.
- 수정: `backend/src/routes/api.js`(`/diagrams` 연결), `frontend/src/components/Dashboard.jsx`
  (패널 추가), `frontend/package.json`(`mermaid` dependency), `frontend/src/api/client.js`
  (`getDiagrams()` — B3 에서 만드는 client 재사용), `electron-builder` 설정(`extraResources`).
- 프론트 번들: mermaid 는 별도 청크. 패널을 처음 열 때 한 번 로드.
- 유지보수 부담: mermaid 파서/문법 버전이 GitHub 렌더러와 어긋나면 일부 다이어그램이
  뷰어에서만 깨질 수 있다 — 렌더 실패는 블록 단위로 잡아 "이 다이어그램을 그릴 수
  없습니다 + 원문 코드" 로 폴백한다.
- **재검토 조건**: (a) 번들/성능이 문제되면 사전 렌더 SVG 로 회귀, (b) 자동 생성 맵(ADR-0013)
  이 채택되면 소스 계층을 이 엔드포인트로 흡수할지 결정.
- 이번 범위 밖(후속): 다이어그램 위에 Phase 진행 상태 오버레이(→ FR-UI-05 후속, 별도
  `docs/progress/status.json` 단일 원천 필요), 코드 스캔 기반 자동 의존 그래프.
