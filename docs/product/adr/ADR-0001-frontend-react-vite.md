# ADR-0001: 프론트 렌더링을 React + Vite 로 통일

- 상태: 채택 (2026-09-02)
- 관련: FR-UI-02, [AS_IS.md](../AS_IS.md) G1

## 맥락
`frontend/src/` 에 `renderer.js`(바닐라 JS로 문자열 HTML 삽입)와 `App.jsx`/`components/*`(React) 가 서로 무관하게 존재한다. 번들러가 없어 React 트리는 실행 경로에 못 들어간다. 둘 중 하나로 정리해야 한다.

## 결정
`renderer.js` 를 제거하고 React 로 통일한다. 번들러는 **Vite** 를 쓴다. `renderer.jsx` 가 `createRoot(#root).render(<App/>)` 로 마운트한다.

## 근거
- `App.jsx`, `Dashboard.jsx`, `TaskList.jsx`, `ProjectCard.jsx` 가 이미 props 인터페이스까지 작성돼 있어 재사용 가치가 크다.
- Vite 는 설정이 가볍고 HMR 개발 경험이 좋다. 강의 Week 4(Node/웹서버)와도 맞는다.
- ARCHITECTURE.md 가 이미 React + Vite 를 기술 스택으로 명시.

## 대안
- **바닐라 유지**: 컴포넌트 재사용·상태관리 확장이 어렵다.
- **Webpack**: 설정 부담이 크다.
- **esbuild 직접**: HMR·플러그인 생태계가 Vite 보다 약하다.

## 결과 / 트레이드오프
- `frontend/package.json` 에 `vite`, `@vitejs/plugin-react` devDependency 와 `dev`/`build` 스크립트 추가.
- Electron 로드 방식이 dev/prod 로 갈린다 → [ADR-0010](ADR-0010-vite-dev-vs-build.md).
- `index.html` CSP 수정 필요(`connect-src`, dev 서버 허용) — [UI_SPEC.md](../UI_SPEC.md) §7.
