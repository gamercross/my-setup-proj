# ADR-0013: 대시보드 기반 에이전트 작업 큐

- 상태: **제안** (2026-09-02) — 전체 작업 큐는 핵심 기능 완성 후(Week 10+) 재검토. 지금은 자리표시.
- **부분 결정 (2026-09-08, PO-9):** 개인 OS **P7**(에이전트 활동 위젯)의 "지금 실행" 버튼은
  **파일 플래그 방식**으로 한다 — 백엔드가 `agent/.run-now`(또는 유사) 플래그 파일을 쓰고,
  에이전트 루프(또는 launchd 스케줄)가 다음 폴링에서 이를 감지해 `sync` 를 1회 실행 후 플래그 삭제.
  백엔드가 python 프로세스를 직접 spawn 하지 않으므로 [ADR-0011](ADR-0011-agent-backend-db-access.md)
  프로세스 분리 원칙을 유지한다. 즉각성은 폴링 간격만큼 지연되지만 개인용 규모에 충분.
  데모(`demoClient.js`)는 즉시 성공 목으로 처리. 전체 `agent_jobs` 큐(임의 프롬프트)는 여전히 범위 밖.
- 관련: FR-AGENT-08, [VISION.md](../../vision/VISION.md) 향후 확장, [ORCHESTRATION.md](../../../setup/ORCHESTRATION.md), 강의 Week 11

## 맥락
Daily Brief([FR-AGENT-01~06](../../requirements/AGENT.md))는 정해진 1가지 작업을 매일 자동 실행한다.
사용자가 임의의 요청을 대시보드에서 넣고 에이전트가 처리해 결과를 받는 일반화 버전이 논의됨.

## 제안 (방향만)
- `tasks` 와 별개인 **`agent_jobs`** 테이블에 요청을 큐잉: `{id, prompt, status(queued/running/done/failed), result, created_at, finished_at}`.
- `agent/runner.py` 가 큐를 폴링(또는 백엔드가 트리거) → 컨텍스트 수집 → `claude.ask()` → 결과 저장.
- 대시보드에 입력창 + 작업 목록/결과 패널.
- **범위 한정:** 프롬프트가 하는 일은 "사용자 생산성 데이터에 대한 분석·요약·제안" 으로 제한.
  파일 수정·셸 실행·git 접근 없음. 코딩 에이전트는 제품 범위 밖.

## 미결
- 트리거 방식 → **P7 "지금 실행" 은 파일 플래그로 결정됨 (2026-09-08, PO-9, 위 참조).** 전체 큐의 러너 방식(상주 vs 폴링)은 Week 10+ 에서.
- 프롬프트 주입 안전장치(사용자 입력이 그대로 Claude 로 감 — 시스템 프롬프트로 범위 강제).
- Week 11 강의 "Mini Coding Agent" 를 이걸로 대체할지, 별도 데모로 둘지.
- ORCHESTRATION.md 상태 그래프를 런타임으로 옮길 때 LangGraph 등을 쓸지.

## 결정 시 영향
`schema.sql`(`agent_jobs`), `agent/` 신규 모듈, API(`POST /api/agent/jobs`, `GET /api/agent/jobs`), UI 패널.
