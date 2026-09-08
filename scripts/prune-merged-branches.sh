#!/usr/bin/env bash
# 병합된 로컬 브랜치 정리 — origin/main 에 이미 병합된 작업 브랜치를 삭제한다.
#
# 언제 도는가:
#  - SessionStart 훅 (새 세션 = 새 계획 시작 시 자동)
#  - /feature · /build-next 오케스트레이터가 착수 직전에 한 번
#  - 필요하면 사람이 직접: `bash scripts/prune-merged-branches.sh`
#
# 안전장치:
#  - `git branch --merged origin/main` 로 후보를 뽑고, 그 각각을 `git merge-base --is-ancestor`
#    로 한 번 더 확인한 뒤에만 지운다. 미병합 브랜치는 절대 지우지 않는다.
#  - 현재 체크아웃된 브랜치와 `main` 은 건드리지 않는다.
#  - 원격 브랜치는 건드리지 않는다 (`git fetch --prune` 로 사라진 추적 참조만 정리).
#  - 대상 브랜치 접두어: feature/ docs/ fix/ design/ chore/ refactor/ (그 외 이름은 무시).

set -u

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
command -v git >/dev/null 2>&1 || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

git fetch --prune --quiet origin 2>/dev/null || true

git rev-parse --verify --quiet origin/main >/dev/null 2>&1 || exit 0

cur="$(git branch --show-current 2>/dev/null || true)"
deleted=()

while IFS= read -r br; do
  [ -z "$br" ] && continue
  [ "$br" = "main" ] && continue
  [ "$br" = "$cur" ] && continue
  case "$br" in
    feature/*|docs/*|fix/*|design/*|chore/*|refactor/*) ;;
    *) continue ;;
  esac
  # 이중 확인: 정말로 origin/main 의 조상인가
  git merge-base --is-ancestor "$br" origin/main 2>/dev/null || continue
  if git branch -D "$br" >/dev/null 2>&1; then
    deleted+=("$br")
  fi
done < <(git branch --merged origin/main --format='%(refname:short)' 2>/dev/null)

if [ "${#deleted[@]}" -gt 0 ]; then
  printf '🧹 병합된 로컬 브랜치 정리: %s\n' "${deleted[*]}"
fi
exit 0
