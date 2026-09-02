# ADR-0011: 에이전트–백엔드 SQLite 동시 접근 방식

- 상태: 채택 (2026-09-02)
- 관련: FR-AGENT-01, [ADR-0006](ADR-0006-agent-owns-external-apis.md), [ADR-0002](ADR-0002-local-db-better-sqlite3.md), [ADR-0009](ADR-0009-sqlite-file-location.md)

## 맥락
[ADR-0006](ADR-0006-agent-owns-external-apis.md) 에 따라 Python 에이전트가 SQLite 에 쓰고 Node 백엔드가 읽는다. 두 프로세스가 같은 파일에 접근한다.

## 결정
**둘 다 직접 SQLite 접근 + WAL 모드.**
- 백엔드 부팅 시 `PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;` 설정.
- 에이전트도 연결 시 동일 PRAGMA.
- **스키마 초기화 책임은 백엔드**(`schema.sql` 적용). 에이전트는 테이블 존재를 가정하되, 없으면 `schema.sql` 을 실행(멱등이므로 안전).
- **쓰기 주체 분리 유지**: 에이전트 = 캐시 테이블(`emails`, `calendar_events`, `briefs`, `sync_logs`). 백엔드 = `tasks`, `projects`. 에이전트는 `tasks` 를 **읽기만** 한다.
- 에이전트의 upsert 는 짧은 트랜잭션으로 감싸고 즉시 커밋.

## 근거
- 쓰기 주체가 사실상 겹치지 않아 충돌 창이 작다.
- WAL 은 읽기와 쓰기를 서로 막지 않는다.
- API 경유 쓰기(대안)는 에이전트 실행 시 백엔드가 반드시 떠 있어야 하는 결합을 만든다 — [ADR-0007](ADR-0007-schedule-launchd-cron.md) 의 "앱 꺼져 있어도 브리핑 생성" 과 충돌.

## 대안
- 에이전트가 백엔드 내부 API 경유로만 쓰기: 프로세스 결합 발생.
- 에이전트 전용 별도 DB 파일 + 주기적 병합: 복잡도 증가.

## 결과 / 트레이드오프
- `-wal`, `-shm` 파일이 생긴다 → `.gitignore` 의 `*.db` 외에 `*.db-wal`, `*.db-shm` 도 제외.
- 에이전트가 파생 데이터("오늘 완료한 일" 등)를 써야 할 일이 생기면 별도 테이블로 두고 이 결정을 재검토.
- 장시간 쓰기 트랜잭션 금지 (busy_timeout 초과 위험).
