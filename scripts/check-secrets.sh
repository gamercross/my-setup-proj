#!/usr/bin/env bash
# pre-commit 시크릿 스캔 — NFR-SEC-01, RISKS R-13, REVERSE_PLAN §4-5 S5.
#
#   bash scripts/check-secrets.sh [--staged] [--files <path>...] [--self-test]
#
# 기본은 --staged (git diff --cached 대상). 외부 의존성 없이 git + grep 만 쓴다.
#
# 검사 ①(경로): .env·*.pem·agent/.secrets/* 등 금지 경로가 스테이징되면 차단.
# 검사 ②(내용): 스테이징된 diff 의 "추가 줄"만 Anthropic/Google/Slack/Fernet/PRIVATE KEY
#   등 시크릿 패턴과 대조. 탐지 값은 마스킹해서 출력한다(원문 노출 금지).
#
# 성능: 파일 한 개마다 "줄 단위로 grep 서브프로세스 spawn" 을 하지 않는다.
#   diff/파일 내용을 한 번의 순수 bash 루프로 "줄번호:내용" 배열에 적재한 뒤,
#   패턴마다(docs 는 최대 3개, 그 외 최대 8개) 파일 전체에 대해 grep 을 **1회**만 돌린다.
#
# 우회: SECRET_SCAN_SKIP=1 환경변수 또는 git commit --no-verify.
#
# 종료 코드 (scripts/smoke.sh / check-demo-parity.mjs 관례):
#   0  통과
#   1  탐지 — 커밋 차단
#   2  SKIP (git 없음/저장소 아님/스캔 대상 없음)
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="staged"
FILES=()
SELF_TEST=0

while [ $# -gt 0 ]; do
  case "$1" in
    --staged) MODE="staged"; shift ;;
    --files)
      MODE="files"; shift
      while [ $# -gt 0 ] && [[ "$1" != --* ]]; do
        FILES+=("$1")
        shift
      done
      ;;
    --self-test) SELF_TEST=1; shift ;;
    *) shift ;;
  esac
done

# ── 시크릿 내용 패턴 — "이름:ERE정규식" 형태로 순회한다. ──────────────
# 작은따옴표(') 문자는 bash 단일따옴표 문자열 안에 직접 못 넣으므로
# '<seg1>'"'\""'<seg2>' 관용구로 이어붙인다 (seg1 뒤에 ' 와 " 두 글자를 삽입).
# \x27 같은 \x 이스케이프는 POSIX ERE 에 없다(GNU grep 은 브래킷 안 백슬래시를
# 리터럴로 읽어 [\x27\"] 가 {\,x,2,7,"} 문자 클래스가 돼버려 탐지가 새는 실제
# 버그였다 — supervisor 지적, 2026-09-16 수정) — 실제 따옴표 문자를 직접 써야 한다.
PATTERNS=(
  'anthropic:sk-ant-[A-Za-z0-9_-]{16,}'
  'google-api:AIza[0-9A-Za-z_-]{35}'
  'google-oauth-secret:GOCSPX-[A-Za-z0-9_-]{20,}'
  'slack-token:xox[baprs]-[A-Za-z0-9-]{10,}'
  'slack-webhook:hooks\.slack\.com/services/T[A-Za-z0-9_/-]{20,}'
  'fernet-key:(TOKEN_ENCRYPTION_KEY|FERNET[_A-Z]*KEY|ENCRYPTION_KEY)[[:space:]]*[:=][[:space:]]*['"'\""']?[A-Za-z0-9_-]{43}='
  'private-key:-----BEGIN [A-Z ]*PRIVATE KEY-----'
  'filled-env:(ANTHROPIC_API_KEY|NOTION_API_KEY|SUPABASE_KEY|GOOGLE_CLIENT_SECRET|SLACK_WEBHOOK_URL)=[^[:space:]'"'\""']{12,}'
)

# docs/** 는 대부분 스캔 제외하되, 아래 패턴은 docs 도 검사한다(FP 위험이 낮고 유출 위험은 높음).
docs_included_pattern() {
  case "$1" in
    private-key|fernet-key|google-api) return 0 ;;
    *) return 1 ;;
  esac
}

# filled-env FP 억제: 값이 플레이스홀더로 시작하면 무시.
is_placeholder_value() {
  local val="$1"
  case "$val" in
    \$*|\<*|\{*|your*|Your*|YOUR*|xxx*|XXX*|여기*|PLACEHOLDER*|placeholder*|example*|Example*|EXAMPLE*) return 0 ;;
    *...*) return 0 ;;  # "https://hooks.slack.com/services/..." 같은 생략 표기
  esac
  return 1
}

mask_value() {
  local v="$1"
  if [ "${#v}" -le 6 ]; then
    echo "${v}****"
  else
    echo "${v:0:6}****"
  fi
}

# ── self-test ────────────────────────────────────────────
# git/저장소 확인보다 먼저 처리한다 (self-test 는 git 이 필요 없다).
self_test() {
  local tmp
  tmp="$(mktemp -d)"

  cat > "$tmp/anthropic.txt" <<'EOF'
key = "sk-ant-abcdefghijklmnopqrstuvwx"
EOF
  cat > "$tmp/google-api.txt" <<'EOF'
AIzaSyD-FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAK
EOF
  cat > "$tmp/google-oauth-secret.txt" <<'EOF'
GOCSPX-abcdefghijklmnopqrstuvwx
EOF
  cat > "$tmp/slack-token.txt" <<'EOF'
xoxb-1234567890-abcdefghij
EOF
  # GitHub push protection 이 실제 웹훅과 같은 형태(T########/B########/24자)를 감지해
  # 커밋을 막으므로, 정규식은 만족하되 형태를 깨뜨린 값을 쓴다.
  cat > "$tmp/slack-webhook.txt" <<'EOF'
https://hooks.slack.com/services/T-NOT-A-REAL-WEBHOOK-TEST-FIXTURE-ONLY
EOF
  # 작은따옴표로 감싼 fernet 값 — \x27 회귀 고정 (supervisor 지적 #3).
  cat > "$tmp/fernet-key.txt" <<'EOF'
TOKEN_ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
EOF
  cat > "$tmp/private-key.txt" <<'EOF'
-----BEGIN RSA PRIVATE KEY-----
EOF
  # 값에 x/2/7 이 포함된 filled-env — \x27 오작동 시 매치가 깨지는 회귀 고정.
  cat > "$tmp/filled-env.txt" <<'EOF'
ANTHROPIC_API_KEY=sk-ant-x27reallooking123
EOF
  cat > "$tmp/normal.txt" <<'EOF'
이것은 평범한 문서입니다. ANTHROPIC_API_KEY=your_key_here 처럼 플레이스홀더만 있습니다.
EOF

  local test_files=(
    "$tmp/anthropic.txt" "$tmp/google-api.txt" "$tmp/google-oauth-secret.txt"
    "$tmp/slack-token.txt" "$tmp/slack-webhook.txt" "$tmp/fernet-key.txt"
    "$tmp/private-key.txt" "$tmp/filled-env.txt" "$tmp/normal.txt"
  )

  FOUND=0
  local out
  out="$(check_content files "${test_files[@]}" 2>&1)"

  FOUND=0
  local normal_count
  normal_count="$(check_content files "$tmp/normal.txt" 2>&1 | grep -c '^❌')"

  rm -rf "$tmp"

  # 8개 패턴 이름이 각각 최소 1건씩 탐지됐는지 개별 확인한다(우연한 총합 일치로
  # private-key 같은 개별 실패를 놓치지 않도록).
  local expected=(anthropic google-api google-oauth-secret slack-token slack-webhook fernet-key private-key filled-env)
  local missing=()
  local name
  for name in "${expected[@]}"; do
    if ! echo "$out" | grep -q "\[$name\]"; then
      missing+=("$name")
    fi
  done

  local missing_desc="없음"
  [ "${#missing[@]}" -gt 0 ] && missing_desc="${missing[*]}"

  if [ "${#missing[@]}" -eq 0 ] && [ "$normal_count" -eq 0 ]; then
    echo "✅ self-test 통과: 8개 패턴 각 1건 이상 탐지, 정상 파일 0건"
    exit 0
  else
    echo "❌ self-test 실패: 누락 패턴=[${missing_desc}], 정상파일 오탐 ${normal_count}건(기대 0)"
    exit 1
  fi
}

# check_content 는 self-test 에서도 쓰이므로 함수 정의를 먼저 마친 뒤에 분기한다.

# ── 검사 ① 경로 ──────────────────────────────────────────
is_excluded_file() {
  case "$1" in
    scripts/check-secrets.sh|.githooks/pre-commit|scripts/check_docs.py) return 0 ;;
    *) return 1 ;;
  esac
}

is_blocked_path() {
  local f="$1"
  local base
  base="$(basename "$f")"
  case "$base" in
    .env.example|*.sample|*.example) return 1 ;;
  esac
  case "$f" in
    .env|.env.local|.env.*.local|*/.env) return 0 ;;
    agent/.secrets/*) return 0 ;;
    *.pem|*.p12|*.pfx|*.key) return 0 ;;
    id_rsa|*_rsa) return 0 ;;
    credentials.json|*/credentials.json) return 0 ;;
    client_secret*.json|*/client_secret*.json) return 0 ;;
    *token*.enc) return 0 ;;
  esac
  return 1
}

check_paths() {
  local files=("$@")
  local f
  for f in "${files[@]}"; do
    [ -z "$f" ] && continue
    if is_blocked_path "$f"; then
      echo "❌ [경로 차단] $f — 시크릿/키 파일로 보이는 경로가 스테이징되었습니다."
      FOUND=1
    fi
  done
}

# ── 대상 파일의 "추가된 줄"을 (원본 줄번호, 내용) 병렬 배열로 적재 ──────
# 서브프로세스를 spawn 하지 않는 순수 bash while-read 루프라 큰 diff 도 빠르다.
# 전역 배열 CONTENT_LINES / LINE_NUMS 를 채운다(호출 전 비워야 함).
build_numbered_lines() {
  local mode="$1"; local f="$2"
  CONTENT_LINES=()
  LINE_NUMS=()

  if [ "$mode" = "staged" ]; then
    local diff_out
    diff_out="$(git diff --cached -U0 -- "$f" 2>/dev/null)"
    [ -z "$diff_out" ] && return
    local new_line=0
    local line rest numpart
    while IFS= read -r line; do
      case "$line" in
        '@@'*)
          # "@@ -a,b +c,d @@ ..." 에서 +c 를 추출한다 (subprocess 없이 순수 bash).
          rest="${line#*+}"
          numpart="${rest%%[, ]*}"
          new_line="$numpart"
          ;;
        '+++'*) : ;;
        '+'*)
          CONTENT_LINES+=("${line:1}")
          LINE_NUMS+=("$new_line")
          new_line=$((new_line + 1))
          ;;
        *) : ;;
      esac
    done <<< "$diff_out"
  else
    [ -f "$f" ] || return
    local n=0
    local line
    while IFS= read -r line; do
      n=$((n + 1))
      CONTENT_LINES+=("$line")
      LINE_NUMS+=("$n")
    done < "$f"
  fi
}

# ── 검사 ② 내용 ──────────────────────────────────────────
# $1 = diff 소스 모드('staged' 또는 'files'), 이후 인자는 대상 파일 목록.
# 파일당: build_numbered_lines() 1회(순수 bash) + 패턴당 grep 1회(파일 전체를 한 번에).
check_content() {
  local mode="$1"; shift
  local files=("$@")
  local f
  for f in "${files[@]}"; do
    [ -z "$f" ] && continue
    is_excluded_file "$f" && continue

    local is_docs=0
    case "$f" in
      docs/*) is_docs=1 ;;
    esac

    build_numbered_lines "$mode" "$f"
    [ "${#CONTENT_LINES[@]}" -eq 0 ] && continue

    local entry name pattern matches match_line pos content matched val
    for entry in "${PATTERNS[@]}"; do
      name="${entry%%:*}"
      pattern="${entry#*:}"
      if [ "$is_docs" = "1" ] && ! docs_included_pattern "$name"; then
        continue
      fi

      # 파일 전체(모든 추가 줄)를 대상으로 grep 1회 — 줄마다 서브프로세스를 띄우지 않는다.
      matches="$(printf '%s\n' "${CONTENT_LINES[@]}" | grep -nE -- "$pattern" 2>/dev/null)" || true
      [ -z "$matches" ] && continue

      while IFS= read -r match_line; do
        [ -z "$match_line" ] && continue
        pos="${match_line%%:*}"          # grep -n 이 매긴, CONTENT_LINES 안에서의 1-based 위치
        content="${match_line#*:}"
        matched="$(printf '%s' "$content" | grep -Eo -- "$pattern" | head -1)"
        if [ "$name" = "filled-env" ]; then
          val="${matched#*=}"
          is_placeholder_value "$val" && continue
        fi
        echo "❌ [내용 탐지] ${f}:${LINE_NUMS[$((pos - 1))]}  [$name]  $(mask_value "$matched")"
        FOUND=1
      done <<< "$matches"
    done
  done
}

FOUND=0

if [ "$SELF_TEST" = "1" ]; then
  self_test
fi

# --files 인데 경로가 하나도 안 주어졌으면 크래시하지 말고 SKIP 으로 안내한다
# (supervisor 지적 #2 — set -u 에서 빈 배열 확장 시 unbound variable 로 죽던 버그).
if [ "$MODE" = "files" ] && [ "${#FILES[@]}" -eq 0 ]; then
  echo "⏭️  --files 뒤에 대상 경로가 없습니다 — 시크릿 스캔 건너뜀"
  exit 2
fi

if ! command -v git >/dev/null 2>&1; then
  echo "⏭️  git 없음 — 시크릿 스캔 건너뜀"; exit 2
fi
if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "⏭️  git 저장소가 아님 — 시크릿 스캔 건너뜀"; exit 2
fi

if [ "${SECRET_SCAN_SKIP:-0}" = "1" ]; then
  echo "⚠️  SECRET_SCAN_SKIP=1 — 시크릿 스캔을 건너뜁니다(우회됨)."
  exit 0
fi

# ── 실행 ─────────────────────────────────────────────────
# mapfile(bash4+) 은 macOS 기본 bash(3.2) 에 없다 — NUL 구분 while read 로 이식성 확보.
# 빈 배열을 "${arr[@]}" 로 확장하면 bash 3.2 의 set -u 에서 unbound variable 로 죽으므로
# "${arr[@]+"${arr[@]}"}" 관용구로 안전하게 다룬다.
TARGET_FILES=()
if [ "$MODE" = "staged" ]; then
  while IFS= read -r -d '' f; do
    TARGET_FILES+=("$f")
  done < <(git diff --cached --name-only --diff-filter=ACMR -z 2>/dev/null)
else
  TARGET_FILES=("${FILES[@]+"${FILES[@]}"}")
fi

if [ "${#TARGET_FILES[@]}" -eq 0 ]; then
  echo "✅ 스테이징된 대상 파일 없음 — 시크릿 스캔 통과"
  exit 0
fi

check_paths "${TARGET_FILES[@]}"
check_content "$MODE" "${TARGET_FILES[@]}"

if [ "$FOUND" = "1" ]; then
  cat <<'MSG'

──────────────────────────────────────────────────────────
❌ 시크릿으로 의심되는 값/경로가 커밋에 포함되어 있습니다.
   조치:
     1. 해당 값을 .env(추적 제외됨) 로 옮기세요.
     2. git restore --staged <파일> 로 스테이징에서 제외하세요.
   오탐이라면:
     - SECRET_SCAN_SKIP=1 git commit ...
     - git commit --no-verify
──────────────────────────────────────────────────────────
MSG
  exit 1
fi

echo "✅ 시크릿 스캔 통과"
exit 0
