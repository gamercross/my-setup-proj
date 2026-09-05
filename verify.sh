#!/usr/bin/env bash
# 설치·문법 확인 스크립트
# 실행:
#   bash verify.sh              전체 (환경 + 의존성 + 문법)
#   bash verify.sh --code-only  문법만 (환경·의존성 점검 건너뜀 — 문서 전용 변경/미프로비저닝 머신용)
#
# 종료 코드:
#   0  실패 없음 (SKIP 은 실패로 치지 않는다)
#   1  하나 이상 FAIL
#
# SKIP: 문법을 검사할 도구(node/python3)가 아예 없을 때. FAIL 이 아니라 "확인 못 함" 으로 처리한다.
# 자세한 커밋·푸시 규칙은 docs/setup/GIT_WORKFLOW.md 참고.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

CODE_ONLY=0
[ "${1:-}" = "--code-only" ] && CODE_ONLY=1

PASS=0
FAIL=0
SKIP=0

check() {
  # check "설명" "명령어..."
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then
    echo "✅ $desc"; PASS=$((PASS + 1))
  else
    echo "❌ $desc"; FAIL=$((FAIL + 1))
  fi
}

# syntax_check "설명" <검사도구> <명령어...>
# 검사도구가 PATH 에 없으면 SKIP (FAIL 아님).
syntax_check() {
  local desc="$1"; local tool="$2"; shift 2
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "⏭️  $desc — SKIP ($tool 없음)"; SKIP=$((SKIP + 1)); return
  fi
  if "$@" >/dev/null 2>&1; then
    echo "✅ $desc"; PASS=$((PASS + 1))
  else
    echo "❌ $desc"; FAIL=$((FAIL + 1))
  fi
}

if [ "$CODE_ONLY" -eq 0 ]; then
  echo "▶ 환경 확인"
  check "node 설치됨" node --version
  check "npm 설치됨" npm --version
  check "python3 설치됨" python3 --version

  echo "▶ 프로젝트 파일 확인"
  check "frontend/node_modules 존재" test -d frontend/node_modules
  check "backend/node_modules 존재" test -d backend/node_modules
  check "agent/venv 존재" test -d agent/venv
  check ".env 존재" test -f .env
fi

echo "▶ 문법 확인"
syntax_check "backend server.js 문법"   node    node -c backend/src/server.js
syntax_check "backend app.js 문법"      node    node -c backend/src/app.js
syntax_check "backend db.js 문법"       node    node -c backend/src/db.js
syntax_check "backend db/index.js 문법" node    node -c backend/db/index.js
syntax_check "frontend main.js 문법"    node    node -c frontend/src/main.js
syntax_check "backend errors.js 문법"   node    node -c backend/src/errors.js
syntax_check "backend tasks.js 문법"    node    node -c backend/src/routes/tasks.js
syntax_check "backend projects.js 문법" node    node -c backend/src/routes/projects.js
syntax_check "backend routes/calendar.js 문법"    node node -c backend/src/routes/calendar.js
syntax_check "backend services/calendar.js 문법"  node node -c backend/src/services/calendar.js
syntax_check "backend routes/diagrams.js 문법"    node node -c backend/src/routes/diagrams.js
syntax_check "backend services/diagrams.js 문법"  node node -c backend/src/services/diagrams.js
syntax_check "backend middleware/cors.js 문법"          node node -c backend/src/middleware/cors.js
syntax_check "backend middleware/requestLogger.js 문법" node node -c backend/src/middleware/requestLogger.js
syntax_check "backend middleware/errorHandler.js 문법"  node node -c backend/src/middleware/errorHandler.js
syntax_check "agent 파이썬 문법"        python3 python3 -m compileall -q agent

echo ""
echo "결과: 통과 $PASS / 실패 $FAIL / 건너뜀 $SKIP"
if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
if [ "$SKIP" -ne 0 ]; then
  echo "⚠️  건너뛴 검사가 있습니다. 커밋 보고와 메시지에 '검증 일부 미실행' 을 명시하세요 (GIT_WORKFLOW.md)."
fi
echo "🎉 실패한 확인 없음"
