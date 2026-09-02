#!/usr/bin/env bash
# 작업 로그 자동 갱신 — 일일 섹션 방식
#
# Stop 훅에서 매 턴 호출된다. 오늘 날짜(## YYYY-MM-DD) 섹션을
# 그날의 커밋 목록으로 다시 만든다. 같은 날 여러 번 호출돼도 섹션은
# 하나로 유지되고, 마지막 호출 내용이 그날의 최종본이 된다.
# 커밋·푸시·슬랙 전송은 하지 않는다 (worklog-eod.sh 담당).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$ROOT/작업로그.md"
cd "$ROOT"

command -v git >/dev/null 2>&1 || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

TODAY="$(date +%Y-%m-%d)"

read -r -d '' HEADER <<'EOF' || true
# 🗒️ 작업 로그 (자동 생성)

Claude Code 가 하루 동안 만든 커밋을 **날짜별 한 섹션**에 모읍니다.

- 매 턴 종료 시(Stop 훅) 오늘 섹션이 최신 상태로 다시 만들어집니다.
- 매일 23:50(launchd `com.aicomputeros.worklog`)에 그날 내용이 커밋·푸시되고 슬랙에 요약이 전송됩니다.

주간 계획·체크리스트는 [PROGRESS.md](docs/progress/PROGRESS.md) 를 보세요.
EOF

# 오늘(로컬 자정 이후) 커밋과 누적 변경량
COMMITS="$(git log --since="$TODAY 00:00:00" --pretty='- `%h` %s' 2>/dev/null || true)"
FIRST_TODAY="$(git log --since="$TODAY 00:00:00" --pretty='%H' 2>/dev/null | tail -1 || true)"
DIFFSTAT=""
if [ -n "$FIRST_TODAY" ]; then
  PARENT="$(git rev-parse "${FIRST_TODAY}^" 2>/dev/null || true)"
  [ -n "$PARENT" ] && DIFFSTAT="$(git diff --shortstat "$PARENT..HEAD" 2>/dev/null | sed 's/^[[:space:]]*//')"
fi

# 기존 로그의 BEGIN/END 사이에서 오늘 섹션만 제거한 "과거 섹션"
PAST=""
if [ -f "$LOG" ]; then
  PAST="$(awk '/<!-- BEGIN LOG -->/{c=1;next} /<!-- END LOG -->/{c=0} c' "$LOG" \
    | awk -v t="## $TODAY" '
        $0 == t { skip=1; next }
        /^## / { skip=0 }
        !skip { print }
      ' \
    | sed '/./,$!d')"   # 앞쪽 빈 줄 제거
fi

TMP="$(mktemp)"
{
  printf '%s\n\n' "$HEADER"
  echo "<!-- BEGIN LOG -->"
  echo ""
  echo "## $TODAY"
  echo ""
  if [ -n "$COMMITS" ]; then
    printf '%s\n' "$COMMITS"
  else
    echo "- (아직 커밋 없음)"
  fi
  [ -n "$DIFFSTAT" ] && printf '\n변경 요약: %s\n' "$DIFFSTAT"
  if [ -n "$PAST" ]; then
    echo ""
    printf '%s\n' "$PAST"
  fi
  echo ""
  echo "<!-- END LOG -->"
} > "$TMP"

# 실제 변경이 있을 때만 교체
if [ ! -f "$LOG" ] || ! cmp -s "$TMP" "$LOG"; then
  mv "$TMP" "$LOG"
  echo "{\"systemMessage\": \"📝 작업로그.md · $TODAY 섹션 갱신\"}"
else
  rm -f "$TMP"
fi
