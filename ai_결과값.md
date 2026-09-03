# 문제 재확인 및 해결 방향

## 검토 범위

- 기준일: 2026-09-03
- 검토 대상: 저장소 문서, 실제 코드, 작업 중 확인된 Slack·launchd 동작
- 수정 대상: 이 파일(`ai_결과값.md`)만
- 목적: 확인된 문제를 질문과 답변 형식으로 정리하고, 로드맵상 진행 시점을 제안

## 종합 답변

제품의 큰 방향은 유지해도 됩니다. 현재 문제는 설계 방향보다 다음 세 영역에 집중되어 있습니다.

1. 앱 실행 시 Electron과 백엔드의 실행 책임이 확정되지 않음
2. 일부 문서에 과거 구현 상태가 남아 있음
3. Slack 알림과 launchd 예약 작업이 실제 운영 환경에서 정상 작동하지 않음

문서 일관성 문제는 다음 기능 구현 전에 정리해야 하고, Slack 운영 장애는 기다리지 말고 현재 바로 확인하는 것이 좋습니다.

## 문제와 답변

### Q1. Electron 앱을 실행하면 백엔드도 함께 실행되는가?

**답:** 현재 문서와 실행 명령만 보면 보장되지 않습니다.

Electron 렌더러는 `http://localhost:3000/api`를 호출하지만 `frontend/package.json`의 개발 명령은 Vite와 Electron만 실행합니다. 백엔드는 별도로 `cd backend && npm start`를 실행해야 합니다.

**문제점:**

- 앱만 실행하면 API 연결 오류가 발생할 수 있음
- 개발 환경에서 백엔드 시작 담당이 불명확함
- 패키징된 앱에서 백엔드를 어떻게 시작할지 정의되지 않음
- 백엔드 종료와 네트워크 단절을 어떻게 구분할지 실행 흐름이 필요함

**해결 방향:**

- 개발 환경: Vite, Electron, Express를 각각 실행할지 `frontend` 명령에서 함께 실행할지 결정
- 패키징 환경: Electron main process가 백엔드를 child process로 시작할지, 백엔드를 별도 서비스로 둘지 결정
- 백엔드 종료 시 `ErrorBanner`를 표시하고 재시도 또는 재기동하는 정책 정의
- 실행 명령과 프로세스 관계를 README·ARCHITECTURE·DESIGN에 같은 방식으로 기록

**로드맵 시점:** 지금 결정해야 하며, 실제 구현은 **Phase C2 이전**이 적절합니다. 프로젝트 화면 연결 전에 실행 구조가 확정되어야 합니다.

### Q2. 문서의 완료·예정 상태가 서로 다른 이유는 무엇인가?

**답:** 구현이 진행된 뒤 과거 상태 설명이 일부 남아 있기 때문입니다.

**확인된 예:**

- `API_REFERENCE.md`의 enum 검증 및 구현 차이 표에 과거 상태가 남아 있음
- `GLOSSARY.md`에 인메모리 DB와 `schema.sql` 예정 표현이 남아 있음
- `UI_SPEC.md`에는 `TaskForm`과 `ErrorBanner` 완료 내용과 과거 미구현 설명이 함께 있음
- `AS_IS.md`, `TRACEABILITY.md`, `PROGRESS.md`의 B1·B2·C1·B3 상태가 완전히 같지 않음

**해결 방향:** 상태를 다음 세 가지로 나눠 기록하는 것이 좋습니다.

- 코드 구현 여부
- 자동 테스트 통과 여부
- GUI·브라우저 수동 검증 여부

과거 상태가 필요한 경우에는 “과거 기록”이라고 표시하고, 현재 상태와 섞지 않아야 합니다.

**로드맵 시점:** 현재 진행 중인 C2 착수 전 정리하는 것이 가장 좋습니다. 늦어도 다음 기능의 finisher 단계에서 관련 문서를 함께 갱신해야 합니다.

### Q3. 데이터 모델 문제는 아직 남아 있는가?

**답:** 이전에 지적한 `emails.read`와 `emails.is_read` 문제는 `ARCHITECTURE.md`의 테이블 목록에서 상당 부분 보완되었습니다.

다만 환경 설정 예시는 아직 정리되지 않았습니다.

- 실제 SQLite 경로 기준: `DATABASE_PATH`
- 일부 문서 예시: `DATABASE_URL`
- 실제 기준 문서: `ADR-0009`, `ENV_REFERENCE.md`, `backend/db/index.js`

**해결 방향:** 현재 실행 기준을 `DATABASE_PATH`로 고정하고, `DATABASE_URL`은 향후 별도 도입 여부가 결정되기 전까지 예시에서 혼용하지 않는 것이 좋습니다. Supabase 관련 변수는 Supabase 도입 단계에서 별도 기준을 확정해야 합니다.

**로드맵 시점:** SQLite는 이미 B2에서 완료되었으므로, 설정 이름 정리는 **현재 문서 정리 작업**에서 처리해야 합니다. Supabase 변수와 동기화 규칙은 **Phase E1~E2, Week 10 전**에 확정하면 됩니다.

### Q4. Claude 모델 예시가 다른 이유는 무엇인가?

**답:** 현재 운영 규칙은 `claude-opus-5`인데 일부 예시 문서에 `claude-opus-4-6`이 남아 있습니다.

**해결 방향:**

- 실제 코드의 `DEFAULT_MODEL`을 현재 기준으로 사용
- 문서 예시와 테스트 예시의 모델명을 동일하게 맞춤
- 모델 변경 시 `CONVENTIONS.md`, `CLAUDE_INTEGRATION.md`, 요구사항을 함께 검토

**로드맵 시점:** Claude 에이전트 구현을 시작하는 **Phase D1, Week 6** 전에 정리해야 합니다.

### Q5. Slack 알림이 아무것도 보이지 않는 이유는 무엇인가?

**답:** 현재 확인된 핵심 원인은 `SLACK_WEBHOOK_URL`이 비어 있기 때문입니다.

`slack-notify.sh`는 URL이 없으면 조용히 종료하도록 작성되어 있습니다. 따라서 오류 메시지 없이 다음 알림이 모두 생략됩니다.

- `/feature` 단계별 알림
- 매일 23:50 작업로그 요약

**해결 방향:**

1. Slack Incoming Webhook을 발급
2. 사용자가 직접 `.env`에 `SLACK_WEBHOOK_URL` 설정
3. 다음 명령으로 알림 테스트

```bash
bash scripts/slack-notify.sh "테스트" "연결 확인"
```

Webhook URL은 비밀값이므로 채팅에 공유하지 않고 직접 `.env`에 입력하는 방식이 안전합니다.

**로드맵 시점:** 제품 기능을 기다릴 필요 없이 **현재 즉시** 처리합니다. 기존 Phase 1 자동화 인프라의 운영 보완 작업입니다.

### Q6. Slack Webhook을 설정했는데도 매일 요약이 안 오면 무엇을 확인해야 하는가?

**답:** launchd에 등록된 plist가 오래된 경로를 가리키는지 확인해야 합니다.

현재 확인된 상태는 다음과 같습니다.

- `launchctl list`에는 `com.aicomputeros.worklog`가 등록되어 있음
- 마지막 실행 결과가 `exit 127`로 확인됨
- 설치된 plist가 이전 경로(`/Users/jaeyeup/2026project/...`)를 가리킴
- 현재 저장소 경로와 설치된 plist의 경로가 다름

`exit 127`은 명령 또는 파일을 찾지 못한 경우에 발생하므로, 예약 작업이 등록되어 있어도 실제 스크립트가 실행되지 않는 상태로 판단됩니다.

**해결 방향:**

```bash
launchctl unload ~/Library/LaunchAgents/com.aicomputeros.worklog.plist
cp scripts/com.aicomputeros.worklog.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.aicomputeros.worklog.plist
```

그 다음 plist의 `ProgramArguments`, `WorkingDirectory`, 로그 경로가 현재 저장소 경로를 가리키는지 확인해야 합니다. 다른 컴퓨터에서는 사용자 경로가 달라지므로 하드코딩된 경로를 그대로 재사용하면 안 됩니다.

**로드맵 시점:** **현재 즉시** 처리합니다. Daily Brief 스케줄러와 별개로, 이미 존재하는 작업로그 자동화의 장애 복구입니다.

### Q7. planner·developer·supervisor·finisher가 Slack 봇으로 등록되어야 하는가?

**답:** 아닙니다.

이 네 역할은 Slack 봇이 아니라 Claude Code 서브에이전트입니다. 현재 Slack에는 웹훅을 통해 작업 단계 알림이 메시지로 전달될 뿐이며, Slack 사이드바에 네 개의 봇이 자동으로 나타나는 구조가 아닙니다.

**해결 방향:** Slack에서 필요한 것은 우선 Incoming Webhook 알림이며, 각 서브에이전트를 별도의 Slack 앱으로 만들 필요는 없습니다.

**로드맵 시점:** 별도 개발 작업이 필요하지 않습니다. Webhook 설정과 문서 설명만으로 현재 목적을 충족합니다.

### Q8. Slack에서 `@Claude /feature`를 직접 실행할 수 있는가?

**답:** 현재는 설정되어 있지 않습니다.

Slack 읽기 커넥터가 연결되어 있는 것과 Slack에서 Claude 명령을 실행하는 것은 별개입니다. 양방향 실행을 사용하려면 별도의 Slack 앱 설치와 인증 절차가 필요합니다.

**해결 방향:**

- 기본 운영: Claude Code에서 `/feature` 실행, Slack은 알림 수신만 담당
- 선택 운영: 대화형 세션에서 `/install-slack-app` 설정 후 Slack 명령 실행을 검토
- Slack 앱 도입 시 명령 권한, 채널 제한, 실행 결과, 실패 응답을 별도로 정의

**로드맵 시점:** 핵심 기능 완료 전에는 필요하지 않습니다. **Week 11 Mini Agent 단계 이후 또는 Phase E**에서 선택적으로 검토합니다.

### Q9. 오프라인 범위와 현재/목표 계층 문제는 아직 유효한가?

**답:** 이전보다 정리되었습니다.

`DESIGN.md`는 다음을 명시하고 있습니다.

- 네트워크가 없어도 할일·프로젝트 CRUD 가능
- 마지막으로 동기화된 일정·메일·브리핑은 조회 가능
- 백엔드 프로세스 종료는 오프라인이 아니라 연결 오류로 처리
- 목표 계층은 `routes → services → db`이고, 현재는 라우트가 DB를 직접 호출

따라서 이 두 항목은 현재 핵심 결함이라기보다, 향후 구현 시 정책을 유지해야 하는 사항입니다.

**남은 확인 사항:** Supabase 도입 전 동기화 충돌 정책과 캐시 보관 기간은 여전히 결정해야 합니다.

**로드맵 시점:** 오프라인 정책은 C3~D2에서 캐시 기능을 구현할 때 검증하고, 동기화 충돌은 **Phase E2, Week 10 전**에 결정합니다.

### Q10. 테스트가 부족한 기능은 언제 검증해야 하는가?

**답:** 기능 구현과 같은 Phase에서 최소 테스트를 함께 작성해야 합니다.

| 대상 | 권장 시점 |
|---|---|
| C2 프로젝트 프론트 배선 | C2 구현과 동시에 API·UI 상태 테스트 |
| C3 캘린더 API·위젯 | C3 구현과 동시에 캐시·빈 목록·오류 테스트 |
| D1 Daily Brief | D1 구현과 동시에 Claude 실패·컨텍스트 테스트 |
| D2 OAuth·Gmail·Calendar | D2 구현과 동시에 모킹·토큰 실패 테스트 |
| D3 Notion·스케줄·BriefCard | D3 구현과 동시에 저장 실패·재실행 테스트 |
| E1~E2 인증·Supabase | 구현 전 충돌·권한 정책 결정 후 통합 테스트 |
| E3 Docker·Electron 패키징 | 패키징 단계에서 실제 실행 스모크 테스트 |

## Slack 문제의 권장 처리 순서

| 순서 | 작업 | 시점 | 성격 |
|---:|---|---|---|
| 1 | `.env`에 `SLACK_WEBHOOK_URL` 직접 설정 | 지금 | 필수 운영 설정 |
| 2 | `slack-notify.sh` 테스트 메시지 확인 | 지금 | 연결 검증 |
| 3 | launchd plist 교체 및 재등록 | 지금 | 현재 장애 복구 |
| 4 | 작업로그 23:50 실행·Slack 요약 확인 | 설정 직후 | 운영 검증 |
| 5 | Daily Brief 스케줄 연결 | Week 7, Phase D3 | 제품 기능 |
| 6 | `@Claude /feature` 양방향 연동 검토 | Week 11 이후 | 선택 확장 |

## 전체 로드맵에 배치한 결론

| 문제 | 진행 시점 | 관련 Phase |
|---|---|---|
| Slack Webhook 비어 있음 | 지금 즉시 | Phase 1 자동화 보완 |
| launchd 경로 오류 | 지금 즉시 | Phase 1 자동화 보완 |
| Electron·백엔드 실행 책임 | 지금 결정, C2 전 구현 | Phase B~C |
| 문서 상태 동기화 | 지금 정리, 이후 매 기능 완료 시 갱신 | 전 Phase 공통 |
| 상세 요구사항·테스트 공백 | 각 기능 구현 직전 | C2~E3 |
| Daily Brief 자동 실행 | Week 7 | Phase D3 |
| 동기화 충돌 정책 | Week 10 전 | Phase E2 준비 |
| Slack 양방향 명령 | Week 11 이후 선택 | Phase E 또는 Mini Agent |

## 최종 답변

지금 당장 처리할 것은 **Slack Webhook 설정과 launchd plist 복구**입니다. 둘 다 기존 Phase 1 자동화가 깨진 상태이므로 C2나 Daily Brief까지 기다릴 이유가 없습니다.

제품 로드맵에서 새로 진행할 항목은 다음과 같이 보면 됩니다.

- 실행 구조 확정: 현재 결정, C2 이전 구현
- 문서 상태 정리: 현재 정리, 이후 각 기능 완료 시 갱신
- 상세 요구사항과 테스트: C2부터 각 기능과 함께 진행
- Daily Brief 예약 실행: Week 7 / D3
- Slack 양방향 `@Claude /feature`: Week 11 이후 선택 사항

이번 문서는 문제와 해결 방향을 정리한 결과 기록이며, `ai_결과값.md` 외의 파일은 수정하지 않았습니다.
