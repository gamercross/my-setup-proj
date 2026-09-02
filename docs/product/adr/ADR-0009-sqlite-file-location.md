# ADR-0009: SQLite 파일 위치

- 상태: **제안** (2026-09-02) — 결정 필요, B2(Week 5) 착수 전
- 관련: FR-TASK-05, [ADR-0002](ADR-0002-local-db-better-sqlite3.md)

## 맥락
SQLite 파일을 어디에 둘지 정해야 한다. 후보:
1. `backend/data/app.db` — 저장소 안
2. Electron `app.getPath('userData')` — OS 사용자 데이터 디렉토리
3. 환경변수 `DATABASE_URL` 로 지정 (기본값은 위 중 하나)

## 제안
**개발: `backend/data/app.db`, 배포: `app.getPath('userData')/app.db`. 경로는 환경변수/설정으로 주입하고 코드에 하드코딩하지 않는다** (NFR-PORT-03).

## 근거
- 개발 중엔 저장소 안이 확인·삭제(스키마 변경 시)에 편하다. `*.db` 는 이미 `.gitignore`.
- 배포 앱이 저장소 안에 쓰면 패키징된 리소스와 섞이고 권한 문제가 생긴다 → `userData` 가 표준.
- 백엔드가 Electron 없이도 뜰 수 있어야 하므로(ADR-0004) 백엔드는 환경변수를, Electron 은 `userData` 를 넘긴다.

## 미결
- 백엔드 단독 실행 시 기본 경로를 `backend/data/` 로 할지 `./app.db` 로 할지.
- 에이전트(`agent/db.py`)가 같은 경로를 어떻게 알게 할지 → [ADR-0011](ADR-0011-agent-backend-db-access.md) 와 함께 결정.
