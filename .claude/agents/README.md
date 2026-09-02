# 🤝 에이전트 모임 (Agent Team)

하나의 기능을 네 역할이 나눠 완성합니다. 상세 규칙은 [docs/setup/AUTOMATION.md](../../docs/setup/AUTOMATION.md) ·
오케스트레이션 그래프는 [docs/setup/ORCHESTRATION.md](../../docs/setup/ORCHESTRATION.md).

| 친구 | 파일 | 모델 | 역할 | 코드 수정 | 커밋 |
|---|---|---|---|:---:|:---:|
| 🧠 생각하는 친구 | `planner.md` | opus | 요구사항 분해 + 구현 계획 | ✕ | ✕ |
| 🛠️ 개발하는 친구 | `developer.md` | sonnet | 계획대로 구현 (범위 밖 금지) | ○ | ✕ |
| 👀 감독하는 친구 | `supervisor.md` | opus | diff 리뷰 + 수용기준·테스트 확인 + verify → PASS/CHANGES_NEEDED | ✕ | ✕ |
| ✅ 마무리하는 친구 | `finisher.md` | sonnet | 검증 게이트 → PROGRESS·TRACEABILITY 갱신 → 커밋·푸시 ([GIT_WORKFLOW.md](../../docs/setup/GIT_WORKFLOW.md)) | 문서만 | ○ |

## 사용법

```
/feature Phase A3 - backend supertest 스모크 + agent pytest + CI에 테스트 연결
```

조율은 [.claude/commands/feature.md](../commands/feature.md) 가 담당하며,
`planner → developer → supervisor → (CHANGES_NEEDED 면 최대 2회 반복) → finisher` 순서로 진행됩니다.
로드맵을 자동으로 따라가는 상위 루프는 [.claude/commands/build-next.md](../commands/build-next.md).

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

- 날짜별로 **요약**(finisher·사람 작성) + **커밋**(자동). 매 턴 종료 시 [scripts/worklog.sh](../../scripts/worklog.sh) 가 전체 이력에서 커밋 섹션을 다시 만들고, `<!-- SUMMARY:날짜 -->` 요약 블록은 보존합니다.
- 매일 23:50 [launchd `com.aicomputeros.worklog`](../../scripts/com.aicomputeros.worklog.plist) 가 커밋·푸시하고 그날 요약을 슬랙에 보냅니다.
- 설치: `cp scripts/com.aicomputeros.worklog.plist ~/Library/LaunchAgents/ && launchctl load ~/Library/LaunchAgents/com.aicomputeros.worklog.plist`
