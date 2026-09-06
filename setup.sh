#!/usr/bin/env bash
# 개발 환경 자동 설정 스크립트 (macOS / Ubuntu·WSL 공통)
# - frontend / backend 의 npm 의존성 설치 (락파일 기준: npm ci, 없으면 npm install)
# - agent 의 Python 가상환경 생성 및 의존성 설치
# - .env 준비
# 실행:  bash setup.sh
# 사전: node 22+, npm, python3 3.12+ 가 PATH 에 있어야 함. 없으면 docs/setup/SETUP.md §2/§3.

set -e  # 오류 발생 시 즉시 중단

# 락파일이 있으면 npm ci(재현 가능), 없으면 npm install
npm_install() {
  if [ -f package-lock.json ]; then npm ci; else npm install; fi
}

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
  echo "✅ .env 생성 — 값은 각 기능 착수 시 채운다 (docs/setup/ENV_REFERENCE.md)"
  echo "   ⚠️  backend 는 .env 를 자동 로딩하지 않는다. PORT/DATABASE_PATH override 는 셸 export (SETUP.md §5)."
fi

# 3. frontend
echo "▶ frontend 의존성 설치 (npm ci)"
(cd frontend && npm_install) || {
  echo "❌ frontend 설치 실패. better-sqlite3 등 네이티브 빌드는 macOS 'xcode-select --install' / Ubuntu 'build-essential' 필요 (SETUP.md §6)."
  exit 1
}

# 4. backend
echo "▶ backend 의존성 설치 (npm ci)"
(cd backend && npm_install) || {
  echo "❌ backend 설치 실패. SETUP.md §6 트러블슈팅 참고."
  exit 1
}

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

echo "🎉 설정 완료!"
echo "   다음: bash verify.sh           (환경·문법·문서 정합)"
echo "         bash scripts/smoke.sh    (backend 가 실제로 뜨는지)"
