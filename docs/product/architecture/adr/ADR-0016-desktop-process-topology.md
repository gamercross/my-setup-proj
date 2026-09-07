# ADR-0016: 데스크톱 프로세스 토폴로지 (백엔드 실행 주체)

- 상태: 제안 (2026-09-03) — Week 5, 패키징 전 확정
- 관련: [RUNTIME_VIEW.md](../RUNTIME_VIEW.md) §5, NFR-REL-06, NFR-PORT-01, README "앱 실행" 미정 항목

## 맥락
Electron·Express·에이전트는 독립 프로세스다([ADR-0015](ADR-0015-local-first-architecture.md)). 현재 개발자가 백엔드를 별도 터미널로 직접 띄운다. 패키징된 앱에서 백엔드를 누가·어떻게 실행하는지, 죽으면 어떻게 하는지 정해진 바 없다.

## 결정 (제안)
1. **개발 모드:** `frontend` 의 `npm run dev` 가 `concurrently` 로 Vite + Electron + `backend/npm start` 를 함께 띄운다. (기존 "터미널 2개" 는 선택지로 유지)
2. **패키징 앱:** Electron `main.js` 가 백엔드를 `child_process.fork` 로 자식 프로세스로 기동. `/api/health` 200 확인 후 창 표시. 앱 종료 시 자식도 종료.
3. **백엔드 비정상 종료:** main 이 최대 3회 재기동(지수 백오프). 초과 시 전역 `ErrorBanner` + "재시도" 버튼.
4. **포트 충돌:** 3000/5173 사용 중이면 다음 빈 포트 사용, `preload.apiBaseUrl` 로 렌더러에 전달(하드코딩 제거).

## 근거
- 개발자가 백엔드를 잊어 "전부 에러" 상태로 혼란을 겪는 일을 없앤다.
- 자식 프로세스 방식은 코드 분리(별 저장소 구조)를 유지하면서 배포는 단일 앱으로.
- 인프로세스 임베드(대안)는 Express 예외가 Electron main 을 위협 → ASR-2 와 충돌.

## 대안
- **계속 완전 분리(사용자가 항상 수동 실행):** 패키징 앱에서 비현실적.
- **Express 를 Electron main 에 임베드:** 프로세스 격리 상실, 크래시 전파.
- **백엔드를 OS 서비스로 설치:** 설치 복잡도·권한 문제, 크로스 플랫폼 부담.

## 결과 / 트레이드오프
- main.js 복잡도 증가(자식 수명주기·헬스체크·재기동). `frontend/test` 에 스모크 필요.
- 자식 백엔드의 stdout/stderr 를 파일 로그로 리다이렉트해야 함(NFR-DEPLOY-04).
- 에이전트는 여전히 이 토폴로지 밖(launchd) — 변경 없음.
- 재검토: Stage 3(서버측 배포)로 가면 백엔드가 클라우드로 이동, 이 ADR 폐기.

## 실패·종료 정책 (후속, 2026-09-07)

> 이 절만 **구현됨(백엔드 측)** — 나머지 결정은 "제안" 유지.

- **미처리 예외(`uncaughtException`):** 기존 로그 정책(1줄 + 스택)대로 기록한 뒤 열린 HTTP 서버 close → SQLite WAL 체크포인트·close → `process.exit(1)`. 프로세스를 오염된 상태로 유지하지 않는다. 재기동은 감독자(Electron main, 위 결정 3항)의 책임이다.
- **종료 신호(`SIGTERM`/`SIGINT`):** 같은 종료 절차 + `exit 0`.
- **`unhandledRejection`:** 기존 동작 유지 — 로그만 남기고 종료하지 않는다 (회귀 방지).
- 종료 절차는 멱등하며, 서버 close 가 5s 안에 안 끝나면 강제 종료한다.
- 구현: `backend/src/lifecycle.js`, 배선 `backend/src/server.js`, 검증 `backend/test/lifecycle.test.js` (TC-REL-01~06).
