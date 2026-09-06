# 📖 용어집 (Glossary)

> 이 프로젝트에서 쓰는 도메인·상태·시스템 용어의 정의. 문서·코드·대화에서 같은 단어를 같은 뜻으로 쓰기 위한 기준.
> 처음 합류했다면 [ONBOARDING.md](../../ONBOARDING.md) → 이 문서 순서로 읽는다.

---

## 1. 제품 도메인 용어

| 용어 | 정의 | 관련 문서·코드 |
|---|---|---|
| **할일 (task)** | 사용자가 해야 할 단위 작업. 제목·설명·마감일·우선순위·상태를 가진다. | `tasks` 테이블, `backend/src/routes/tasks.js` |
| **프로젝트 (project)** | 여러 할일을 묶는 상위 단위. 진행도(0–100)와 상태를 가지며 Notion 프로젝트와 매핑될 수 있다. | `projects` 테이블, `backend/src/routes/projects.js` |
| **브리핑 / Daily Brief (brief)** | 매일 아침 에이전트가 할일·일정·미읽은 메일을 모아 Claude 로 생성하는 "오늘의 우선순위 TOP 3 + 주의점" 요약. Notion 페이지와 로컬 DB 에 저장된다. | `briefs` 테이블, `agent/daily_brief.py` |
| **일정 (calendar event)** | Google Calendar 에서 가져온 일정. 로컬에 캐시해 오프라인에서도 최근 일정을 본다. | `calendar_events` 테이블, `agent/services/calendar.py` |
| **미읽은 메일 (unread email)** | Gmail 에서 읽지 않은 상태로 가져온 메일. 보낸사람·제목·스니펫을 캐시한다. | `emails` 테이블, `agent/services/gmail.py` |
| **핵심 기능 4종** | [VISION.md](../vision/VISION.md) 가 정의하는 우선순위 기능. ① 오늘/내일 할 일 정리(자동 브리핑) ② 프로젝트 진행도 추적(Notion) ③ 이메일 통합 관리 ④ 캘린더 일정 확인. 프로젝트 "완료"의 기준. | [VISION.md](../vision/VISION.md), [REQUIREMENTS_FUNCTIONAL.md](../requirements/REQUIREMENTS_FUNCTIONAL.md) |
| **대시보드 OS** | 제품 방향. 각 데이터(할일·프로젝트·일정·메일·브리핑)를 **위젯**으로 셸에 올려 이동·리사이즈하고, 위젯마다 디자인을 꾸미는 데스크톱 형태. | [DASHBOARD_OS.md](../vision/DASHBOARD_OS.md) |
| **위젯 (widget)** | 셸 위에 올라가는 하나의 "앱". **위젯 타입**(레지스트리 등록: `tasks`/`projects`/…)과 **위젯 인스턴스**(사용자가 올린 하나 — 위치·크기·`config`)로 나뉜다. | [requirements/WIDGET.md](../requirements/WIDGET.md), `frontend/src/widgets/` |
| **위젯 셸 (shell)** | 위젯을 배치·이동·리사이즈·추가·제거하는 데스크톱 컨테이너. 미니 윈도우 매니저. | `WidgetShell.jsx` (C5), [ADR-0020](../architecture/adr/ADR-0020-widget-shell-architecture.md) |
| **위젯 레지스트리** | 사용 가능한 위젯 타입의 목록·메타(이름·아이콘·기본 크기·뷰·설정 스키마). 새 위젯 = 항목 추가. | `frontend/src/widgets/registry.js`, FR-WIDGET-08 |
| **위젯 config** | 위젯 인스턴스별 커스터마이즈 JSON. `theme`(bg·accent·radius·density·titlebar) + `display`(정렬·필터 등). 화이트리스트 키만. | [ADR-0022](../architecture/adr/ADR-0022-per-widget-theming.md) |
| **레이아웃 (layout)** | 위젯 인스턴스들의 위치·크기·z·최소화·config 집합. localStorage `dashboard.layout.v1` 에 저장·복원. | [ADR-0021](../architecture/adr/ADR-0021-widget-layout-persistence.md), `useLayoutStore` |
| **편집 모드 (edit mode)** | 위젯 이동·리사이즈가 가능한 상태. 평소엔 잠금(본문 상호작용만). | FR-WIDGET-01, `WidgetShell` |

## 2. 상태값 (코드에서 쓰는 정확한 문자열)

| 필드 | 허용값 | 의미 |
|---|---|---|
| `task.status` | `todo` · `in_progress` · `done` | 할 일 / 진행 중 / 완료. 완료 토글은 `todo` ↔ `done`. |
| `task.priority` | `high` · `medium` · `low` | 우선순위. 기본값 `medium`. UI 배지 색: high=빨강, medium=주황, low=회색. |
| `project.status` | `active` · `done` · `on_hold` | 진행 중 / 완료 / 보류. 기본값 `active`. |
| `sync_logs.status` | `success` · `failed` | 외부 API 동기화 1회 시도의 결과. |
| `ADR.status` | `제안` · `채택` · `폐기` | 아키텍처 결정 문서의 현재 상태. |

> ⚠️ DB 스키마(`priority`, `status`)와 코드의 문자열이 어긋나면 안 된다. 단일 원천은 `backend/db/schema.sql`(예정). 현재 `backend/src/db.js` 는 기본값 `medium`/`todo`/`active` 를 코드에 둔다.

## 3. 시스템 / 자동화 용어

| 용어 | 정의 | 관련 |
|---|---|---|
| **에이전트 팀** | 하나의 기능을 네 역할이 나눠 완성하는 서브에이전트 구성. 역할별로 코드 수정·커밋 권한이 다르다. | `.claude/agents/` |
| **생각하는 친구 (planner)** | 요구사항을 분해하고 코드베이스를 조사해 구현 계획을 만든다. 코드 수정 ✕. | `planner.md` (opus) |
| **개발하는 친구 (developer)** | 계획대로만 구현한다. 범위 밖 금지, 커밋 ✕. | `developer.md` (sonnet) |
| **감독하는 친구 (supervisor)** | 변경분(diff)을 계획 준수·버그·컨벤션·보안 관점에서 리뷰하고 `PASS` / `CHANGES_NEEDED` 를 판정한다. 코드 수정 ✕. | `supervisor.md` (opus) |
| **마무리하는 친구 (finisher)** | `verify.sh` 실행 → `PROGRESS.md` 갱신 → 커밋·푸시. 문서만 수정, `--force`·`main` 직접 커밋 금지. | `finisher.md` (sonnet) |
| **`/feature` 파이프라인** | `planner → developer → supervisor → (CHANGES_NEEDED 면 최대 2회 반복) → finisher` 순서로 한 기능을 완성하는 오케스트레이션. | `.claude/commands/feature.md` |
| **작업로그 (worklog)** | 날짜별 **요약**(작성)과 **커밋**(git 이력에서 자동)을 모으는 파일. `<!-- SUMMARY:날짜 -->` 블록은 훅 갱신에도 보존. | `작업로그.md`, `scripts/worklog.sh` |
| **Stop 훅** | 매 턴(대화 응답) 종료 시 자동 실행되는 명령. 여기서는 `worklog.sh` 를 호출해 오늘 섹션을 재생성한다. | `.claude/settings.json` |
| **EOD (End of Day)** | 매일 23:50 launchd 예약 작업. 오늘 작업로그를 커밋·푸시하고 슬랙에 요약을 보낸다. | `scripts/worklog-eod.sh`, `scripts/com.aicomputeros.worklog.plist` |
| **인메모리 DB** | B2(2026-09-02) **이전** 백엔드가 쓰던 임시 저장소 — 배열에 데이터를 담아 프로세스가 죽으면 사라졌다. 현재는 better-sqlite3 로 교체됨(영속). 역사적 용어. | (구) `backend/src/db.js` |
| **증분 동기화 (incremental sync)** | 마지막 동기화 시각 이후 변경분만 주고받는 방식. 전체 재전송을 피한다. | [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) §성능 |
| **갭 (G1~G9)** | AS-IS(현행)와 TO-BE(목표)의 차이. [AS_IS.md](../vision/AS_IS.md) §4 에 심각도별로 정리. G1·G2·G4·G5·G6 해소, G3 코드 배선 완료. | [AS_IS.md](../vision/AS_IS.md) |

## 4. 요구사항 / 설계 표기

| 표기 | 의미 |
|---|---|
| `FR-<도메인>-<번호>` | 기능 요구사항 ID. 예: `FR-TASK-01`. |
| `NFR-<범주>-<번호>` | 비기능 요구사항 ID. 예: `NFR-SEC-01`. |
| `AD-01` ~ `AD-08` | 아키텍처 결정(Architecture Decision). [DESIGN.md](../architecture/DESIGN.md) §2, 개별 파일은 `adr/`(예정). |
| `TC-xx` | 테스트 케이스 ID. [TEST_PLAN.md](../testing/TEST_PLAN.md)(예정). |
| **P0 / P1 / P2** | 요구사항 우선순위. P0=완료 기준, P1=있어야 함, P2=선택. |
| **Phase A~E** | [DESIGN.md](../architecture/DESIGN.md) §8 의 구현 단계. 3강의 주차와의 대응표는 DESIGN §8. |
| **강의 A / B / C** | 이 프로젝트를 공통 산출물로 제출하는 우송대 2026-2학기 3개 전공 강의. **A** = AI 컴퓨터 운영체제 실습(김태원, 런타임·환경·배포 층) / **B** = AI시대소프트웨어공학(양현식, AI 활용 개발 프로세스 층) / **C** = AITool기반소프트웨어공학(유승선, 정통 SW공학 산출물 층). [COURSE_MAPPING.md](../../progress/COURSE_MAPPING.md) |
| **강의 태그 (`A-W11` 형식)** | `<강의>-W<주차>` — 특정 강의의 특정 주차 주제를 가리키는 태그. 복수 `A-W5·C-W4`, 범위 `C-W3~W7`. 정의·매핑의 단일 원천 = [COURSE_MAPPING.md §4](../../progress/COURSE_MAPPING.md#4-강의-렌즈--fr-도메인adr-그룹--강의-주차). |

---

**작성:** 2026-09-02
