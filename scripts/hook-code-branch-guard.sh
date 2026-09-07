#!/usr/bin/env bash
# PreToolUse(Edit|Write) 훅 — 코드 소스를 main 브랜치에서 직접 편집하려 하면 승인 프롬프트를 띄운다.
#
# 이 프로젝트의 규칙: 코드 변경은 /feature 파이프라인
# (feature/* 브랜치 + planner→developer→supervisor→finisher) 으로 한다
# — docs/setup/ORCHESTRATION.md, docs/setup/CONVENTIONS.md §6, .claude/commands/feature.md.
#
# stdin 으로 훅 입력 JSON 을 받는다. 대상이 아니면 조용히 통과(exit 0, 출력 없음).
# 대상이면 hookSpecificOutput.permissionDecision="ask" JSON 을 내보내 확인 프롬프트를 띄운다.
# (blocking 이 아니라 warning — 사용자가 승인하면 그대로 진행)

set -u

f=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)
[ -z "$f" ] && exit 0

# 코드 소스 디렉터리만 대상
case "$f" in
  */frontend/src/*|*/backend/src/*|*/agent/*) : ;;
  *) exit 0 ;;
esac

# 테스트·마크다운·설계 산출물은 예외
case "$f" in
  *test*|*spec*|*/tests/*|*.md|*/design-p2/*|*/agent/venv/*) exit 0 ;;
esac

br=$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current 2>/dev/null)
[ "$br" != "main" ] && exit 0

reason='코드 소스를 main 브랜치에서 직접 편집하려 합니다. 이 프로젝트는 코드 변경을 /feature 파이프라인(feature/* 브랜치 + planner→developer→supervisor→finisher)으로 합니다 — ORCHESTRATION.md / CONVENTIONS §6. 그래도 직접 편집하려면 승인하세요.'

jq -n --arg r "$reason" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "ask",
    permissionDecisionReason: $r
  }
}'
exit 0
