# 현재 프로젝트 점검 결과

## 점검 기준

- 기준일: 2026-09-06
- 점검 대상: C3~C6 구현, Supabase 부트스트랩, D1 Daily Brief 변경분, 요구사항·아키텍처·환경 문서
- 목적: 현재 완료된 범위와 아직 위반·미검증인 항목을 구분해 다음 작업을 결정하는 것

## 현재 상태 요약

### 완료 또는 반영된 사항

- C3: 캘린더 더미 API와 캘린더 위젯
- C4: Mermaid 다이어그램 API와 다이어그램 위젯
- C5: 위젯 셸, 레이아웃 저장, 위젯 추가·삭제·이동 구조
- C6: 위젯 테마·표시 옵션·설정 모달
- Supabase: 실제 동기화가 아닌 선택적 클라이언트 부트스트랩과 `/api/sync/health` 진단
- D1 진행: SQLite의 오늘 할일 조회, `briefs` upsert, Daily Brief 실행 흐름과 실패 격리
- 환경 문서: OS별 설치 절차, `.env` 로딩 차이, 개발 포트 3000 규칙, 서비스 smoke 검증
- 문서 점검: 링크·ADR·FR 추적·드리프트 자동 검사

### 현재 검증 상태

- backend 테스트: 56개 통과
- frontend 테스트: 9개 통과
- agent 테스트: D1 DB 테스트 포함 통과 기록 기준 11개
- `verify.sh`: 27/0/0 통과 기록
- 문서 정합성 검사: 11/0/0 통과 기록
- frontend production build: 성공
- 미완료: Electron 창, 브라우저 UI, 위젯 상호작용, Mermaid 렌더링의 로컬 수동 확인

자동 검증은 양호하지만, 테스트 통과만으로 모든 비기능 요구사항과 실제 화면 동작이 완료된 것은 아닙니다.

## 확인된 문제와 해결책

### 1. 높음: `uncaughtException` 처리 누락

[NFR-REL-03](docs/product/requirements/REQUIREMENTS_NONFUNCTIONAL.md)은 backend가 `unhandledRejection`과 `uncaughtException`을 모두 기록하도록 요구합니다. 현재 [backend/src/server.js](backend/src/server.js#L15-L17)에는 `unhandledRejection` 처리만 있습니다.

**위험**

- 동기 예외가 최상위 로그 정책을 거치지 않음
- 예외 발생 후 프로세스를 계속 유지할지 안전 종료할지 정책이 없음
- 강제 예외 주입 및 graceful shutdown 검증이 없음

**해결책**

`uncaughtException` 처리 정책을 ADR-0016 실행 구조와 함께 결정합니다. 일반적으로 로그 기록 후 안전 종료·재시작을 기본으로 검토하고, 단순히 프로세스를 계속 살리는 방식은 피합니다. 예외 주입 테스트와 SIGTERM 종료 테스트를 추가합니다.

**상태:** 코드 후속 작업

### 2. 중간: tasks/projects 라우트가 DB를 직접 호출함

[NFR-MAINT-02](docs/product/requirements/REQUIREMENTS_NONFUNCTIONAL.md)와 [CONVENTIONS.md](docs/setup/CONVENTIONS.md)는 `routes → services → db` 계층을 요구합니다. 그러나 [tasks.js](backend/src/routes/tasks.js#L3-L16)와 [projects.js](backend/src/routes/projects.js#L3-L10)는 라우트에서 DB를 직접 호출하며 입력 검증·도메인 검증도 함께 수행합니다.

C3의 `services/calendar.js`, C4의 `services/diagrams.js`와 달리 기존 도메인의 계층이 일관되지 않습니다. 기능 테스트는 통과하지만 구조 요구사항은 부분 충족입니다.

**해결책**

`backend/src/services/tasks.js`와 `backend/src/services/projects.js`를 추가하고, 라우트는 요청 검증과 HTTP 응답 매핑에 집중하게 합니다. 기존 `backend/src/db.js` 공개 함수 시그니처는 유지합니다.

**상태:** 코드 후속 작업

### 3. 중간: D1 Daily Brief은 아직 완성 기능이 아님

D1 변경으로 다음 범위는 구현됐습니다.

- 오늘 마감이고 미완료인 할일을 SQLite에서 조회
- 우선순위 정렬
- `briefs` 날짜 기준 upsert
- Claude 호출 실패와 Notion 저장 실패 격리
- `.env`의 `DATABASE_PATH`를 agent가 읽는 구조

하지만 다음은 아직 남아 있습니다.

- 일정과 이메일은 더미 데이터
- `FR-AGENT-03` Notion 저장 계약과 `briefs.notion_url` 갱신 미완료
- `GET /api/brief/today`와 BriefCard 미구현
- `FR-AGENT-05` launchd/cron 자동 실행 미구현
- `FR-AGENT-06 AC-3` 지수 백오프 재시도 미구현
- `sync_logs` 기록은 서비스 제약과 함께 별도 정책이 필요

**해결책**

D2에서 Google OAuth·Gmail·Calendar 실데이터와 재시도 정책을 구현하고, D3에서 Brief API·UI·스케줄러를 완성합니다. D1 완료 표기는 “핵심 흐름 구현, 외부 데이터·자동화 미완료”로 유지해야 합니다.

**상태:** D1 진행 중

### 4. 중간: Supabase 부트스트랩을 동기화 완료로 오해할 위험

현재 Supabase 구현은 연결 객체 생성과 `/api/sync/health` 진단만 제공합니다. SQLite와 Supabase 사이의 데이터 동기화, 인증, `user_id`, 충돌 해결은 구현하지 않았습니다.

**해결책**

문서와 UI에서 `/api/sync/health`를 “연결 진단”으로만 표시합니다. FR-SYNC-01/02, 인증, 동기화 로그, 충돌 정책은 Phase E에서 별도 구현합니다. `SUPABASE_KEY`는 `anon public` 키만 사용하고 `service_role` 키는 사용하지 않습니다.

**상태:** 부트스트랩 완료, 동기화 미착수

### 5. 중간: 문서 상태를 기능 구현과 수동 검증으로 분리해야 함

C3~C6와 D1 작업으로 구현 범위가 빠르게 변했기 때문에 README·TRACEABILITY·PROGRESS·UI_SPEC의 상태가 서로 늦게 갱신될 위험이 있습니다. 특히 자동 테스트 통과와 Electron·브라우저 확인 완료는 다른 상태입니다.

**해결책**

모든 기능에 다음 세 상태를 따로 기록합니다.

1. 코드 구현
2. 자동 테스트
3. 브라우저·Electron 수동 검증

기능 완료 시 finisher가 관련 요구사항·테스트·문서 상태를 같은 변경에서 갱신합니다. `scripts/check_docs.py`는 링크·ADR·FR 추적·드리프트를 계속 실행합니다.

**상태:** 자동 검사로 일부 방지, UI 수동 검증 대기

### 6. 낮음에서 중간: Mermaid 번들 크기 경고

frontend build는 성공하지만 Mermaid core와 일부 다이어그램 chunk가 500KB를 초과합니다. 기능 실패는 아니지만 다이어그램 위젯의 최초 로딩 시간과 NFR-PERF-01에 영향을 줄 수 있습니다.

**해결책**

실제 Electron 환경에서 초기 화면과 다이어그램 위젯의 로딩 시간을 측정한 뒤 최적화 여부를 결정합니다. 동적 import는 유지하고, 측정 없이 warning만 숨기지 않습니다.

**상태:** 성능 측정 대기

### 7. 낮음: tasks/projects 계층 외에도 운영 경계 검증이 남음

자동 테스트가 API와 DB 중심으로 구성되어 있어 다음 경계는 실제 실행 확인이 필요합니다.

- Electron이 production `dist`를 정상 로드하는지
- backend 중단 시 위젯별 ErrorBoundary와 ErrorBanner가 정상 동작하는지
- 위젯 레이아웃 저장·복원·훼손 데이터 폴백
- 다이어그램 SVG 렌더링과 개별 블록 실패 폴백
- D1 agent와 backend가 같은 `DATABASE_PATH`를 사용할 때의 WAL 동시 접근
- macOS 외 Windows/Linux 실행

**해결책**

로컬 UI 체크리스트를 수행하고, 필요한 항목은 Playwright 또는 Electron smoke test로 자동화합니다. agent/backend DB 경계는 임시 DB와 별도 프로세스 테스트로 검증합니다.

**상태:** 사용자 로컬 검증 대기

## 환경 구성에서 기억할 점

- backend는 `.env`를 자동 로드하지 않으므로 `PORT`, `DATABASE_PATH`, `SUPABASE_*`는 셸에서 export해야 합니다.
- agent는 `python-dotenv`로 `.env`를 읽습니다.
- Slack 스크립트는 `.env`를 직접 읽습니다.
- frontend preload와 production CSP가 backend 포트 3000을 사용하므로 개발 포트는 현재 3000으로 고정합니다.
- `SUPABASE_KEY`는 `anon public` 키만 사용합니다.
- Node·Python 버전과 native `better-sqlite3` 빌드 도구는 OS별로 확인해야 합니다.
- `npm ci`, agent 가상환경, `verify.sh`, 문서 정합성 검사를 설치 후 기본 검증으로 사용합니다.

## 다음 작업 순서

| 순서 | 작업 | 완료 기준 |
|---:|---|---|
| 1 | D1 테스트·문서 상태 확정 | agent DB·Daily Brief 테스트와 요구사항 상태 일치 |
| 2 | `uncaughtException` 정책·테스트 | NFR-REL-03 충족 |
| 3 | tasks/projects services 분리 | routes의 DB 직접 호출 제거 |
| 4 | D2 외부 데이터·재시도 | Gmail·Calendar 실데이터와 백오프 테스트 |
| 5 | D3 Brief API·UI·스케줄 | Daily Brief 자동 실행 및 화면 조회 |
| 6 | 브라우저·Electron 검증 | C3~C6 UI 체크와 production 실행 기록 |
| 7 | Phase E 동기화·패키징 | Supabase 동기화, 인증, electron-builder 검증 |

## 최종 결론

현재 프로젝트는 C6까지의 데스크톱 위젯 기반과 D1의 Daily Brief 핵심 흐름이 구현된 상태입니다. 자동 테스트와 build는 정상으로 보이지만, 완전한 완료를 막는 핵심 사항은 **`uncaughtException` 처리 누락**, **tasks/projects의 계층 위반**, **D1 외부 데이터·자동 실행 미완료**, **Electron·브라우저 수동 검증 미완료**입니다.

따라서 다음 기능으로 바로 확장하기 전에 D1의 테스트·문서 상태를 확정하고, S1·S2 구조 문제를 별도 feature로 처리하는 것이 적절합니다.
