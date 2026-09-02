---
description: 로드맵을 스스로 따라가며 다음 스텝을 /feature 파이프라인으로 개발한다. 사람 결정이 필요한 지점에서만 멈춘다.
argument-hint: "[Phase 문자 | --once]  (없으면 막힐 때까지 진행)"
---

## 인자
$ARGUMENTS

## 역할

당신은 **상위 오케스트레이터**입니다. 직접 코드를 쓰지 말고,
[docs/setup/ORCHESTRATION.md](../../docs/setup/ORCHESTRATION.md) 의 상태 그래프를 따라
로드맵의 다음 스텝들을 자동으로 진행합니다.

## 루프 (정지 상태까지 반복)

### 1. SELECT — 다음 스텝 고르기
- [docs/product/DESIGN.md](../../docs/product/DESIGN.md) §8 의 Phase A~E 스텝 표와
  [docs/product/TRACEABILITY.md](../../docs/product/TRACEABILITY.md) §3 상태를 읽는다.
- **선행 스텝이 모두 ✅ 인 첫 번째 ⏳ 스텝**을 고른다.
- 인자에 Phase 문자(예: `B`)가 있으면 그 Phase 스텝만 대상.
- 남은 스텝이 없으면 → **STOP_DONE**: 완료 요약 후 종료.

### 2. GATE — 착수 가능한지 확인
- TRACEABILITY §5 에서 이 스텝을 **차단하는 제안 상태 ADR** 이 있는지 본다.
  있으면 → **STOP_DECISION**: "ADR-00NN 을 먼저 결정해야 합니다: <제안 요약>" 보고 후 종료.
- 이 스텝에 필요한 `.env` 키(ENV_REFERENCE 기준)가 비어 있으면 → **STOP_DECISION**: 키 이름 명시.
- 대화형 준비(OAuth 앱 등록, `/install-slack-app`)가 필요하면 → **STOP_DECISION**.

### 3. FEATURE — 해당 스텝을 파이프라인으로 개발
[.claude/commands/feature.md](feature.md) 의 절차를 이 스텝 설명으로 실행한다:
`slack 시작 알림 → planner → developer → supervisor → (CHANGES_NEEDED 면 최대 2회) → finisher`.
- supervisor 2회 실패 → **STOP_REVIEW**.
- developer/supervisor 범위 이탈 보고 → **STOP_SCOPE**.
- finisher: verify FAIL → **STOP_VERIFY**, 푸시 실패 → **STOP_PUSH**.
- 성공 시 finisher 가 PROGRESS·TRACEABILITY 를 갱신하고 커밋·푸시.

### 4. REPORT & LOOP
- 이 스텝 결과(커밋 해시·변경 요약)를 사용자에게 한 단락으로 보고.
- `--once` 인자면 여기서 종료.
- 아니면 → **1. SELECT** 로 돌아간다.

## 규칙
- 정지 상태에 도달하면 **절대 임의로 진행하지 않는다.** 무엇을 결정/입력해야 하는지 구체적으로 보고하고 멈춘다.
- 안전장치: 한 번의 `/build-next` 호출에서 **최대 3스텝**까지만 진행하고, 더 남았으면 "이어서 `/build-next` 실행" 을 안내한다.
- 각 스텝은 개별 커밋. 커밋 간 CI 결과를 확인해 초록이 아니면 다음 스텝으로 넘어가지 않는다.
- 모든 판단 근거는 문서(DESIGN·TRACEABILITY·ORCHESTRATION)에 둔다. 문서에 없으면 추측하지 말고 STOP_DECISION.
