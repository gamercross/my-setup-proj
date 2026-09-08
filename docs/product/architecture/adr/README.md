# 📐 아키텍처 결정 기록 (ADR)

> 하나의 설계 결정 = 하나의 파일. 이후 모든 아키텍처 결정은 여기에 ADR 추가로만 남긴다.
> 배경 전체는 [DESIGN.md](../DESIGN.md), 용어는 [GLOSSARY.md](../../reference/GLOSSARY.md).

**📂 이동:** [⬆ architecture/](../README.md) · [product/](../../README.md) · [docs/](../../../README.md) · [🚀 ONBOARDING](../../../ONBOARDING.md)
**형제 뷰:** [DESIGN](../DESIGN.md) · [ARCHITECTURE_DRIVERS](../ARCHITECTURE_DRIVERS.md) · [RUNTIME_VIEW](../RUNTIME_VIEW.md) · [DATA_ARCHITECTURE](../DATA_ARCHITECTURE.md) · [CROSSCUTTING](../CROSSCUTTING.md) · [ARCHITECTURE_EVOLUTION](../ARCHITECTURE_EVOLUTION.md)

> **상태 요약:** 0001~0012 채택 · **0013·0015·0016·0017·0019 제안**(착수 전 결정 — 0013 은 전체 작업 큐(FR-AGENT-09) 부분만 미결, P7 "지금 실행" 트리거(FR-AGENT-08)=전용 디렉터리 파일 플래그 + launchd WatchPaths 로 채택됨 (2026-09-08)) · 0014·0020~0026 채택 (0022 는 C6, 0024 는 D2-b, 0025 는 D3, 0026 은 웹 데모) · **0027 채택(P3)** · **0032 채택(P4.5 — 사이드바 셸)** · **0028 채택(P5 — 단일 캐시·칸반)** · **0018·0029 채택(P6 — 최소 마이그레이션·태그 자동 분류)** · **0030 채택(P8 — OKR 모델)** · **0031 채택(P9 — 안전 마크다운·파일 트리)** (개인 생산성 OS 방향 — [PERSONAL_OS.md](../../vision/PERSONAL_OS.md) §7~8). 제안 ADR 은 관련 Phase 착수 전에 사용자가 결정한다.
>
> **강의 열:** 각 ADR 이 3개 강의([COURSE_MAPPING.md](../../../progress/COURSE_MAPPING.md)) 중 어느 주차의 렌즈로 읽히는지. 값의 단일 원천(SSOT) = COURSE_MAPPING §4. 대응 없으면 `—`.

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

| # | 제목 | 상태 | 관련 | 강의 |
|---|---|---|---|---|
| [0001](ADR-0001-frontend-react-vite.md) | 프론트 렌더링을 React + Vite 로 통일 | 채택 | FR-UI-02, AS_IS G1 | A-W4 |
| [0002](ADR-0002-local-db-better-sqlite3.md) | 로컬 DB 는 better-sqlite3 | 채택 | FR-TASK-05, AS_IS G2 | A-W5, C-W4 |
| [0003](ADR-0003-schema-single-file.md) | 스키마는 `schema.sql` 1파일 + `IF NOT EXISTS` | 채택 | NFR-MAINT-03 | A-W5, C-W4 |
| [0004](ADR-0004-front-back-http-rest.md) | 프론트↔백엔드는 HTTP REST | 채택 | AS_IS G3 | A-W4, B-W5, C-W4 |
| [0005](ADR-0005-state-zustand.md) | 상태관리는 zustand | 채택 | FR-UI-02 | B-W5 |
| [0006](ADR-0006-agent-owns-external-apis.md) | 외부 API 는 Python 에이전트가 전담 | 채택 | FR-AGENT, FR-CAL, FR-MAIL | A-W11, B-W7 |
| [0007](ADR-0007-schedule-launchd-cron.md) | 스케줄은 launchd/cron | 채택 | FR-AGENT-05 | A-W6, B-W7 |
| [0008](ADR-0008-supabase-deferred.md) | Supabase 클라우드 동기화는 Week 10 이후 | 채택 | FR-SYNC | A-W10 |
| [0009](ADR-0009-sqlite-file-location.md) | SQLite 파일 위치 (`DATABASE_PATH` 주입) | 채택 | FR-TASK-05 | A-W5, C-W4 |
| [0010](ADR-0010-vite-dev-vs-build.md) | Vite: `NODE_ENV` 로 dev 서버/빌드 분기 | 채택 | FR-UI-02 | A-W4 |
| [0011](ADR-0011-agent-backend-db-access.md) | 에이전트–백엔드 SQLite: WAL + 쓰기 주체 분리 | 채택 | FR-AGENT-01 | A-W6, B-W7 |
| [0012](ADR-0012-task-project-link.md) | `tasks.project_id` FK (`ON DELETE SET NULL`) | 채택 | FR-PROJ | B-W3, C-W4 |
| [0013](ADR-0013-dashboard-agent-queue.md) | 대시보드 기반 에이전트 작업 큐 | 전체 큐 제안 / P7 "지금 실행" 트리거 채택 (2026-09-08) | FR-AGENT-08 · FR-AGENT-09 | B-W5 |
| [0014](ADR-0014-dashboard-diagram-viewer.md) | 대시보드 다이어그램 뷰어 (mermaid 클라이언트 렌더 + `/api/diagrams`) | 채택 | FR-UI-05 | C-W7 |
| [0015](ADR-0015-local-first-architecture.md) | 아키텍처 스타일 — 로컬 우선 + 프로세스 분리 | 제안 | ASR-1~3, NFR-REL | C-W3·C-W6 |
| [0016](ADR-0016-desktop-process-topology.md) | 데스크톱 프로세스 토폴로지 (백엔드 실행 주체) | 제안 | RUNTIME_VIEW §5 | A-W6·A-W9 |
| [0017](ADR-0017-rest-error-contract.md) | REST 오류 응답 계약 (RFC 9457 스타일) | 제안 | NFR-SEC-07 | C-W4 |
| [0018](ADR-0018-schema-migration-strategy.md) | 스키마 마이그레이션 전략 (최소안: `PRAGMA user_version` + 인라인 러너) | 채택 (2026-09-08, P6) | ADR-0003, NFR-MAINT-03 | A-W5, C-W4 |
| [0019](ADR-0019-architecture-fitness-functions.md) | 아키텍처 피트니스 함수 | 제안 | NFR-MAINT-02 | B-W6 |
| [0020](ADR-0020-widget-shell-architecture.md) | 위젯 셸 아키텍처 (react-grid-layout + 위젯 계약) | 채택 | FR-WIDGET, DASHBOARD_OS | A-W6, C-W5·C-W6 |
| [0021](ADR-0021-widget-layout-persistence.md) | 위젯 레이아웃·설정 영속화 (localStorage → SQLite) | 채택 | FR-WIDGET-04~06 | A-W6, C-W5·C-W6 |
| [0022](ADR-0022-per-widget-theming.md) | 위젯별 테마 (스코프된 CSS 변수 + 구조화 config) | 채택 — C6 구현 완료 | FR-WIDGET-05, NFR-SEC-04 | A-W6, C-W5·C-W6 |
| [0023](ADR-0023-branch-model.md) | 브랜치 모델 — `feature/* → PR → main` (Git Flow 미채택) | 채택 | GIT_WORKFLOW §2 | B-W13, C-W13 |
| [0024](ADR-0024-oauth-token-storage.md) | OAuth 토큰은 Fernet 암호화 JSON 파일 (`TOKEN_ENCRYPTION_KEY`) | 채택 — D2-b | FR-AUTH-01, NFR-SEC-05 | A-W11, B-W7 |
| [0025](ADR-0025-brief-empty-response.md) | 브리핑 빈 결과는 404 아닌 200 + `{ brief: null }` | 채택 — D3 | FR-AGENT-04 | A-W7 |
| [0026](ADR-0026-web-demo-mode.md) | 웹 데모 모드 — `VITE_DEMO` 목 어댑터 + GitHub Pages | 채택 — 2026-09-07 | FR-UI-*, FR-WIDGET-* | C-W7 |
| [0027](ADR-0027-light-theme-default.md) | 라이트 테마 기본 전환 + 디자인 토큰 v2 | 채택 — P3 (2026-09-07) | FR-WIDGET-05/06 | — |
| [0028](ADR-0028-single-client-cache.md) | 단일 클라이언트 캐시 — 뷰는 파생만, 칸반은 tasks 위젯 내 리스트/보드 토글 | 채택 (2026-09-08, 개인 OS P5) | FR-TASK-02/03/09, FR-UI-01 | — |
| [0029](ADR-0029-task-auto-category.md) | 할 일 자동 분류 — 자유 태그·다중(`task_tags`), 에이전트 배치 | 채택 (2026-09-08, P6) | FR-TASK-08 | — |
| [0030](ADR-0030-okr-data-model.md) | OKR 데이터 모델 + 주간 플래너 | 채택 — 개인 OS P8 (2026-09-08, PO-5/6 초안대로) | FR-OKR-* | — |
| [0031](ADR-0031-safe-markdown-render.md) | 안전 마크다운 렌더 + 파일 트리 API (서버 토큰화·`GET /api/tree`) | 채택 — 개인 OS P9 (2026-09-08, PO-11/12: `docs/`+루트 `.md` 만·소스 제외·패널 리사이즈) | FR-UI-06 | — |
| [0032](ADR-0032-sidebar-shell-per-topic-layouts.md) | 사이드바 셸 + 주제별 위젯 레이아웃 (`activeTopic` state·레이아웃 v1→v2) | 채택 — 개인 OS P4.5 (PO-13/14, UI_STYLE v2) | FR-UI-01, FR-WIDGET-04 | — |
