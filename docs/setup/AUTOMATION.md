# 🤖 자동화 셋업 (Claude Code Automation)

> 이 프로젝트에 붙어 있는 "사람이 안 해도 되는 일" 목록.
> 에이전트 팀 · `/feature` 파이프라인 · 작업로그 자동화 · 슬랙 알림 · GitHub Actions 로 구성된다.

주간 계획은 [PROGRESS.md](../progress/PROGRESS.md), 일일 커밋 기록은 [작업로그.md](../../작업로그.md) 를 본다.

---

## 1. 에이전트 팀 (`.claude/agents/`)

하나의 기능을 네 역할이 나눠 완성한다. 각 역할은 별도 서브에이전트로 분리돼 있어
권한(코드 수정 / 커밋)이 역할별로 제한된다.

| 친구 | 파일 | 모델 | 역할 | 코드 수정 | 커밋 |
|---|---|---|---|:---:|:---:|
| 🧠 생각하는 친구 | `planner.md` | opus | 문서·코드베이스 조사 후 구현 계획 작성 | ✕ | ✕ |
| 🛠️ 개발하는 친구 | `developer.md` | sonnet | 계획대로만 구현 (범위 밖 금지) | ○ | ✕ |
| 👀 감독하는 친구 | `supervisor.md` | opus | diff 리뷰 + `verify.sh`·문법 검증, `PASS` / `CHANGES_NEEDED` 판정 | ✕ | ✕ |
| ✅ 마무리하는 친구 | `finisher.md` | sonnet | 검증 게이트 → `PROGRESS.md` 갱신 → 커밋·푸시 ([GIT_WORKFLOW.md](GIT_WORKFLOW.md)) | 문서만 | ○ |

핵심 규칙:

- developer 는 `.env` 하드코딩 금지, 한국어 주석, 과설계 금지, **커밋 안 함**.
- finisher 는 실제로 실행돼 FAIL 난 검사가 있으면 커밋하지 않고, `git push --force`·`main` 강제 푸시 금지. 브랜치 정책은 [GIT_WORKFLOW.md](GIT_WORKFLOW.md) §2.
- Claude 모델은 최신(`claude-opus-5` 등)을 쓴다. 상세 규칙은 [CONVENTIONS.md](CONVENTIONS.md).

---

## 2. `/feature` 파이프라인 (`.claude/commands/feature.md`)

```
/feature Week 3 - Supabase 테이블 스키마와 마이그레이션 스크립트 추가
```

오케스트레이터가 직접 코딩하지 않고 아래 순서로 위임한다:

```mermaid
flowchart LR
  U([사용자: /feature 설명]) --> O[오케스트레이터]
  O --> P["🧠 planner<br/>구현 계획"]
  P --> D["🛠️ developer<br/>계획대로 구현<br/>(커밋 X)"]
  D --> S{"👀 supervisor<br/>리뷰 + verify"}
  S -- CHANGES_NEEDED --> D
  S -- "2회 초과 실패" --> STOP([중단: 사용자 보고<br/>커밋 안 함])
  S -- PASS --> F["✅ finisher<br/>검증 게이트 → PROGRESS 갱신<br/>→ 커밋 → push"]
  F --> R([최종 보고:<br/>커밋 해시·변경 요약·다음 할 일])
  P -. slack .-> SL[(슬랙 알림)]
  D -. slack .-> SL
  S -. slack .-> SL
  F -. slack .-> SL
```

- `CHANGES_NEEDED` 반복은 **최대 2회**. 그래도 통과 못 하면 커밋하지 않고 멈춘다.
- 각 단계 종료 시 슬랙에 한 줄 알림 (`scripts/slack-notify.sh`, webhook 없으면 조용히 스킵).
- 커밋·푸시 판정 규칙은 [GIT_WORKFLOW.md](GIT_WORKFLOW.md), 상태 전이·정지 조건은 [ORCHESTRATION.md](ORCHESTRATION.md).

### `/build-next` — 로드맵 자동 진행 (`.claude/commands/build-next.md`)

`/feature` 를 사람이 매번 부르는 대신, `/build-next` 가 [DESIGN.md](../product/DESIGN.md) §8 +
[TRACEABILITY.md](../product/TRACEABILITY.md) 를 읽어 **다음 스텝을 스스로 골라** `/feature` 를 반복한다.
제안 상태 ADR 미결정·`.env` 키 누락·대화형 준비 필요 등 **사람이 결정할 지점에서만 멈춘다**
(정지 상태와 보고 내용은 [ORCHESTRATION.md](ORCHESTRATION.md) §3). 한 호출당 최대 3스텝.

---

## 3. 작업로그 자동화

두 단계로 나뉜다.

### 매 턴 종료 — `scripts/worklog.sh` (Stop 훅)

`.claude/settings.json` 의 `Stop` 훅이 매 턴 끝에 호출한다.

- 오늘 날짜(`## YYYY-MM-DD`) 섹션을 그날의 커밋 목록으로 **다시 만든다**.
- 하루에 섹션 하나만 유지되고, 여러 번 호출돼도 중복되지 않는다.
- 커밋·푸시·슬랙 전송은 하지 않는다. 파일만 갱신.
- 타임아웃 20초, 실패해도 세션을 막지 않는다 (`|| true`).

### 매일 23:50 — `scripts/worklog-eod.sh` (launchd)

`scripts/com.aicomputeros.worklog.plist` 예약 작업이 실행한다.

1. `worklog.sh` 로 오늘 섹션을 최신화
2. `작업로그.md` 에 변경이 있으면 `docs: 작업로그 <날짜>` 로 커밋 후 현재 브랜치에 푸시
3. 오늘 섹션 본문을 슬랙 채널에 요약 전송

설치:

```bash
cp scripts/com.aicomputeros.worklog.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.aicomputeros.worklog.plist
```

해제는 `launchctl unload ...` 후 파일 삭제. 시간 변경은 plist 의 `Hour`/`Minute` 수정 후 unload → load.

> ⚠️ plist 안의 경로가 `/Users/jaeyeup/proj/my-setup-proj/my-setup-proj` 로 하드코딩돼 있다.
> 다른 컴퓨터·경로에서는 plist 의 `ProgramArguments` / `WorkingDirectory` / 로그 경로를 고쳐야 한다.

---

## 4. 슬랙 알림 (`scripts/slack-notify.sh`)

```bash
bash scripts/slack-notify.sh "✅" "마무리하는 친구" "커밋 abc123 푸시 완료"
```

- `.env` 의 `SLACK_WEBHOOK_URL` 을 읽는다. **없으면 조용히 종료**하므로 항상 호출해도 안전하다.
- 발급: Slack → Apps → *Incoming Webhooks* → Add to Slack → 채널 선택 → URL 복사 → `.env` 에 추가.
- (선택) 양방향: 대화형 세션에서 `/install-slack-app` 실행 + claude.ai 커넥터 인증 → 슬랙에서 `@Claude /feature ...` 로 직접 실행.

---

## 5. GitHub Actions (`.github/workflows/test.yml`)

모든 브랜치 push 와 PR 에서 실행. 빌드는 안 하고 **문법 검사만** 한다 (Week 1 수준).

| job | 하는 일 |
|---|---|
| `backend` | `npm install` → `node -c src/server.js` |
| `frontend` | `npm install` → `node -c src/main.js` |
| `agent` | `pip install -r requirements.txt` → `python -m compileall .` |

---

## 6. 로컬 검증 스크립트

| 스크립트 | 용도 |
|---|---|
| `setup.sh` | frontend/backend `npm install` + agent Python venv 생성·설치, `.env` 없으면 `.env.example` 복사 |
| `verify.sh` | 환경(설치·의존성) + 주요 파일 문법 확인. `--code-only` 로 문법만. 검사 도구가 없으면 SKIP(실패 아님). 커밋 판정 규칙은 [GIT_WORKFLOW.md](GIT_WORKFLOW.md) |

커밋·푸시 시 에이전트가 따르는 규칙은 [GIT_WORKFLOW.md](GIT_WORKFLOW.md) 에 정리돼 있다 (검증 게이트 해석, 브랜치 정책, 미프로비저닝 머신 처리, 사후 CI 확인).

---

## 파일 한눈에

```
.claude/
  settings.json              # Stop 훅 → worklog.sh
  agents/{planner,developer,supervisor,finisher}.md
  agents/README.md
  commands/feature.md        # /feature — 한 기능 파이프라인
  commands/build-next.md     # /build-next — 로드맵 자동 진행 상위 루프
scripts/
  worklog.sh                 # 매 턴: 오늘 섹션 갱신
  worklog-eod.sh             # 23:50: 커밋·푸시·슬랙
  slack-notify.sh            # 슬랙 Incoming Webhook 전송
  render-diagrams.sh         # docs/ 의 Mermaid 블록 → SVG (docs/setup/DIAGRAMS.md)
  com.aicomputeros.worklog.plist   # launchd 예약 작업
.github/workflows/test.yml   # 문법 검사 CI
setup.sh / verify.sh         # 로컬 환경 구축·점검
```
