#!/usr/bin/env bash
# 설치 확인 스크립트 (Week 1)
# 각 구성요소가 실행 가능한 상태인지 점검한다.
# 실행:  bash verify.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

PASS=0
FAIL=0

check() {
  # check "설명" "명령어..."
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then
    echo "✅ $desc"
    PASS=$((PASS + 1))
  else
    echo "❌ $desc"
    FAIL=$((FAIL + 1))
  fi
}

echo "▶ 환경 확인"
check "node 설치됨" node --version
check "npm 설치됨" npm --version
check "python3 설치됨" python3 --version

echo "▶ 프로젝트 파일 확인"
check "frontend/node_modules 존재" test -d frontend/node_modules
check "backend/node_modules 존재" test -d backend/node_modules
check "agent/venv 존재" test -d agent/venv
check ".env 존재" test -f .env

echo "▶ 문법 확인"
check "backend server.js 문법" node -c backend/src/server.js
check "frontend main.js 문법" node -c frontend/src/main.js
check "backend tasks.js 문법" node -c backend/src/routes/tasks.js
check "backend projects.js 문법" node -c backend/src/routes/projects.js
check "agent 파이썬 문법" python3 -m compileall -q agent

echo ""
echo "결과: 통과 $PASS / 실패 $FAIL"
[ "$FAIL" -eq 0 ] && echo "🎉 모든 확인을 통과했습니다!" || exit 1
