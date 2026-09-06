# 📊 주간 진행 상황

> 실제 진행 상황을 추적하고 관리하는 문서 (매주 월요일 업데이트)

---

## 📋 사용 방법

### 매주 할 일
1. **월요일:** 이번주 계획 작성
2. **주중:** 진행 상황 업데이트
3. **금요일:** 주간 정리 및 다음주 계획
4. **완료하면:** 체크박스에 ✅ 표시

### 진행도 계산 (예시)
```
이번주 4개 작업 중 3개 완료
진행도 = 3/4 = 75%
```

---

## 🗓️ Week 1: 환경 설정 (09-02 ~ 09-08)

**목표:** Ubuntu 기본 설정 완료, Electron 앱 첫 실행  
**진행도:** 70% 🚧 (진행 중 — Phase A2·A3·B1 완료, 앱 창 수동 확인만 남음)

### 강의
- [ ] Chapter 01: 리눅스 설치와 기본 사용법
  - [ ] WSL2 우분투 설치
  - [ ] 기본 명령어 학습 (lsb_release, uname, whoami)
  - [ ] sudo apt 명령어

### 개발
- [ ] 프로젝트 저장소 생성 (GitHub)
  - GitHub 계정 확인: _______________
  - 저장소명: my-setup-proj
  - [ ] README.md 작성
  
- [x] 로컬 폴더 구조 생성 (`frontend`/`backend`/`agent`/`tests`/`docs`/`scripts`)

- [x] Node.js 설치 (Phase A2)
  - [x] `node --version` → v26.8.1 (Homebrew)
  - [x] `npm --version` → 11.19.0
  
- [x] Python 설정 (Phase A2)
  - [x] `python3 --version` → 3.14.4
  - [x] `agent/venv` 생성 + `pip install -r requirements.txt` 성공
  
- [x] `bash setup.sh` / `bash verify.sh` 통과 (12/0/0)
- [x] 백엔드 실행 검증 — `GET /`, `/api/health`, `POST /api/tasks`, `GET /api/tasks` curl 확인
- [ ] 첫 Electron 앱 (Phase B1)
  - [x] Vite 번들러 연결 → React 렌더 (`renderer.jsx` → `createRoot(<App/>)`, Phase B1)
  - [ ] 앱 창 실행 확인 (로컬 수동 — 샌드박스 electron 미기동)

### 배운 Linux 명령어
```bash
✅ lsb_release -a      # 버전 확인
✅ uname -r            # 커널 버전
✅ whoami              # 사용자
✅ pwd                 # 현재 경로
✅ mkdir               # 폴더 생성
✅ cd                  # 경로 이동
✅ ls                  # 파일 목록
✅ sudo apt update     # 패키지 업데이트
```

### 문제점 & 해결
| 문제 | 해결 방법 | 상태 |
|------|---------|------|
| WSL2 설치 오류 | - | ⏳ |
| Node 버전 충돌 | - | ⏳ |
| 권한 오류 | - | ⏳ |

### 다음주 계획
- Git 커밋 방법 학습
- Electron + React 통합
- Claude API Key 설정
- Supabase 프로젝트 생성

### 진행 상황 요약
```
완료한 작업: 6개 (폴더 구조, Node 설치, Python venv, setup/verify 통과, 백엔드 실행 검증, Vite+React 마운트 = B1)
진행 중: 1개 (Electron 앱 창 수동 확인)
예정된 작업: 1개

진행도: 70%
강의 수강: 0%
개발: 72%
```

> Phase A2·A3·B1·B2·C1·C2·C3·C4·C5 완료, B3·C2 코드 배선 완료 (C4·C5: 2026-09-06). 다음: C6(위젯 커스터마이즈) 또는 D2(실 캘린더/노션 연동), B3~C5 브라우저 E2E 로컬 검증.
> 검증 스냅샷: `node v26.8.1 / npm 11.19.0 / python 3.14.4`, `verify.sh` 23/0/0, `npm test` 51/0, `pytest -m "not network"` 3 pass, `frontend npm run build` 성공.

---

## 🗓️ Week 2: 기본 프로젝트 구축 (09-09 ~ 09-15)

**목표:** Electron + React 기본 UI 완성, Express 서버 실행  
**진행도:** 92% 🚧 (진행 중 — Phase B1·B2·C1·C2·C3·C4·C5 완료, B3·C2 코드 배선 완료 / 브라우저 E2E·수동체크 로컬 대기)

### 강의
- [ ] Chapter 02: 디렉토리와 파일 사용법
  - [ ] file 명령어
  - [ ] grep, find 명령어
  - [ ] whereis, which 명령어

### 개발
- [x] React 컴포넌트 기본 구조
  - [x] 기본 컴포넌트 생성 (TaskList / ProjectCard / Dashboard 스캐폴드, `import React` + JSX)
  - [x] 번들러(Vite) 연결 → Phase B1 (`vite.config.js`, `renderer.jsx` 마운트, `App` 렌더)
- [x] Express CRUD 라우트 골격
  - [x] `routes/tasks.js` — 할일 CRUD (GET/POST/PUT/DELETE)
  - [x] `routes/projects.js` — 프로젝트 CRUD
  - [x] `db.js` 인메모리 저장소 확장 (id 시퀀스, projects)
  - [x] `routes/api.js` 서브라우터 연결
  - [x] **실행 검증 완료** (Phase A2) — `npm start` → curl 로 health·CRUD 왕복 확인
- [x] `backend/db/schema.sql` 확정 (6개 테이블 + `tasks.project_id` FK, ADR-0009~0012 채택)
- [x] 자동화 테스트 골격 (Phase A3)
  - [x] `backend/test/` — supertest 통합 15케이스 (TC-TASK-01,02,04~10 / TC-PROJ-01~06), `:memory:` DB
  - [x] `backend/src/app.js` 분리 (server.js 가 import 시 listen 하던 문제 해결)
  - [x] `agent/tests/` — pytest 3케이스 (TC-AGENT-01~03), `test_claude.py` 이동
  - [x] CI 에 `npm test` · `pytest -m "not network"` 연결, `verify.sh` app.js 문법 체크 추가 (13/0/0)
- [x] SQLite 설정 (better-sqlite3 로 `db.js` 교체) → Phase B2 (2026-09-02)
  - [x] `DATABASE_PATH` 규약, WAL 모드 (`backend/db/index.js` 커넥션 싱글턴, `schema.sql` 런타임 멱등 적용)
  - [x] `backend/test/db.test.js` — TC-DB-01~03 (재시작 영속 / 인터페이스 불변 / 스키마 멱등+WAL)
  - [ ] 샘플 데이터 입력 (유보)
- [x] 백엔드 미들웨어 정식화 (Phase C1) → 완료 (2026-09-03, feature/c1-middleware)
  - [x] `backend/src/middleware/cors.js` — 로컬 오리진 화이트리스트 + `Origin: null` (prod Electron `file://`), NFR-SEC-06
  - [x] `backend/src/middleware/requestLogger.js` — 모든 요청 1줄, 체인 최상단, NFR-OBS-01
  - [x] `backend/src/middleware/errorHandler.js` — 404 / 깨진 JSON 400 / 413 / 500 표준 봉투
  - [x] `backend/test/middleware.test.js` — TC-MW-01~09. `npm test` 27/27, `verify.sh` 18/0/0
  - [x] dotenv 미도입 결정 (env 3개 기본값, 시크릿 0 — 재검토 D2)
- [x] 프론트↔백엔드 배선 (Phase B3) → 코드 배선 완료 (2026-09-03), 브라우저 E2E·수동체크는 로컬 대기
  - [x] `frontend/src/api/client.js` — fetch 래퍼 + 에러 정규화
  - [x] `frontend/src/store/useTaskStore.js` — zustand, fetch/add/toggle/remove (낙관적 갱신 + 롤백)
  - [x] `frontend/src/components/TaskForm.jsx` — 제목 입력·제출
  - [x] `frontend/src/components/ErrorBanner.jsx` / `ErrorBoundary.jsx` — FR-UI-04
  - [x] `Dashboard.jsx` / `App.jsx` 스토어·헬스체크 배선 (로딩/정상/빈/에러 4상태)
  - [ ] 브라우저 E2E (TC-UI-10~13) — C1 완료, 로컬 수동 확인 대기
  - [ ] GUI 수동 체크 M1~M7 — 로컬 수행 대기 (샌드박스 창 기동 불가)
- [x] 프로젝트 CRUD 프론트 배선 (Phase C2) → 완료 (2026-09-03, feature/c2-projects, 미푸시)
  - [x] `frontend/src/store/useProjectStore.js` — zustand, fetch/add/update/remove (낙관적 갱신 + 롤백)
  - [x] `frontend/src/components/ProjectForm.jsx` — 이름(필수)·진행도(선택) 입력
  - [x] `frontend/src/components/ProjectCard.jsx` — 상태 select·삭제 버튼·진행도 슬라이더 (`'hold'`→`'on_hold'` 통일)
  - [x] `Dashboard.jsx` — 프로젝트 패널 4상태 배선 (로딩/빈/정상/에러), 에러가 할일 패널 렌더를 막지 않음
  - [x] `backend/src/errors.js` — SQLite CHECK/NOTNULL/FK → 400 한국어 매핑 (TC-DB-04a~d)
  - [x] `tasks.project_id` 라우트 검증 (POST/PUT, ADR-0012) + API 응답 노출
  - [x] `npm test` 39/39, `verify.sh` 19/0/0, `npm run build` 성공
  - [ ] 브라우저 수동 체크 (TC-UI-14~16) — 로컬 수행 대기 (샌드박스 창 기동 불가)
  - 이월: 이름 인라인 수정 UI, `GET /api/tasks?project_id=` 필터, TaskForm 프로젝트 드롭다운, TaskList 배지
- [x] 캘린더 위젯 + `/api/calendar/events` (Phase C3, 더미 데이터) → 완료 (2026-09-06, feature/c3-calendar)
  - [x] `backend/src/services/calendar.js` — 더미 이벤트 생성 (실 Google 연동은 D2, ADR-0006/0011)
  - [x] `backend/src/routes/calendar.js` — `GET /api/calendar/events?from&to` (`from > to` 는 400 아닌 200 빈 목록)
  - [x] `backend/test/calendar.test.js` — TC-CAL-01~07
  - [x] `frontend/src/store/useCalendarStore.js` — zustand fetch + 날짜 배지 파생
  - [x] `frontend/src/components/CalendarWidget.jsx` + `Dashboard.jsx` 3패널 배선 (FR-CAL-01/02)
  - [x] `npm test` 46/46, `verify.sh` 21/0/0, `npm run build` 성공
  - [ ] 브라우저 수동 체크 (TC-UI-17~19) — 로컬 수행 대기 (샌드박스 창 기동 불가)
  - 이월: FR-CAL-03 (`calendar_events` 캐시 테이블 + 실 데이터) → D2
- [x] 다이어그램 뷰어 + `GET /api/diagrams` (Phase C4, ADR-0014 채택) → 완료 (2026-09-06, feature/c4-diagram-viewer)
  - [x] `backend/src/services/diagrams.js` — 의존성 없는 재귀 파싱 (`parseMermaidBlocks` 순수 함수, 깊이/파일/크기 상한), `DOCS_PATH`→저장소→`resourcesPath` 우선순위
  - [x] `backend/src/routes/diagrams.js` — `GET /api/diagrams?doc=`, docs 부재 시 200 빈 목록
  - [x] `backend/test/diagrams.test.js` — TC-DIAG-01~05
  - [x] `frontend/src/components/DiagramPanel.jsx` — `mermaid@11.17.2` 동적 import (별도 청크 ~683kB), 블록 단위 폴백, CSP 무완화 + `Dashboard.jsx` 배선 (FR-UI-05, G9 해소)
  - [x] `npm test` 51/51, `verify.sh` 23/0/0, `npm run build` 성공 (mermaid 별도 청크)
  - [ ] 브라우저 수동 체크 (TC-UI-09 계열) — 로컬 수행 대기 (샌드박스 창 기동 불가)
  - 이월: `electron-builder` `extraResources` 로 `docs/` 실배선 → E3
- [x] 위젯 셸 — 대시보드 OS (Phase C5, ADR-0020/0021 채택 · ADR-0022 골격) → 완료 (2026-09-06, feature/c5-widget-shell)
  - [x] DASHBOARD_OS §8 DO-1~6 결정 (RGL·타입당 1개·localStorage·프론트 검증·편집 토글·다이어그램 위젯화)
  - [x] `frontend/src/widgets/{registry,defaultLayout,layoutStorage,themeVars}.js` + `widgets/views/{Tasks,Projects,Calendar,Diagrams}WidgetView.jsx`
  - [x] `frontend/src/store/useLayoutStore.js` — zustand instances[]·editMode·focusedId, 300ms 디바운스 localStorage 저장, 훼손 시 기본값 폴백
  - [x] `frontend/src/components/{WidgetShell,WidgetHost,WidgetFrame,WidgetPicker}.jsx` — `react-grid-layout` 2.2.4 `/legacy` 서브패스, `react-resizable` 3.2.0 핀
  - [x] 기존 4패널을 위젯 뷰로 이관하고 `frontend/src/components/Dashboard.jsx` 삭제, 위젯별 `ErrorBoundary` 격리 (FR-WIDGET-01~04·07·08)
  - [x] `frontend npm run build` 성공, `backend npm test` 51/51, `verify.sh` 23/0/0 (`--code-only` 16/0/0)
  - [ ] 브라우저 수동 체크 (TC-WIDGET-01~08) — 로컬 수행 대기 (샌드박스 창 기동 불가)
  - 이월: 위젯별 테마·표시 옵션 (`themeToVars` 화이트리스트, `WidgetSettings`) → C6

### 배운 Linux 명령어
```bash
file                   # 파일 타입 확인
grep                   # 텍스트 검색
find                   # 파일 검색
ls -la                 # 상세 정보
wc -l                  # 줄 수 세기
```

### 진행 상황 요약
```
완료한 작업: 11개 (React 컴포넌트 스캐폴드, 번들러(Vite) 연결 = B1, Express CRUD 라우트, 자동화 테스트 골격 + CI, SQLite 교체 = B2, 프론트↔백엔드 코드 배선 = B3, 백엔드 미들웨어 정식화 = C1, 프로젝트 CRUD 프론트 배선 + errors.js + tasks.project_id = C2, 캘린더 위젯 + /api/calendar/events 더미 = C3, 다이어그램 뷰어 + /api/diagrams = C4, 위젯 셸 대시보드 OS + Dashboard.jsx 삭제 = C5)
진행 중: 1개 (B3·C2·C3·C4·C5 브라우저 E2E·GUI 수동체크 — 로컬 대기)
예정된 작업: 1개 (샘플 데이터)

진행도: 89%
강의 수강: 0%
개발: 94%
```

---

## 🗓️ Week 3: 권한 & 파이썬 (09-16 ~ 09-22)

**목표:** 파일 권한 관리, Python 개발 환경 완성  
**진행도:** 0% ⏳ (예정)

### 강의
- [ ] Chapter 03: 파일 접근 권한 관리
  - [ ] chmod 명령어
  - [ ] chown 명령어
  - [ ] umask

### 개발
- [ ] Python 패키지 설치
  - [ ] requirements.txt 작성
  - [ ] pip install 실행
  
- [ ] 첫 Claude API 테스트
  - [ ] test_claude.py 작성
  - [ ] API 호출 확인

### 배운 Linux 명령어
```bash
chmod 755              # 권한 설정
chmod +x script.sh     # 실행 권한
chown user:group file  # 소유권 변경
ls -l                  # 권한 확인
umask -S               # 기본 권한
```

### 진행 상황 요약
```
완료한 작업: 0개
진행 중: 0개
예정된 작업: 7개

진행도: 0%
강의 수강: 0%
개발: 0%
```

---

## 📈 전체 진행도 추이

```
Week 1  ███████░░░ 70%
Week 2  ███████░░░ 65%
Week 3  ████░░░░░░ 40%
Week 4  ███░░░░░░░ 30%  (FR-PROJ-01/02 프론트 배선 = Phase C2, 2026-09-03)
Week 5  █████░░░░░ 45%  (FR-CAL-01/02 캘린더 위젯 = C3; FR-UI-05 다이어그램 뷰어 = C4; FR-WIDGET-01~04·07·08 위젯 셸 = C5, 2026-09-06)
...
Week 14 ░░░░░░░░░░  0%
```

---

## 📊 전체 마일스톤

| 이벤트 | 예정일 | 상태 |
|--------|--------|------|
| Phase 1 완료 (환경 설정) | 2026-09-15 | ⏳ |
| Phase 2 완료 (핵심 기능) | 2026-10-06 | ⏳ |
| 중간고사 | 2026-10-27 | ⏳ |
| 과제 1 발표 | 2026-10-27 | ⏳ |
| Phase 3 완료 (AI 통합) | 2026-10-20 | ⏳ |
| Phase 4 완료 (배포) | 2026-11-24 | ⏳ |
| 기말고사 | 2026-12-08 | ⏳ |
| 과제 2 발표 | 2026-12-08 | ⏳ |
| **최종 완료** | **2026-12-15** | **⏳** |

---

## 💡 주간 템플릿 (복사해서 사용)

```markdown
## 🗓️ Week X: [주제] (MM-DD ~ MM-DD)

**목표:** [주간 목표]  
**진행도:** 0% ⏳ (예정)

### 강의
- [ ] Chapter X: [강의 주제]
  - [ ] 세부 내용 1
  - [ ] 세부 내용 2

### 개발
- [ ] 기능 1
  - [ ] 세부 작업
  
- [ ] 기능 2
  - [ ] 세부 작업

### 배운 Linux 명령어
\`\`\`bash
명령어1        # 설명
명령어2        # 설명
\`\`\`

### 문제점 & 해결
| 문제 | 해결 방법 | 상태 |
|------|---------|------|
| 문제1 | 해결방법1 | ⏳ |
| 문제2 | 해결방법2 | ⏳ |

### 다음주 계획
- 작업 1
- 작업 2
- 작업 3

### 진행 상황 요약
\`\`\`
완료한 작업: X개
진행 중: X개
예정된 작업: X개

진행도: X%
강의 수강: X%
개발: X%
\`\`\`
```

---

## 🎯 중요 체크포인트

### Phase 1 완료 (Week 1-2)
```
Requirements:
✅ GitHub 저장소 생성
✅ 폴더 구조 정리
✅ Node.js + npm 설치
✅ Python 환경 구성
✅ Electron 앱 첫 실행
✅ Express 서버 동작
✅ SQLite 데이터베이스 생성
✅ 첫 커밋 완료

Deadline: 2026-09-15
```

### Phase 2 완료 (Week 3-5)
```
Requirements:
✅ 할일 CRUD 기능
✅ Notion API 연동
✅ Google Calendar 동기화
✅ 기본 UI 완성
✅ 로컬/클라우드 동기화

Deadline: 2026-10-06
```

### Phase 3 완료 (Week 6-8)
```
Requirements:
✅ Claude API 기본 동작
✅ Daily Brief 에이전트
✅ 이메일 요약 기능
✅ Cron 자동화
✅ 중간고사 & 과제 1

Deadline: 2026-10-20
```

### Phase 4 완료 (Week 9-13)
```
Requirements:
✅ 이메일 통합
✅ 다중 사용자 지원
✅ Mini Coding Agent
✅ Docker 배포
✅ 성능 최적화
✅ 보안 강화

Deadline: 2026-11-24
```

---

## 📝 노트

### 일반적인 문제와 해결책

```
Q: Electron 앱이 실행 안 됨
A: 1. npm install 다시 실행
   2. node_modules 삭제 후 재설치
   3. npm start 실행

Q: SQLite 권한 오류
A: 1. 파일 권한 확인 (ls -l)
   2. chmod 644 app.db 실행
   3. 소유자 확인

Q: Git 커밋 실패
A: 1. git status 확인
   2. git add . 실행
   3. git commit -m "메시지" 실행

Q: 패키지 설치 실패
A: 1. npm cache clean --force
   2. npm install 다시 실행
   3. 권한 확인 (sudo 필요시)
```

### 학습 팁

```
1. 매일 조금씩 진행하기
   - 하루에 2-3시간 코딩
   - 강의 1-2개 섹션

2. 명령어 외우기
   - 자주 사용하는 명령어부터
   - alias 설정으로 단축

3. Git 습관
   - 매일 커밋
   - 의미 있는 메시지 작성

4. 문서 정리
   - 배운 내용 기록
   - 에러와 해결 방법 정리
```

---

## 🔗 관련 문서

- [README.md](../../README.md) - 프로젝트 개요
- [ROADMAP.md](../product/ROADMAP.md) - 상세 로드맵
- [SETUP.md](../setup/SETUP.md) - 개발 환경 설정
- [ARCHITECTURE.md](../product/architecture/ARCHITECTURE.md) - 기술 스택
- [CLAUDE_INTEGRATION.md](../setup/CLAUDE_INTEGRATION.md) - Claude API
- [COURSE_MAPPING.md](COURSE_MAPPING.md) - 강의 연결

---

## 💾 커밋 메시지 컨벤션

```bash
# 기능 추가
git commit -m "feat: [기능명] 추가"
git commit -m "feat: Week 1 환경 설정 완료"

# 버그 수정
git commit -m "fix: [버그명] 수정"
git commit -m "fix: 캘린더 동기화 오류 수정"

# 문서
git commit -m "docs: [내용] 작성/수정"
git commit -m "docs: PROGRESS.md Week 1 업데이트"

# 스타일
git commit -m "style: 코드 포매팅"

# 리팩토링
git commit -m "refactor: [부분] 개선"
```

---

**마지막 업데이트:** 2026-09-02  
**다음 업데이트:** 2026-09-09 (매주 월요일)

> 💡 **팁:** 매주 금요일에 이 파일을 검토하고 다음주 계획을 추가하세요!
