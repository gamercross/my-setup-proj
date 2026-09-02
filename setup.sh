#!/usr/bin/env bash
# Ubuntu 개발 환경 자동 설정 스크립트 (Week 1)
# - frontend / backend 의 npm 의존성 설치
# - agent 의 Python 가상환경 생성 및 의존성 설치
# 실행:  bash setup.sh

set -e  # 오류 발생 시 즉시 중단

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "▶ AI Computer OS 개발 환경 설정을 시작합니다"

# 1. 필수 명령어 확인
for cmd in node npm python3; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "❌ '$cmd' 이(가) 설치되어 있지 않습니다. SETUP.md 를 참고하세요."
    exit 1
  fi
done

# 2. .env 준비
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ .env 생성 (값을 채워주세요)"
fi

# 3. frontend
echo "▶ frontend 의존성 설치"
(cd frontend && npm install)

# 4. backend
echo "▶ backend 의존성 설치"
(cd backend && npm install)

# 5. agent (Python 가상환경)
echo "▶ agent Python 환경 설정"
cd agent
if [ ! -d venv ]; then
  python3 -m venv venv
fi
# shellcheck disable=SC1091
source venv/bin/activate
pip install --upgrade pip >/dev/null
pip install -r requirements.txt
deactivate
cd "$ROOT"

echo "🎉 설정 완료! 다음으로 'bash verify.sh' 를 실행해 확인하세요."
