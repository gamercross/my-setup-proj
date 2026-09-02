# ADR-0002: 로컬 DB 는 better-sqlite3

- 상태: 채택 (2026-09-02)
- 관련: FR-TASK-05, [AS_IS.md](../AS_IS.md) G2, 강의 Week 5(SQLite)

## 맥락
현재 `backend/src/db.js` 는 인메모리 배열이라 프로세스 재시작 시 데이터가 사라진다. 로컬 영속 저장소가 필요하다. Electron/Node 단일 프로세스 환경이고, 강의에서 SQLite 를 다룬다.

## 결정
**better-sqlite3** (동기 API) 를 쓴다.

## 근거
- 동기 API 라 코드가 단순하다. Electron 메인/백엔드 단일 프로세스에서 async 오케스트레이션 부담이 없다.
- 파일 하나로 배포·백업이 쉽다.
- 강의 SQLite 실습(`CREATE TABLE`, `SELECT`)과 그대로 연결된다.

## 대안
- **`node:sqlite`**: 아직 실험적(Node 22+), 안정성 미확보.
- **Prisma / TypeORM**: 이 규모엔 과하다. 마이그레이션 도구는 나중에.
- **sqlite3 (비동기)**: 콜백/프라미스 래핑이 늘어난다.

## 결과 / 트레이드오프
- 네이티브 모듈이라 OS/아키텍처별 빌드가 필요(`npm install` 시 자동). CI·Docker 에서 확인.
- `db.js` 의 함수 시그니처(`getX/addX/updateX/deleteX`)는 유지한다 → 라우트·테스트 무수정 ([ADR-0003](ADR-0003-schema-single-file.md), NFR-MAINT-03).
- 파일 위치는 [ADR-0009](ADR-0009-sqlite-file-location.md) 에서 결정.
