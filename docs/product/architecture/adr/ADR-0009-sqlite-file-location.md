# ADR-0009: SQLite 파일 위치

- 상태: 채택 (2026-09-02)
- 관련: FR-TASK-05, [ADR-0002](ADR-0002-local-db-better-sqlite3.md), [ADR-0011](ADR-0011-agent-backend-db-access.md)

## 맥락
SQLite 파일을 어디에 둘지. 후보: ① `backend/data/app.db` (저장소 안) ② Electron `app.getPath('userData')` ③ 환경변수로 지정.

## 결정
**경로는 환경변수 `DATABASE_PATH` 로 주입한다. 코드에 하드코딩하지 않는다** (NFR-PORT-03).
- 백엔드 단독 실행 기본값: `backend/data/app.db` (`.gitignore` 의 `*.db` 로 제외됨).
- Electron 패키지 실행: `main.js` 가 `app.getPath('userData')/app.db` 를 `DATABASE_PATH` 로 넘긴다.
- 에이전트(`agent/db.py`)도 같은 환경변수를 읽는다. 미설정 시 백엔드와 동일한 기본 경로 계산.

## 근거
- 개발 중엔 저장소 안이 확인·삭제(스키마 변경 시)에 편하다.
- 배포 앱이 저장소·패키지 리소스에 쓰면 권한 문제가 생긴다 → `userData` 가 표준.
- 백엔드가 Electron 없이도 떠야 하므로([ADR-0004](ADR-0004-front-back-http-rest.md)) 주입식이 맞다.

## 대안
- 저장소 안 고정: 배포 시 깨진다.
- `userData` 고정: 백엔드 단독 테스트가 불편하다.

## 결과 / 트레이드오프
- `backend/db/index.js`(better-sqlite3 래퍼)와 `agent/db.py` 가 `DATABASE_PATH` 를 읽는 공통 규약 필요.
- `.env.example` 에 `DATABASE_PATH=` (주석: 비우면 `backend/data/app.db`) 추가.
- `backend/data/` 디렉터리는 `.gitkeep` 로만 커밋, `*.db` 는 무시.
