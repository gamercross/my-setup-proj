#!/usr/bin/env bash
# 작업로그 EOD launchd 예약 작업 설치 (macOS 전용).
#
# plist 의 절대 경로를 **현재 저장소 위치로 자동 생성**한다 — 다른 컴퓨터에서도
# scripts/com.aicomputeros.worklog.plist 를 그대로 복사하지 않고 이 스크립트로 설치한다.
#
#   bash scripts/install-worklog-launchd.sh          # 설치(또는 재설치)
#   bash scripts/install-worklog-launchd.sh --uninstall
#
# Ubuntu 는 launchd 가 없다 — cron 을 쓴다:  crontab -e  →  50 23 * * * /경로/scripts/worklog-eod.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LABEL="com.aicomputeros.worklog"
DEST="$HOME/Library/LaunchAgents/${LABEL}.plist"

if [ "$(uname)" != "Darwin" ]; then
  echo "❌ macOS 전용. Ubuntu 는 cron 을 쓰세요 (위 주석 참고)."
  exit 1
fi

if [ "${1:-}" = "--uninstall" ]; then
  launchctl unload "$DEST" 2>/dev/null || true
  rm -f "$DEST"
  echo "✅ 제거: $DEST"
  exit 0
fi

mkdir -p "$HOME/Library/LaunchAgents"
launchctl unload "$DEST" 2>/dev/null || true

cat > "$DEST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!-- 자동 생성: scripts/install-worklog-launchd.sh ($(date +%F)). 직접 편집 금지. -->
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${ROOT}/scripts/worklog-eod.sh</string>
  </array>
  <key>WorkingDirectory</key><string>${ROOT}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>23</integer><key>Minute</key><integer>50</integer></dict>
  <key>StandardOutPath</key><string>${ROOT}/scripts/worklog-eod.log</string>
  <key>StandardErrorPath</key><string>${ROOT}/scripts/worklog-eod.log</string>
</dict>
</plist>
PLIST

launchctl load "$DEST"
echo "✅ 설치: $DEST"
echo "   경로 = ${ROOT}"
echo "   확인: launchctl list | grep ${LABEL}"
echo "   시간 변경: 이 스크립트의 Hour/Minute 수정 후 다시 실행"
