#!/usr/bin/env bash
# 일일 브리핑 자동 실행 래퍼 (FR-AGENT-05).
#
# launchd/cron 이 이 스크립트를 부른다. sync → daily_brief 순으로 돌리고
# 각 단계의 시작·종료·exit code 를 로그에 append 한다.
# sync 가 실패해도 브리핑은 시도한다(캐시된 데이터로라도 생성 — AC-3).
#
#   bash scripts/daily-brief-run.sh
#
# 환경변수:
#   DAILY_BRIEF_LOG   로그 파일 경로 (기본 scripts/daily-brief.log)
#
# set -e 는 쓰지 않는다 — 단계 실패를 직접 관측하고 로그에 남겨야 하기 때문.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${DAILY_BRIEF_LOG:-$ROOT/scripts/daily-brief.log}"
VENV="$ROOT/agent/venv"

# 로그 1MB 초과 시 .log.1 로 1회 회전한다.
if [ -f "$LOG" ] && [ "$(wc -c < "$LOG" 2>/dev/null || echo 0)" -gt 1048576 ]; then
  mv -f "$LOG" "$LOG.1"
fi

log() { echo "[$(date '+%F %T')] $*" >> "$LOG"; }

if [ ! -d "$VENV" ]; then
  log "❌ agent/venv 가 없습니다. 먼저 'python3 -m venv agent/venv && agent/venv/bin/pip install -r agent/requirements.txt' 를 실행하세요."
  exit 1
fi

# shellcheck disable=SC1091
source "$VENV/bin/activate"

# launchd 는 셸 프로파일을 읽지 않는다 — .env 를 명시적으로 주입한다.
# (agent 모듈도 load_dotenv 로 읽지만, 스크립트 레벨에서도 확실히 해 둔다 — TC-SCHED-01)
if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/.env"
  set +a
fi

cd "$ROOT/agent"

# 단계 하나를 실행하고 결과를 로그에 남긴다. 반환값 = 단계 exit code.
run_step() {
  local name="$1"; shift
  log "▶ $name 시작"
  "$@" >> "$LOG" 2>&1
  local rc=$?
  log "■ $name 종료 (exit=$rc)"
  return $rc
}

# 밀린 "지금 실행" 플래그를 먼저 소비한다(launchd WatchPaths 감지 실패 대비 폴백 — P7).
# 정기 sync 와 중복 실행될 수 있으나 개인용 규모에서는 허용한다. 실패해도 계속 진행.
run_step trigger python trigger.py
TRIGGER_RC=$?

run_step sync python sync.py
SYNC_RC=$?

run_step brief python daily_brief.py
BRIEF_RC=$?

log "완료: trigger=$TRIGGER_RC sync=$SYNC_RC brief=$BRIEF_RC"
exit $BRIEF_RC
