#!/usr/bin/env bash
# "지금 실행" 트리거 래퍼 (P7, FR-AGENT-08).
#
# launchd(WatchPaths)가 agent/.triggers/ 변경을 감지하면 이 스크립트를 부른다.
# venv 활성화 + .env 주입 후 trigger.py 를 돌리고 결과를 로그에 append 한다.
# daily-brief-run.sh 의 축약판이다.
#
#   bash scripts/agent-run-now.sh
#
# set -e 는 쓰지 않는다 — 단계 실패를 직접 관측해 로그에 남긴다.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${RUNNOW_LOG:-$ROOT/scripts/run-now.log}"
VENV="$ROOT/agent/venv"

# 로그 1MB 초과 시 1회 회전.
if [ -f "$LOG" ] && [ "$(wc -c < "$LOG" 2>/dev/null || echo 0)" -gt 1048576 ]; then
  mv -f "$LOG" "$LOG.1"
fi

log() { echo "[$(date '+%F %T')] $*" >> "$LOG"; }

if [ ! -d "$VENV" ]; then
  log "❌ agent/venv 가 없습니다. 먼저 venv 를 만드세요."
  exit 1
fi

# shellcheck disable=SC1091
source "$VENV/bin/activate"

# launchd 는 셸 프로파일을 읽지 않는다 — .env 를 명시적으로 주입한다.
if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/.env"
  set +a
fi

cd "$ROOT/agent"

log "▶ trigger 시작"
python trigger.py >> "$LOG" 2>&1
RC=$?
log "■ trigger 종료 (exit=$RC)"
exit $RC
