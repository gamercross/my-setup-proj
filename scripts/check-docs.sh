#!/usr/bin/env bash
# 문서·오케스트레이션 정합 검사 (DOC_HEALTH) — 얇은 래퍼.
#
# 사용법:
#   bash scripts/check-docs.sh                  전체 검사 (FAIL 있으면 exit 1)
#   bash scripts/check-docs.sh --bundle FR-WIDGET-01   작업에 필요한 문서 한 번에 모으기
#   bash scripts/check-docs.sh --list-checks
#
# python3 가 없으면 SKIP 처리(exit 0). 검사 내용·추가법: docs/setup/DOC_HEALTH.md
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v python3 >/dev/null 2>&1; then
  echo "⏭️  python3 없음 — 문서 정합 검사 건너뜀 (CI 에서는 실행됨)"
  exit 0
fi

exec python3 "$ROOT/scripts/check_docs.py" "$@"
