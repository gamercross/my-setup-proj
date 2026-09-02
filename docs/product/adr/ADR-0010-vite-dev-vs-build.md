# ADR-0010: Vite dev 서버 vs 빌드 산출물 로드

- 상태: 채택 (2026-09-02)
- 관련: FR-UI-02, [ADR-0001](ADR-0001-frontend-react-vite.md)

## 맥락
Electron `main.js` 가 렌더러를 어떻게 로드할지: ① 항상 `dist/index.html` `loadFile` ② 항상 Vite dev 서버 `loadURL` ③ `NODE_ENV` 분기.

## 결정
**`NODE_ENV` 로 분기한다.**
- `npm run dev` (`NODE_ENV=development`): Vite dev 서버(`http://localhost:5173`) 를 `loadURL`, HMR 사용.
- `npm start` / 패키징: `vite build` 산출물 `frontend/dist/index.html` 을 `loadFile`.
- 판정식: `!app.isPackaged && process.env.NODE_ENV !== 'production'` → dev 서버.
- Vite 포트는 `5173` 고정(`vite.config.js` `server.port`, `strictPort: true`). `main.js` 도 같은 상수.

## 근거
- HMR 없이는 UI 반복이 느리다.
- 배포 앱이 dev 서버에 의존하면 안 된다.
- 분기는 `main.js` 한 곳의 `if` 하나로 끝난다.

## 대안
- 빌드 산출물만: 개발 경험 나쁨.
- dev 서버만: 배포 불가.

## 결과 / 트레이드오프
- `index.html` CSP 를 dev/prod 로 나눠야 한다:
  - dev: `connect-src 'self' http://localhost:3000 ws://localhost:5173`, `script-src 'self' http://localhost:5173`
  - prod: `connect-src 'self' http://localhost:3000`, `script-src 'self'`
  - Vite 가 dev 에서 CSP 를 주입/완화하도록 설정하거나, 별도 `index.dev.html` 사용.
- `vite.config.js`: `base: './'`, `build.outDir: 'dist'`.
- `frontend/package.json` scripts: `dev` (vite + electron), `build` (vite build), `start` (electron .).
