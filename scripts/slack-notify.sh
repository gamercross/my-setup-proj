#!/usr/bin/env bash
# 슬랙 Incoming Webhook 으로 메시지를 보낸다.
#
# 사용법:  slack-notify.sh <이모지> <이름> <메시지...>
# 예:      slack-notify.sh "✅" "마무리하는 친구" "커밋 9e6a7a3 푸시 완료"
#
# .env 의 SLACK_WEBHOOK_URL 이 없으면 조용히 종료한다(치명적 아님).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# .env 로드 (있으면)
if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/.env"
  set +a
fi

URL="${SLACK_WEBHOOK_URL:-}"
[ -z "$URL" ] && exit 0

EMOJI="${1:-🤖}"
NAME="${2:-agent}"
shift 2 2>/dev/null || true
TEXT="$*"
[ -z "$TEXT" ] && exit 0

command -v curl >/dev/null 2>&1 || exit 0

# JSON 안전 인코딩 (python3 사용, 없으면 최소 이스케이프)
if command -v python3 >/dev/null 2>&1; then
  PAYLOAD="$(python3 - "$EMOJI" "$NAME" "$TEXT" <<'PY'
import json, sys
emoji, name, text = sys.argv[1], sys.argv[2], sys.argv[3]
print(json.dumps({"text": f"{emoji} *{name}*\n{text}"}))
PY
)"
else
  ESC="$(printf '%s' "$TEXT" | sed 's/\\/\\\\/g; s/"/\\"/g' | awk '{printf "%s\\n", $0}')"
  PAYLOAD="{\"text\": \"$EMOJI *$NAME*\\n$ESC\"}"
fi

curl -sf -X POST -H 'Content-type: application/json' --data "$PAYLOAD" "$URL" >/dev/null 2>&1 || true
