#!/usr/bin/env bash
# 일일 브리핑 launchd 예약 작업 설치 (macOS 전용) — FR-AGENT-05.
#
# plist 의 절대 경로를 **현재 저장소 위치로 자동 생성**한다 — scripts/com.aicomputeros.dailybrief.plist
# 를 그대로 복사하지 말고 이 스크립트로 설치한다.
#
#   bash scripts/install-dailybrief-launchd.sh            # 07:30 에 설치(기본)
#   bash scripts/install-dailybrief-launchd.sh 8 0        # 08:00 로 설치
#   DAILY_BRIEF_HOUR=9 bash scripts/install-dailybrief-launchd.sh
#   bash scripts/install-dailybrief-launchd.sh --uninstall
#
# 실패 시 재시도하지 않는다(KeepAlive 없음) — 다음 스케줄까지 대기한다 (AGENT.md AC-5).
# Ubuntu 는 launchd 가 없다 — cron 을 쓴다:  crontab -e  →  30 7 * * * /경로/scripts/daily-brief-run.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LABEL="com.aicomputeros.dailybrief"
DEST="$HOME/Library/LaunchAgents/${LABEL}.plist"

if [ "$(uname)" != "Darwin" ]; then
  echo "❌ macOS 전용. Ubuntu 는 cron 을 쓰세요 (위 주석 참고)."
  exit 1
fi

# --uninstall 은 인자 파싱보다 먼저 검사한다.
if [ "${1:-}" = "--uninstall" ]; then
  launchctl unload "$DEST" 2>/dev/null || true
  rm -f "$DEST"
  echo "✅ 제거: $DEST"
  exit 0
fi

HOUR="${DAILY_BRIEF_HOUR:-${1:-7}}"
MINUTE="${DAILY_BRIEF_MINUTE:-${2:-30}}"

mkdir -p "$HOME/Library/LaunchAgents"
launchctl unload "$DEST" 2>/dev/null || true

cat > "$DEST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!-- 자동 생성: scripts/install-dailybrief-launchd.sh ($(date +%F)). 직접 편집 금지. -->
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${ROOT}/scripts/daily-brief-run.sh</string>
  </array>
  <key>WorkingDirectory</key><string>${ROOT}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>${HOUR}</integer><key>Minute</key><integer>${MINUTE}</integer></dict>
  <key>StandardOutPath</key><string>${ROOT}/scripts/daily-brief.log</string>
  <key>StandardErrorPath</key><string>${ROOT}/scripts/daily-brief.log</string>
</dict>
</plist>
PLIST

launchctl load "$DEST"
echo "✅ 설치: $DEST"
echo "   경로 = ${ROOT}"
echo "   시각 = ${HOUR}:$(printf '%02d' "${MINUTE}")"
echo "   확인: launchctl list | grep ${LABEL}"
echo "   시간 변경: 인자(HOUR MINUTE) 또는 DAILY_BRIEF_HOUR/MINUTE 로 다시 실행"
