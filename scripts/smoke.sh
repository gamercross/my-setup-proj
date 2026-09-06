#!/usr/bin/env bash
# 서비스 수준 스모크 — backend 가 실제로 뜨고 응답하고 SQLite 에 쓸 수 있는가.
#
#   bash scripts/smoke.sh
#
# verify.sh("▶ 서비스 확인")에 포함된다. node/의존성/curl 이 없으면 SKIP(exit 2).
# 임시 포트 + 임시 DB 파일을 쓰고, 끝나면 프로세스·파일을 정리한다.
#
# 종료: 0 정상 / 1 실패 / 2 SKIP(도구·의존성 없음)
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "⏭️  node 없음 — 서비스 스모크 건너뜀"; exit 2
fi
if [ ! -d backend/node_modules ]; then
  echo "⏭️  backend/node_modules 없음 (bash setup.sh) — 서비스 스모크 건너뜀"; exit 2
fi
if ! command -v curl >/dev/null 2>&1; then
  echo "⏭️  curl 없음 — 서비스 스모크 건너뜀"; exit 2
fi

PORT="${SMOKE_PORT:-3987}"
TMPDB="$(mktemp -t smoke_app_XXXX).db"
BASE="http://localhost:${PORT}"
SRV_PID=""

cleanup() {
  [ -n "$SRV_PID" ] && kill "$SRV_PID" >/dev/null 2>&1
  wait "$SRV_PID" 2>/dev/null
  rm -f "$TMPDB" "$TMPDB-wal" "$TMPDB-shm"
}
trap cleanup EXIT

fail() { echo "❌ 서비스 스모크: $1"; exit 1; }

# 1. 기동
echo "▶ backend 기동 (PORT=$PORT, DATABASE_PATH=$TMPDB)"
DATABASE_PATH="$TMPDB" PORT="$PORT" NODE_ENV="test" node backend/src/server.js >/tmp/smoke_backend.log 2>&1 &
SRV_PID=$!

# 2. health 대기 (최대 ~10초)
ok=0
for _ in $(seq 1 40); do
  if curl -fs "${BASE}/api/health" >/dev/null 2>&1; then ok=1; break; fi
  kill -0 "$SRV_PID" 2>/dev/null || { echo "--- backend 로그 ---"; cat /tmp/smoke_backend.log; fail "프로세스가 기동 중 종료됨"; }
  sleep 0.25
done
[ "$ok" -eq 1 ] || { echo "--- backend 로그 ---"; cat /tmp/smoke_backend.log; fail "/api/health 무응답 (10초)"; }
echo "✅ /api/health 200"

# 3. 읽기
curl -fs "${BASE}/api/tasks" | grep -q '\[' || fail "GET /api/tasks 가 배열이 아님"
echo "✅ GET /api/tasks"

# 4. 쓰기 왕복 (SQLite 쓰기 권한 확인)
CREATED="$(curl -fs -X POST "${BASE}/api/tasks" -H 'Content-Type: application/json' \
  -d '{"title":"smoke test task","priority":"low"}')" || fail "POST /api/tasks 실패"
echo "$CREATED" | grep -q '"smoke test task"' || fail "POST 응답에 생성된 task 없음: $CREATED"
NEW_ID="$(printf '%s' "$CREATED" | sed -n 's/.*"id":[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -1)"
[ -n "$NEW_ID" ] || fail "생성된 task id 파싱 실패: $CREATED"
echo "✅ POST /api/tasks → id=$NEW_ID (SQLite 쓰기 OK)"

curl -fs "${BASE}/api/tasks" | grep -q '"smoke test task"' || fail "생성한 task 가 목록에 없음"
curl -fs -X DELETE "${BASE}/api/tasks/${NEW_ID}" >/dev/null || fail "DELETE /api/tasks/$NEW_ID 실패"
echo "✅ DELETE /api/tasks/$NEW_ID (정리)"

echo "🎉 서비스 스모크 통과 (기동·health·읽기·쓰기 왕복)"
