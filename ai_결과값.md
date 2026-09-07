# 현재 프로젝트 상태 보고서

## 기준

- 기준일: 2026-09-07
- 기준 브랜치: `feature/d3-brief-ui-schedule`
- 분류 기준: 해결됨 / 만들어지는 중 / 아직 해결하지 못함
- 주의: 현재 브랜치에는 D3 작업 중인 미커밋 변경이 있으므로, “코드가 존재함”과 “기능 완료·병합됨”을 구분한다.

## 1. 해결한 것

### 제품·기능 기반

- Phase A2·A3: 개발 환경, 자동 테스트 골격, CI 연결
- Phase B1: Vite + React 마운트
- Phase B2: better-sqlite3, WAL, `DATABASE_PATH`, 영속 SQLite
- Phase B3·C2: 할일·프로젝트 CRUD 프론트 배선
- Phase C1: CORS, 요청 로깅, 공통 오류 처리
- Phase C3: 캘린더 더미 API와 캘린더 위젯
- Phase C4: Mermaid 다이어그램 API와 다이어그램 위젯
- Phase C5: 위젯 셸, 레이아웃 저장, 위젯 이동·추가·삭제
- Phase C6: 위젯 테마, 표시 옵션, 설정 모달

### 백엔드 구조·안정성

- `uncaughtException` 처리와 안전 종료 정책을 구현했습니다.
- SIGTERM/SIGINT graceful shutdown과 SQLite WAL checkpoint를 추가했습니다.
- tasks/projects의 DB 직접 호출을 services 계층으로 분리했습니다.
- `routes → services → db` 구조를 tasks, projects, calendar, diagrams에 적용했습니다.
- 서비스 계층 분리 테스트와 lifecycle 테스트를 추가했습니다.
- `sync_logs` 기록과 `GET /api/sync/logs` 조회 API를 구현했습니다.

### 에이전트·외부 API 기반

- D1: SQLite에서 오늘 할일·메일·일정을 읽어 Daily Brief 컨텍스트를 생성합니다.
- D1: `briefs` 날짜 기준 upsert를 구현했습니다.
- D2-a: Claude 호출 재시도와 지수 백오프를 구현했습니다.
- D2-b: Google OAuth 데스크톱 흐름과 Fernet 암호화 토큰 저장을 구현했습니다.
- D2-b: Gmail·Google Calendar 수집 및 SQLite 캐시 저장을 구현했습니다.
- D2-b: 동기화 성공·실패를 `sync_logs`에 기록합니다.
- Supabase는 실제 동기화가 아니라 연결 부트스트랩과 `/api/sync/health` 진단까지만 구현했습니다.

### 문서·다이어그램 정합성

- `sync.py`와 `daily_brief.py` 흐름을 문서에 분리했습니다.
- 런타임 다이어그램에 동기화 프로세스를 반영했습니다.
- UI → Express API → SQLite 흐름으로 다이어그램을 수정했습니다.
- Gmail, Calendar, Claude, Notion의 데이터 흐름을 분리했습니다.
- 목표 구조와 현재 구조를 구분하고 Supabase·마이그레이션에 제안/미구현 라벨을 표시했습니다.

### 현재 확인된 검증 결과

작업로그에 기록된 최신 검증 기준입니다.

- backend 테스트: 70개 통과
- agent 테스트: `pytest -m "not network"` 54개 통과, 4개 제외
- frontend 테스트: 9개 통과 기록
- `verify.sh`: 30/0/0
- 문서 정합성: 11/0/0
- Mermaid 렌더링: 27개 문서, 실패 0
- frontend production build: 성공 기록

## 2. 현재 만들어지는 중

현재 브랜치에는 D3 구현 변경이 작업 중입니다. 관련 변경은 아직 최종 검증·커밋·PR 병합 전입니다.

### D3 Daily Brief 기능

현재 작성 중인 항목:

- `GET /api/brief/today` API
- 빈 브리핑을 `404`가 아니라 `200 + { brief: null }`로 반환하는 계약
- `BriefCard` 컴포넌트
- `useBriefStore`와 `BriefWidgetView`
- Notion 저장 결과와 `briefs.notion_url` 연결
- Notion 본문 정리·민감정보 마스킹 보강
- macOS launchd용 `daily-brief-run.sh`
- launchd 설치·제거 스크립트
- sync 실행 후 Daily Brief을 실행하는 순서와 로그 기록
- D3 backend/API/frontend/스케줄 테스트

### D3 완료 조건

다음 조건을 확인해야 D3를 완료로 볼 수 있습니다.

1. backend brief 테스트와 agent Notion/Daily Brief 테스트가 모두 통과
2. `verify.sh`, 문서 정합성 검사, frontend build 재실행
3. `daily-brief-run.sh`가 sync 실패 후에도 캐시 기반 brief 실행을 시도
4. Notion 성공 시 `briefs.notion_url`이 저장되고, 실패 시 로컬 brief가 유지
5. `GET /api/brief/today`와 Brief 위젯의 로딩·빈 상태·정상·오류 상태 확인
6. launchd 설치 스크립트가 현재 저장소 경로를 사용하고 로그를 남김
7. D3 문서와 TRACEABILITY 상태를 실제 테스트 결과에 맞춰 갱신

현재 D3 변경 파일은 작업트리에 존재하지만 아직 “완료”로 확정하지 않습니다.

## 3. 아직 해결하지 못한 것

### 3.1 D3 이후 남은 제품 기능

- FR-AGENT-07: 일정 기반 스케줄 제안
- FR-AGENT-08: 대시보드 에이전트 작업 큐
- FR-PROJ-03·04: Notion 프로젝트 연동
- FR-MAIL-02·03: 다중 계정 메일과 Email UI
- FR-CAL-01의 backend 실데이터 조회 전환
- Daily Brief 자동 실행의 실제 macOS launchd 동작 확인과 Linux cron 확인

### 3.2 Phase E 미착수 항목

- Supabase 실동기화
- 다중 사용자 인증과 `user_id` 분리
- Row Level Security
- 동기화 충돌 해결과 툼스톤 정책
- SQLite schema migration runner
- Docker 배포
- electron-builder 패키징과 3개 OS 산출물

현재 Supabase 연결 상태가 `ok`라고 해서 위 항목이 완료된 것은 아닙니다. 현재 완료 범위는 연결 진단뿐입니다.

### 3.3 실제 사용자 환경 검증

자동 테스트와 문서 검사는 통과했지만 다음은 아직 로컬 수동 확인이 필요합니다.

- Electron 창 실행
- production `dist` 로딩
- 브라우저/Electron에서 할일·프로젝트·캘린더 CRUD 및 상태 전환
- 위젯 이동·리사이즈·추가·삭제·레이아웃 복원
- 테마·표시 설정 저장과 새로고침 복원
- 다이어그램 SVG 렌더링과 개별 블록 오류 폴백
- backend 중단 시 ErrorBanner와 위젯별 ErrorBoundary
- D3 Brief 위젯의 로딩·빈 상태·Notion 링크 복사
- macOS 외 Windows/Linux 실행

### 3.4 남은 비기능 요구사항

- NFR-REL-04 오프라인 캐시 조회의 실제 비행기 모드 검증
- NFR-REL-06 Electron 자식 프로세스 종료 연동
- NFR-SEC-07 일부 입력 검증 보완(`due_date` 형식, 빈 title 덮어쓰기 등)
- NFR-OBS-02 실제 agent 4단계 로그 확인
- NFR-PERF-01 Mermaid 초기 로딩 시간 측정 및 대용량 chunk 판단
- NFR-DEPLOY-01 Docker 실행
- NFR-DEPLOY-02 electron-builder 패키징

## 4. 상태별 다음 순서

| 순서 | 상태 | 작업 | 완료 기준 |
|---:|---|---|---|
| 1 | 해결 확인 | D3 변경분 테스트·검증 | backend/agent/frontend/verify 통과 |
| 2 | 해결 확인 | D3 문서 상태 갱신 | TRACEABILITY·PROGRESS·README 일치 |
| 3 | 사용자 확인 | Electron·브라우저 UI 검증 | C3~C6 및 D3 체크리스트 완료 |
| 4 | 미착수 | Phase E 인증·Supabase 동기화 | 다중 사용자·충돌 정책 구현 |
| 5 | 미착수 | Docker·Electron 패키징 | 실제 산출물 실행 확인 |

## 최종 결론

현재 프로젝트는 C6까지의 위젯 기반 대시보드와 D2-b까지의 Google OAuth·Gmail·Calendar 캐시 기반이 해결된 상태입니다. `uncaughtException`, services 계층, 다이어그램·링크 정합성 문제도 해결됐습니다.

현재 만들어지는 핵심은 D3 Daily Brief 기능입니다. Brief API, Brief 위젯, Notion 결과 연결, launchd/cron 실행이 작업 중이며 최종 테스트와 수동 검증 전까지는 완료로 보지 않습니다.

아직 해결하지 못한 핵심은 Electron·브라우저 실제 검증과 Phase E의 Supabase 실동기화·인증·패키징입니다.
