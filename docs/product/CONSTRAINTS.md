# ⛓️ 제약과 가정 (Constraints & Assumptions)

> 설계·계획이 전제하는 조건. 이 중 하나가 바뀌면 관련 결정([adr/](adr/))과 일정([ROADMAP.md](ROADMAP.md))을 재검토한다.
> 리스크는 [RISKS.md](RISKS.md), 요구사항은 [REQUIREMENTS_FUNCTIONAL.md](REQUIREMENTS_FUNCTIONAL.md).

---

## 1. 프로젝트 제약

| # | 제약 | 함의 |
|---|---|---|
| C-1 | **개발자 1인** (학생 본인) | 병렬 작업 불가. 범위를 P0 중심으로 좁힌다. 에이전트 파이프라인으로 작업 속도 보완 |
| C-2 | **마감 2026-11-30** (강의 종료 전), 중간고사 10-27 · 기말 12-08 | Phase D 이후는 시험 기간과 겹침 → 버퍼 필요. P2 는 잘라낼 수 있음 |
| C-3 | **강의 진도에 종속** — 각 기능은 대응 강의 주차 전후에 착수 ([COURSE_MAPPING.md](../progress/COURSE_MAPPING.md)) | SQLite 는 Week 5, 프로세스/cron 은 Week 6, 네트워크/에이전트는 Week 11 |
| C-4 | **비용 0 목표** — 유료 서비스 미사용 | Claude 무료 크레딧, Supabase Free, Google API 무료 쿼터 안에서 동작해야 함 (§3) |
| C-5 | **학습 목적** — 과제 발표·기말 제출물 | "완성"의 정의가 데모 가능 + 발표 자료화 ([VISION.md](VISION.md) 완료 기준) |
| C-6 | 산출물은 GitHub 공개 저장소 | 시크릿·개인정보 커밋 금지 (NFR-SEC-01). 실제 메일·일정 데이터는 로컬에만 |

## 2. 기술·환경 제약

| # | 제약 | 함의 |
|---|---|---|
| T-1 | **개발 머신에 `node`/`npm` 미설치** (`python3` 있음) | `verify.sh` 전체 통과 불가. `--code-only` + SKIP 처리 ([GIT_WORKFLOW.md](../setup/GIT_WORKFLOW.md) §1). Phase A2 에서 해소 |
| T-2 | 개발 OS = macOS (Darwin) | 스케줄러는 launchd 우선, Linux 는 cron ([ADR-0007](adr/ADR-0007-schedule-launchd-cron.md)). plist 경로 하드코딩 |
| T-3 | 배포 목표 = Windows / macOS / Linux 3-OS | Electron 단일 코드베이스. 네이티브 모듈(`better-sqlite3`)은 OS별 빌드 확인 필요 (RISK) |
| T-4 | Node 20 LTS · Python 3.12 고정 (CI 기준) | `package.json`·CI 매트릭스에 고정 (NFR-PORT-02) |
| T-5 | 오프라인에서도 조회 동작해야 함 (NFR-REL-04) | 로컬 SQLite 가 진실의 원천, 외부 API 는 캐시 위에 얹음 ([ADR-0006](adr/ADR-0006-agent-owns-external-apis.md)) |
| T-6 | Electron 보안 설정 고정 (`contextIsolation`, `nodeIntegration:false`) | 렌더러에서 Node·시크릿 접근 불가 → 모든 데이터는 REST 경유 ([ADR-0004](adr/ADR-0004-front-back-http-rest.md)) |
| T-7 | 외부 API 는 인증·승인 절차가 필요 | Google OAuth 앱 검토, Notion integration 연결, Claude 키 발급 — 각 착수 전 준비 ([ENV_REFERENCE.md](../setup/ENV_REFERENCE.md)) |

## 3. 규모·볼륨 추정 (성능·비용 근거)

개인 사용 1인 기준의 러프한 상한. NFR 수치([REQUIREMENTS_NONFUNCTIONAL.md](REQUIREMENTS_NONFUNCTIONAL.md) §1)의 근거.

| 데이터 | 추정 | 근거·영향 |
|---|---|---|
| 할일(`tasks`) | 활성 ~100건, 누적 ~2,000건/년 | SQLite·인메모리 모두 여유. 목록 렌더 500건 상한만 대비(NFR-PERF-03) |
| 프로젝트(`projects`) | ~20건 | 무시 가능 |
| 미읽은 메일(`emails`) | ~20~50통/일 캐시 | 스니펫만 저장. 본문 미저장 |
| 일정(`calendar_events`) | ~10건/일, 2주치 캐시 ~140건 | 무시 가능 |
| 브리핑(`briefs`) | 1건/일, ~365건/년 | 무시 가능 |
| **Claude 브리핑 호출** | **1회/일**, 입력 ~1.5~2K 토큰, 출력 ~0.5K 토큰 | 월 ~30회. 무료 크레딧/저비용 범위. 재시도 시에도 3회 이하 |
| Google/Notion API | 수집 시 <20 요청/일 | 무료 쿼터(수천/일) 대비 여유 |
| Supabase (Week 10+) | row 수천, <500MB | Free 티어(500MB DB, 5GB 전송) 내 |

**결론:** 성능은 병목이 아니다. 신경 쓸 것은 ① 목록 렌더(가상 스크롤은 필요 시), ② Claude 호출 지연·실패(NFR-PERF-04, NFR-REL-05), ③ 무료 티어 초과 시 알림(운영).

## 4. 가정 (틀리면 재검토)

| # | 가정 | 틀렸을 때 |
|---|---|---|
| A-1 | 사용자는 1명, 인증 없이 로컬에서만 쓴다 (Week 9 까지) | 다중 사용자를 앞당기면 스키마에 `user_id` 조기 도입, [ADR-0008](adr/ADR-0008-supabase-deferred.md) 재검토 |
| A-2 | 한 번에 한 기기에서만 쓴다 (Week 10 전) | 동시 편집 충돌 해결이 조기 필요 |
| A-3 | 브리핑은 하루 1회로 충분 | 실시간·수동 트리거가 필요하면 `daily_brief` 를 API 화 ([ADR-0011](adr/ADR-0011-agent-backend-db-access.md)) |
| A-4 | Google/Notion 계정과 API 접근을 본인이 가지고 있다 | 없으면 해당 기능 데모를 더미 데이터로 대체 |
| A-5 | 백엔드와 에이전트가 같은 머신에서 돈다 | 분리되면 SQLite 공유 불가 → API/DB 서버 필요 |
| A-6 | `better-sqlite3` 가 3-OS 에서 빌드된다 | 안 되면 `node:sqlite` 또는 순수 JS 대안 ([ADR-0002](adr/ADR-0002-local-db-better-sqlite3.md) 재검토) |

---

**작성:** 2026-09-02
