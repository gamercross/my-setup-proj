# ADR-0010: Vite dev 서버 vs 빌드 산출물 로드

- 상태: **제안** (2026-09-02) — 결정 필요, B1(Week 2~3) 착수 전
- 관련: FR-UI-02, [ADR-0001](ADR-0001-frontend-react-vite.md)

## 맥락
Electron `main.js` 가 렌더러를 어떻게 로드할지:
1. 항상 빌드 산출물(`dist/index.html`)을 `loadFile`
2. 항상 Vite dev 서버(`http://localhost:5173`)를 `loadURL`
3. `NODE_ENV` 로 분기 — dev 는 dev 서버, prod 는 산출물

## 제안
**3번 — `NODE_ENV` 분기.** `npm run dev` 는 Vite dev 서버 + `loadURL`(HMR), `npm start`/패키징은 `dist/` 빌드 + `loadFile`.

## 근거
- 개발 중 HMR 이 없으면 반복이 느리다.
- 배포 앱이 dev 서버에 의존하면 안 된다.
- `main.js` 에 `if (!app.isPackaged && process.env.NODE_ENV !== 'production')` 수준의 간단한 분기로 충분.

## 미결
- dev 서버 포트 고정값(5173) vs 동적 탐지.
- dev 에서 CSP 를 어떻게 완화할지 (dev 전용 `connect-src ws://localhost:5173` 등) — [UI_SPEC.md](../UI_SPEC.md) §7.
- `vite build` 산출물 경로(`dist/`)와 `main.js` 의 `loadFile` 상대경로 정합.
