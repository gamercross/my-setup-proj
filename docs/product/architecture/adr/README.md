# 📐 아키텍처 결정 기록 (ADR)

> 하나의 설계 결정 = 하나의 파일. 이후 모든 아키텍처 결정은 여기에 ADR 추가로만 남긴다.
> 배경 전체는 [DESIGN.md](../DESIGN.md), 용어는 [GLOSSARY.md](../../reference/GLOSSARY.md).

## 템플릿

```markdown
# ADR-NNNN: 제목

- 상태: 제안 | 채택 | 폐기  (날짜)
- 관련: FR/NFR ID, 다른 ADR

## 맥락
무엇을 정해야 했는가, 제약은 무엇인가.

## 결정
무엇으로 정했는가 (한 문장).

## 근거
왜.

## 대안
고려했으나 택하지 않은 것 + 이유.

## 결과 / 트레이드오프
이 결정으로 생기는 이득과 부담, 나중에 재검토할 조건.
```

## 목록

| # | 제목 | 상태 | 관련 |
|---|---|---|---|
| [0001](ADR-0001-frontend-react-vite.md) | 프론트 렌더링을 React + Vite 로 통일 | 채택 | FR-UI-02, AS_IS G1 |
| [0002](ADR-0002-local-db-better-sqlite3.md) | 로컬 DB 는 better-sqlite3 | 채택 | FR-TASK-05, AS_IS G2 |
| [0003](ADR-0003-schema-single-file.md) | 스키마는 `schema.sql` 1파일 + `IF NOT EXISTS` | 채택 | NFR-MAINT-03 |
| [0004](ADR-0004-front-back-http-rest.md) | 프론트↔백엔드는 HTTP REST | 채택 | AS_IS G3 |
| [0005](ADR-0005-state-zustand.md) | 상태관리는 zustand | 채택 | FR-UI-02 |
| [0006](ADR-0006-agent-owns-external-apis.md) | 외부 API 는 Python 에이전트가 전담 | 채택 | FR-AGENT, FR-CAL, FR-MAIL |
| [0007](ADR-0007-schedule-launchd-cron.md) | 스케줄은 launchd/cron | 채택 | FR-AGENT-05 |
| [0008](ADR-0008-supabase-deferred.md) | Supabase 클라우드 동기화는 Week 10 이후 | 채택 | FR-SYNC |
| [0009](ADR-0009-sqlite-file-location.md) | SQLite 파일 위치 (`DATABASE_PATH` 주입) | 채택 | FR-TASK-05 |
| [0010](ADR-0010-vite-dev-vs-build.md) | Vite: `NODE_ENV` 로 dev 서버/빌드 분기 | 채택 | FR-UI-02 |
| [0011](ADR-0011-agent-backend-db-access.md) | 에이전트–백엔드 SQLite: WAL + 쓰기 주체 분리 | 채택 | FR-AGENT-01 |
| [0012](ADR-0012-task-project-link.md) | `tasks.project_id` FK (`ON DELETE SET NULL`) | 채택 | FR-PROJ |
| [0013](ADR-0013-dashboard-agent-queue.md) | 대시보드 기반 에이전트 작업 큐 | 제안 | FR-AGENT-08 |
| [0014](ADR-0014-dashboard-diagram-viewer.md) | 대시보드 다이어그램 뷰어 (mermaid 클라이언트 렌더 + `/api/diagrams`) | 제안 | FR-UI-05 |
| [0015](ADR-0015-local-first-architecture.md) | 아키텍처 스타일 — 로컬 우선 + 프로세스 분리 | 제안 | ASR-1~3, NFR-REL |
| [0016](ADR-0016-desktop-process-topology.md) | 데스크톱 프로세스 토폴로지 (백엔드 실행 주체) | 제안 | RUNTIME_VIEW §5 |
| [0017](ADR-0017-rest-error-contract.md) | REST 오류 응답 계약 (RFC 9457 스타일) | 제안 | NFR-SEC-07 |
| [0018](ADR-0018-schema-migration-strategy.md) | 스키마 마이그레이션 전략 (순방향 전용) | 제안 | ADR-0003, NFR-MAINT-03 |
| [0019](ADR-0019-architecture-fitness-functions.md) | 아키텍처 피트니스 함수 | 제안 | NFR-MAINT-02 |
| [0020](ADR-0020-widget-shell-architecture.md) | 위젯 셸 아키텍처 (react-grid-layout + 위젯 계약) | 제안 | FR-WIDGET, DASHBOARD_OS |
| [0021](ADR-0021-widget-layout-persistence.md) | 위젯 레이아웃·설정 영속화 (localStorage → SQLite) | 제안 | FR-WIDGET-04~06 |
| [0022](ADR-0022-per-widget-theming.md) | 위젯별 테마 (스코프된 CSS 변수 + 구조화 config) | 제안 | FR-WIDGET-05, NFR-SEC-04 |
| [0023](ADR-0023-branch-model.md) | 브랜치 모델 — `feature/* → PR → main` (Git Flow 미채택) | 채택 | GIT_WORKFLOW §2 |
