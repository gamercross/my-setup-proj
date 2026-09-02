# 📏 개발 컨벤션 (Conventions)

> 코드·구조·커밋·에이전트 작업 규칙의 **단일 원천**.
> 이전에는 `.claude/agents/*.md`, [AUTOMATION.md](AUTOMATION.md), [PROGRESS.md](../progress/PROGRESS.md) 에
> 흩어져 있던 규칙을 여기로 모았다. 다른 문서는 이 문서를 링크로 참조한다.

---

## 1. 코드 작성

| 규칙 | 내용 |
|---|---|
| 주석 언어 | **한국어**. "왜"를 설명하고, 자명한 "무엇"은 생략. |
| 구현 범위 | **최소 실행 가능 수준**. 과설계·미리 만들기 금지. 계획에 없는 범위는 건드리지 않는다. |
| 에러 처리 | 모든 외부 호출·파일 IO·네트워크에 `try/catch`(JS) / `try/except`(Py). 실패 시 사용자 친화적 메시지 + 앱은 계속 동작 (NFR-REL-01, 02). |
| 시크릿 | `.env` 값을 코드에 **하드코딩 금지**. 설명은 [ENV_REFERENCE.md](ENV_REFERENCE.md). |
| 계층 분리 | `routes → services → db`. 라우트에 비즈니스 로직·SQL 금지 (NFR-MAINT-02). |
| DB 인터페이스 | `backend/src/db.js` 의 `getX/addX/updateX/deleteX` 시그니처는 저장소가 바뀌어도 유지 (NFR-MAINT-03). |
| 스타일 일관성 | 새 파일은 주변 파일의 네이밍·주석 밀도·관용구에 맞춘다. |

## 2. 네이밍

| 대상 | 규칙 | 예 |
|---|---|---|
| JS 파일 | camelCase 또는 kebab, 기존 폴더 관례 따름 | `taskService.js`, `db.js` |
| JS 함수·변수 | camelCase | `getTasks`, `taskSeq` |
| React 컴포넌트 파일 | PascalCase `.jsx` | `TaskList.jsx` |
| Python 파일·함수 | snake_case | `daily_brief.py`, `build_context()` |
| DB 테이블·컬럼 | snake_case, 복수형 테이블 | `tasks`, `due_date` |
| API JSON 필드 | snake_case (DB 컬럼과 일치) | `due_date`, `is_read` |
| 요구사항 ID | [GLOSSARY.md](../product/GLOSSARY.md) §4 참조 | `FR-TASK-01` |

## 3. 폴더 책임

| 경로 | 책임 | 여기 두면 안 되는 것 |
|---|---|---|
| `frontend/src/` | Electron 메인 + React 렌더러 | 백엔드 로직, 시크릿 |
| `frontend/src/components/` | 순수 프레젠테이션 컴포넌트 | fetch 호출(→ `api/`), 전역 상태(→ `store/`) |
| `frontend/src/api/` | fetch 래퍼, 에러 정규화 | UI 로직 |
| `frontend/src/store/` | zustand 스토어 | 컴포넌트 |
| `backend/src/routes/` | HTTP 요청/응답 매핑, 입력 검증 | 비즈니스 로직, SQL |
| `backend/src/services/` | 비즈니스 로직 | HTTP 객체(req/res) 참조 |
| `backend/src/db.js` / `backend/db/` | 저장소 접근, 스키마 | 도메인 규칙 |
| `agent/` | Python Claude 에이전트, 외부 API 연동 | 프론트/백엔드 코드 |
| `agent/services/` | 외부 API 래퍼 1개당 1파일 | 스케줄링 로직(→ `daily_brief.py`) |
| `scripts/` | 로컬 자동화 셸 스크립트 | 애플리케이션 코드 |
| `docs/product/` | 무엇을 만드는가 (비전·분석·요구사항·설계) | 세팅 절차 |
| `docs/setup/` | 어떤 세팅이 필요한가 | 진행 상황 |
| `docs/progress/` | 얼마나 됐는가 | 설계 결정 |

## 4. Claude API 사용

| 규칙 | 값 |
|---|---|
| 모델 | `claude-opus-5` (최신). 하위 에이전트 모델 지정은 각 `.claude/agents/*.md` 프론트매터. |
| 사고 모드 | `thinking: {type: "adaptive"}` |
| 상수 관리 | 모델명은 `agent/services/claude.py` 의 `DEFAULT_MODEL` 한 곳. 다른 곳에서 문자열 반복 금지. |
| 인증 | `ANTHROPIC_API_KEY` 환경변수 또는 `ant auth login` 프로필. 코드에 키 없음. |
| 실패 처리 | 호출 실패가 앱 크래시로 이어지지 않는다 (NFR-REL-02). 원인을 로그·사용자 메시지로 노출. |

## 5. 커밋 · 푸시

**에이전트의 커밋·푸시 전체 절차는 [GIT_WORKFLOW.md](GIT_WORKFLOW.md) 가 단일 원천이다.** 핵심만:

| 규칙 | 내용 |
|---|---|
| 메시지 형식 | `<타입>: <내용>` — `feat` / `fix` / `docs` / `style` / `refactor` / `chore` |
| 언어 | 한국어 제목. 본문에 무엇을·왜 2~4줄. 검증을 일부 못 했으면 그 사실을 본문에. |
| 예 | `feat: 할일 CRUD 프론트엔드 연결`, `docs: 요구사항 문서 추가` |
| 꼬리말 | `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` (+ 세션 지정 시 `Claude-Session:` 줄) |
| 커밋 단위 | 한 커밋 = 한 논리적 변경. 섞이면 나눈다. |
| 범위 | `my-setup-proj/` 밖 파일·`.gitignore` 대상 스테이징 금지. |
| 작업로그 | `작업로그.md` 는 Stop 훅 담당 → **직접 수정하지 않는다.** |
| 금지 | `git push --force`, `main` 강제 푸시, 실행 안 한 검사를 "통과"로 보고 |

## 6. 브랜치 전략

| 시기 | 정책 |
|---|---|
| **지금 (초기 셋업 · Week 1~2)** | `main` 직접 커밋 허용 (구조 정리·문서·스캐폴드 단계) |
| **Week 3~ (기능 개발)** | `main` 직접 커밋 금지. `feature/<짧은-이름>` 에서 작업 → 푸시. `main` 은 통과된 것만 |

> `/feature` 오케스트레이터가 단계 시작 시 브랜치를 확인하고, Week 3 이후 `main` 위면 먼저 브랜치를 만든다. 자세히는 [GIT_WORKFLOW.md](GIT_WORKFLOW.md) §2.

## 7. 에이전트 파이프라인 규칙

- **한 기능 = `/feature` 1회.** 임의로 여러 기능을 한 번에 처리하지 않는다.
- 각 에이전트는 이전 단계 결과를 명확한 컨텍스트로 다음 에이전트에 넘긴다.
- 에이전트가 계획 범위를 벗어나야 하면 **임의 진행 금지** — 이유와 함께 보고하고 멈춘다.
- supervisor 가 2회 반복 후에도 `CHANGES_NEEDED` 면 커밋하지 않고 사용자에게 보고.
- `verify.sh` 실패 시 finisher 는 절대 커밋·푸시하지 않는다.
- 각 단계 종료 시 `bash scripts/slack-notify.sh "<이모지>" "<이름>" "<한 줄>"` (webhook 없으면 조용히 스킵).

## 8. 문서 작성

- 한국어, 표·예시 중심, 스캔하기 쉽게.
- 추측 금지 — 모르면 "확인 필요"로 표시.
- 상호 링크: 관련 문서를 상단 인용구에 건다.
- 새 아키텍처 결정은 `adr/` 에 ADR 추가로만 (예정).
- 기능 완료 시 finisher 가 [PROGRESS.md](../progress/PROGRESS.md) 와 [TRACEABILITY.md](../product/TRACEABILITY.md)(예정) 상태를 갱신.

---

**작성:** 2026-09-02
