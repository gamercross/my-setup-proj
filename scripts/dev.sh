#!/usr/bin/env bash
# 개발 모드 통합 실행 — backend(:3000) + Vite(:5173) + Electron 을 명령 하나로 함께 띄운다.
#
#   bash scripts/dev.sh            3개 프로세스 동시 기동 (Ctrl+C 또는 Electron 창 닫기로 전부 종료)
#   bash scripts/dev.sh --dry-run  전제 검사만 하고 실행할 명령을 출력 후 종료 (CI/샌드박스 검증용)
#
# 종료 코드:
#   0  정상 종료 (Electron 종료 코드 기준 — 창 닫기·Ctrl+C 양쪽 / --dry-run 포함)
#   1  전제 미충족 / 포트 점유 / 기동 실패
#
# 근거: ADR-0016 결정 1항(개발 모드 통합 실행) — docs/product/architecture/adr/ADR-0016-desktop-process-topology.md
# 폴백: 통합 실행이 안 맞으면 터미널 2개로 나눠 실행 (backend `npm start` / frontend `npm run dev`).
# 전제: Windows 는 Git Bash (setup.sh / verify.sh 와 동일). `.env` 는 이 스크립트가 읽지 않는다.
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

CONC="frontend/node_modules/.bin/concurrently"

# fail "메시지" ["안내 문구"] — 안내 문구 생략 시 기본 안내(bash setup.sh) 사용
fail() { echo "❌ $1"; echo "   → ${2:-bash setup.sh 를 먼저 실행하세요.}"; exit 1; }

# 1. 전제 확인
command -v node >/dev/null 2>&1 || fail "node 가 없습니다." "Node.js 를 설치한 뒤 bash setup.sh 를 실행하세요 (docs/setup/SETUP.md §2)."
[ -d backend/node_modules ]  || fail "backend/node_modules 가 없습니다."
[ -d frontend/node_modules ] || fail "frontend/node_modules 가 없습니다."
[ -x "$CONC" ] || fail "concurrently 실행 파일이 없습니다 ($CONC)."

# 2. 포트 점검 (lsof / nc 중 있는 것으로. 둘 다 없으면 SKIP)
port_in_use() {
  local p="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -i ":$p" >/dev/null 2>&1
  elif command -v nc >/dev/null 2>&1; then
    nc -z localhost "$p" >/dev/null 2>&1
  else
    return 2
  fi
}

check_port() {
  local p="$1" msg="$2"
  port_in_use "$p"
  case $? in
    0) echo "❌ $msg (포트 $p 사용 중)"; exit 1 ;;
    2) echo "⏭️  포트 점검 건너뜀 (lsof/nc 없음) — 포트 $p"; return 0 ;;
  esac
}

if [ "$DRY_RUN" -eq 0 ]; then
  check_port 3000 "이미 백엔드가 떠 있거나 3000 포트가 사용 중입니다"
  check_port 5173 "이미 Vite dev 서버가 떠 있거나 5173 포트가 사용 중입니다"
fi

# 3. 실행할 명령 (concurrently 인자)
#  - backend: nodemon 은 devDependencies 에 없으므로 node 로 직접 기동
#  - vite/electron: `cd frontend &&` 로 감싼다 (npm --prefix 는 electron 의 `.` cwd 해석 이슈가 있음)
#  - 좀비(손자 프로세스 잔존) 발견 시 vite 는 `cd frontend && node_modules/.bin/vite` 직접 호출로 전환할 것
CMD_BACKEND="node backend/src/server.js"
CMD_VITE="cd frontend && npm run dev:vite"
CMD_ELECTRON="cd frontend && npm run dev:electron"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "✅ 전제 확인 통과 — 실행할 명령 (concurrently -k --success command-electron):"
  echo "  [backend]  $CMD_BACKEND"
  echo "  [vite]     $CMD_VITE"
  echo "  [electron] $CMD_ELECTRON"
  exit 0
fi

# 4. 동시 기동
#  -k                     = kill-others: 하나가 죽으면 나머지도 종료
#  --success command-electron = electron(3번째 명령)의 종료 코드를 concurrently=스크립트의 종료 코드로 삼는다
#                               → Electron 창 닫기·Ctrl+C 양쪽에서 정상 종료가 0
echo "▶ backend + Vite + Electron 동시 기동 (Ctrl+C 로 전부 종료)"
"$CONC" -k --success command-electron --names "backend,vite,electron" -c "blue,green,magenta" \
  "$CMD_BACKEND" \
  "$CMD_VITE" \
  "$CMD_ELECTRON"

exit $?
