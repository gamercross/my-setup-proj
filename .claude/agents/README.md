# 🤝 에이전트 모임 (Agent Team)

하나의 기능을 네 역할이 나눠 완성합니다.

| 친구 | 파일 | 역할 | 코드 수정 | 커밋 |
|---|---|---|:---:|:---:|
| 🧠 생각하는 친구 | `planner.md` | 조사 + 구현 계획 | ✕ | ✕ |
| 🛠️ 개발하는 친구 | `developer.md` | 계획대로 구현 | ○ | ✕ |
| 👀 감독하는 친구 | `supervisor.md` | diff 리뷰 + 검증, PASS/FAIL 판정 | ✕ | ✕ |
| ✅ 마무리하는 친구 | `finisher.md` | verify.sh + PROGRESS.md + 커밋·푸시 | 문서만 | ○ |

## 사용법

```
/feature Week 2 - TaskList/ProjectCard/Dashboard 컴포넌트와 tasks/projects 라우트 추가
```

조율은 [.claude/commands/feature.md](../commands/feature.md) 가 담당하며,
`planner → developer → supervisor → (필요 시 반복) → finisher` 순서로 진행됩니다.

## 슬랙 연동

### 1. 알림판 (Incoming Webhook) — 지금 바로

각 에이전트가 진행 상황을 채널에 보고하고, 매일 23:50 에 일일 요약이 올라옵니다.

1. Slack → **Incoming Webhooks** 앱 추가 → 채널 선택 → Webhook URL 복사
2. `.env` 에 `SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...` 추가
3. 끝. `/feature` 실행 시 각 단계가, 그리고 [scripts/worklog-eod.sh](../../scripts/worklog-eod.sh) 가 채널에 메시지를 보냅니다.

전송 스크립트: [scripts/slack-notify.sh](../../scripts/slack-notify.sh)
`bash scripts/slack-notify.sh "✅" "마무리하는 친구" "커밋 abc123 푸시 완료"`
(URL 미설정이면 조용히 넘어가므로 항상 호출해도 안전)

### 2. 양방향 입구 (Claude 슬랙 앱) — 슬랙에서 직접 지시

채널에서 `@Claude /feature ...` 로 파이프라인을 실행하고 스레드로 결과를 받습니다.

- 대화형 Claude Code 세션에서 `/install-slack-app` 실행
- claude.ai → 커넥터 설정에서 **`claude.ai Slack`** 커넥터 인증
- 저장소가 GitHub 에 올라가 있어야 함 (이 저장소: `gamercross/my-setup-proj`)

## 일일 작업로그

- 매 턴 종료 시 [scripts/worklog.sh](../../scripts/worklog.sh) 가 `작업로그.md` 의 **오늘 섹션**을 최신 커밋으로 다시 만듭니다 (하루 1섹션, 중복 없음).
- 매일 23:50 [launchd `com.aicomputeros.worklog`](../../scripts/com.aicomputeros.worklog.plist) 가 그날 섹션을 커밋·푸시하고 슬랙에 요약을 보냅니다.
- 설치: `cp scripts/com.aicomputeros.worklog.plist ~/Library/LaunchAgents/ && launchctl load ~/Library/LaunchAgents/com.aicomputeros.worklog.plist`
