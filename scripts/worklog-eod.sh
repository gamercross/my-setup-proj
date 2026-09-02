#!/usr/bin/env bash
# 하루 마지막 작업로그 정리 (End Of Day)
#
# launchd(com.aicomputeros.worklog)가 매일 23:50 에 실행한다.
# 1) 오늘 섹션을 최신 커밋으로 다시 만든다
# 2) 작업로그.md 에 변경이 있으면 커밋·푸시한다
# 3) 슬랙 채널에 오늘 요약을 보낸다

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$ROOT/작업로그.md"
TODAY="$(date +%Y-%m-%d)"

command -v git >/dev/null 2>&1 || exit 0
cd "$ROOT"
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

# 1) 오늘 섹션 재생성
bash "$ROOT/scripts/worklog.sh" >/dev/null 2>&1 || true

# 2) 작업로그.md 만 스테이징해서 커밋·푸시 (저장소 루트에서 절대경로로)
REPO_ROOT="$(git rev-parse --show-toplevel)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
cd "$REPO_ROOT"

if ! git diff --quiet -- "$LOG"; then
  git add -- "$LOG"
  git commit -q -m "docs: 작업로그 $TODAY" || true
  git push -q origin "$BRANCH" 2>/dev/null || echo "[worklog-eod] push 실패 — 다음 세션에서 수동 푸시 필요"
fi

# 3) 오늘 요약 블록을 슬랙으로 (커밋 목록이 아니라 요약)
SUMMARY="$(awk -v s="<!-- SUMMARY:$TODAY -->" -v e="<!-- /SUMMARY:$TODAY -->" '
  $0==s{grab=1;next} $0==e{grab=0} grab
' "$LOG" | sed '/^$/d')"
CNT="$(git log --since="$TODAY 00:00:00" --oneline 2>/dev/null | wc -l | tr -d ' ')"
if [ -z "$SUMMARY" ] || printf '%s' "$SUMMARY" | grep -q '요약 미작성'; then
  SUMMARY="(요약 미작성) — 오늘 커밋 ${CNT}개"
else
  SUMMARY="$SUMMARY

— 오늘 커밋 ${CNT}개"
fi
bash "$ROOT/scripts/slack-notify.sh" "🗒️" "일일 요약 ($TODAY)" "$SUMMARY" || true
