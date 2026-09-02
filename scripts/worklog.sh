#!/usr/bin/env bash
# 작업 로그 자동 갱신 — 날짜별 "요약 + 커밋"
#
# Stop 훅에서 매 턴 호출된다. 전체 git 이력에서 작업로그.md 를 다시 만든다.
#  - `<!-- SUMMARY:날짜 -->` ~ `<!-- /SUMMARY:날짜 -->` 사이의 요약은 **보존**한다
#    (사람·Claude 가 작성. 한 번 놓쳐도 다음 실행에 커밋 목록이 복구된다).
#  - 커밋 목록은 git 이력에서 매번 새로 만든다.
# 커밋·푸시·슬랙 전송은 하지 않는다 (worklog-eod.sh 담당).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$ROOT/작업로그.md"
cd "$ROOT"

command -v git >/dev/null 2>&1 || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

US=$'\037'   # git 필드 구분자 (unit separator)

read -r -d '' HEADER <<'EOF' || true
# 🗒️ 작업 로그

날짜별로 **요약**(사람·Claude 가 작성)과 **커밋**(git 이력에서 자동)을 모읍니다.

- 매 턴 종료 시(Stop 훅) 전체 이력에서 다시 만들어집니다. `<!-- SUMMARY:날짜 -->` 블록은 지우지 않습니다.
- 요약은 각 작업 세션 후 갱신합니다 (finisher 단계 또는 "작업로그 정리" 요청 시).
- 매일 23:50(launchd `com.aicomputeros.worklog`)에 그날 요약이 커밋·푸시되고 슬랙에 전송됩니다.

주간 계획·체크리스트는 [PROGRESS.md](docs/progress/PROGRESS.md) 를 보세요.
EOF

# 전체 커밋을 한 번에 읽는다: "날짜<US>해시<US>제목"
COMMITS_RAW="$(git log --date=short --reverse --pretty="format:%cd${US}%h${US}%s" 2>/dev/null || true)"

# 커밋이 있는 날짜 목록 (최신순, 중복 제거)
DATES="$(printf '%s\n' "$COMMITS_RAW" | awk -F"$US" 'NF{print $1}' | awk '!seen[$0]++' | sort -r)"

# 특정 날짜의 기존 요약 추출 (마커 사이, 마커 줄 제외)
extract_summary() {
  local d="$1"
  [ -f "$LOG" ] || return 0
  awk -v s="<!-- SUMMARY:$d -->" -v e="<!-- /SUMMARY:$d -->" '
    $0 == s { grab = 1; next }
    $0 == e { grab = 0 }
    grab { print }
  ' "$LOG"
}

TMP="$(mktemp)"
{
  printf '%s\n\n' "$HEADER"
  echo "<!-- BEGIN LOG -->"

  for d in $DATES; do
    echo ""
    echo "## $d"
    echo ""
    echo "### 📝 요약"
    echo "<!-- SUMMARY:$d -->"
    SUM="$(extract_summary "$d")"
    if [ -n "$SUM" ]; then
      printf '%s\n' "$SUM"
    else
      echo "_요약 미작성 — 세션 종료 시 갱신_"
    fi
    echo "<!-- /SUMMARY:$d -->"
    echo ""

    # 이 날짜의 커밋 (오래된 것 → 최신)
    CNT="$(printf '%s\n' "$COMMITS_RAW" | awk -F"$US" -v d="$d" '$1==d' | wc -l | tr -d ' ')"
    echo "### 📦 커밋 ($CNT)"
    printf '%s\n' "$COMMITS_RAW" | awk -F"$US" -v d="$d" '$1==d { printf "- `%s` %s\n", $2, $3 }'
    echo ""
  done

  echo ""
  echo "<!-- END LOG -->"
} > "$TMP"

# 실제 변경이 있을 때만 교체
if [ ! -f "$LOG" ] || ! cmp -s "$TMP" "$LOG"; then
  mv "$TMP" "$LOG"
  echo "{\"systemMessage\": \"📝 작업로그.md 갱신\"}"
else
  rm -f "$TMP"
fi
