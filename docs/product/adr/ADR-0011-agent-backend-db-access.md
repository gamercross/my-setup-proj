# ADR-0011: 에이전트–백엔드 SQLite 동시 접근 방식

- 상태: **제안** (2026-09-02) — 결정 필요, D1(Week 7) 착수 전
- 관련: FR-AGENT-01, [ADR-0006](ADR-0006-agent-owns-external-apis.md), [ADR-0002](ADR-0002-local-db-better-sqlite3.md)

## 맥락
[ADR-0006](ADR-0006-agent-owns-external-apis.md) 에 따라 Python 에이전트가 SQLite 에 쓰고 Node 백엔드가 읽는다. 두 프로세스가 같은 파일에 접근한다. 방식 후보:
1. 둘 다 직접 SQLite 접근 + **WAL 모드**로 동시 읽기/쓰기 허용
2. 에이전트는 백엔드 API(`POST /internal/...`)를 거쳐서만 쓰기
3. 에이전트 전용 테이블은 에이전트만, 공유 테이블은 API 경유

## 제안
**1번 — WAL 모드 + 짧은 트랜잭션.** 에이전트는 배치로 upsert 하고 바로 커밋, 백엔드는 읽기 위주.

## 근거
- 쓰기 주체가 사실상 분리돼 있다(에이전트=캐시 테이블 `emails`/`calendar_events`/`briefs`, 백엔드=`tasks`/`projects`). 충돌 창이 작다.
- WAL 은 읽기와 쓰기를 서로 막지 않는다.
- API 경유(2번)는 에이전트 실행 시 백엔드가 반드시 떠 있어야 하는 결합을 만든다 — [ADR-0007](ADR-0007-schedule-launchd-cron.md) 의 "앱 꺼져 있어도 브리핑 생성" 과 충돌.

## 미결
- `busy_timeout` 값.
- 에이전트가 `tasks` 를 **읽기만** 하는지, "오늘 완료한 일" 같은 파생 데이터를 쓸 일이 있는지.
- 스키마 초기화 책임: 백엔드만 `schema.sql` 적용하고 에이전트는 존재를 가정할지.
