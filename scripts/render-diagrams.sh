#!/usr/bin/env bash
# docs/ 안의 모든 Mermaid 코드블록을 SVG 이미지로 내보낸다.
#
# 사용법:  bash scripts/render-diagrams.sh
# 출력:    docs/diagrams/<문서이름>-N.svg  (블록마다 하나)
#
# 도구: @mermaid-js/mermaid-cli (MIT) 를 npx 로 즉석 실행한다.
#       Node 18+ 필요. 최초 실행 시 Chromium 을 내려받는다.
#       Node 가 없으면 안내만 하고 0 으로 종료한다(치명적 아님).
#
# 산출물(docs/diagrams/)은 커밋하지 않는다 — 원천은 각 .md 의 코드블록이다.
# 자세한 설명: docs/setup/DIAGRAMS.md

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT_DIR="docs/diagrams"

if ! command -v node >/dev/null 2>&1; then
  echo "⏭️  node 가 없어 다이어그램을 렌더하지 못했습니다."
  echo "    GitHub 에서는 자동으로 렌더됩니다. 로컬 이미지는 Node 18+ 설치 후 다시 실행하세요."
  exit 0
fi
if ! command -v npx >/dev/null 2>&1; then
  echo "⏭️  npx 가 없습니다. Node 를 재설치하거나 npm i -g npx 하세요."
  exit 0
fi

mkdir -p "$OUT_DIR"

# mermaid 블록이 있는 md 파일만 처리
mapfile -t FILES < <(grep -rl '```mermaid' docs --include='*.md' || true)

if [ "${#FILES[@]}" -eq 0 ]; then
  echo "Mermaid 블록이 있는 문서가 없습니다."
  exit 0
fi

echo "▶ ${#FILES[@]}개 문서에서 다이어그램 렌더"
for f in "${FILES[@]}"; do
  base="$(basename "$f" .md)"
  echo "  - $f → $OUT_DIR/${base}-*.svg"
  # mmdc: .md 입력 → 코드블록마다 <출력이름>-N.svg 생성
  npx -y @mermaid-js/mermaid-cli -i "$f" -o "$OUT_DIR/${base}.svg" >/dev/null 2>&1 \
    || echo "    ⚠️  $f 렌더 실패 (건너뜀)"
done

echo "✅ 완료: $OUT_DIR/"
