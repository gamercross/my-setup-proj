#!/usr/bin/env bash
# "지금 실행" 트리거 launchd 작업 설치 (macOS 전용) — P7, FR-AGENT-08.
#
# plist 의 절대 경로를 **현재 저장소 위치로 자동 생성**한다 —
# scripts/com.aicomputeros.runnow.plist 를 그대로 복사하지 말고 이 스크립트로 설치한다.
#
#   bash scripts/install-runnow-launchd.sh              # 설치/재설치
#   bash scripts/install-runnow-launchd.sh --uninstall
#
# StartCalendarInterval 이 아니라 WatchPaths 를 쓴다: agent/.triggers/ 가 바뀌면
# (백엔드가 run-now 플래그를 만들면) launchd 가 agent-run-now.sh 를 즉시 실행한다.
# 실패해도 재시도하지 않는다(KeepAlive 없음).
# Ubuntu 는 launchd 가 없다 — inotifywait 루프 등으로 대체하거나 정기 sync 폴백에 의존한다.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LABEL="com.aicomputeros.runnow"
DEST="$HOME/Library/LaunchAgents/${LABEL}.plist"

if [ "$(uname)" != "Darwin" ]; then
  echo "❌ macOS 전용. Ubuntu 는 파일 감시 도구로 대체하세요 (위 주석 참고)."
  exit 1
fi

if [ "${1:-}" = "--uninstall" ]; then
  launchctl unload "$DEST" 2>/dev/null || true
  rm -f "$DEST"
  echo "✅ 제거: $DEST"
  exit 0
fi

mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$ROOT/agent/.triggers"
launchctl unload "$DEST" 2>/dev/null || true

cat > "$DEST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!-- 자동 생성: scripts/install-runnow-launchd.sh ($(date +%F)). 직접 편집 금지. -->
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${ROOT}/scripts/agent-run-now.sh</string>
  </array>
  <key>WorkingDirectory</key><string>${ROOT}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>WatchPaths</key>
  <array><string>${ROOT}/agent/.triggers</string></array>
  <key>StandardOutPath</key><string>${ROOT}/scripts/run-now.log</string>
  <key>StandardErrorPath</key><string>${ROOT}/scripts/run-now.log</string>
</dict>
</plist>
PLIST

launchctl load "$DEST"
echo "✅ 설치: $DEST"
echo "   경로 = ${ROOT}"
echo "   감시 = ${ROOT}/agent/.triggers"
echo "   확인: launchctl list | grep ${LABEL}"
