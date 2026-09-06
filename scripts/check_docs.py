#!/usr/bin/env python3
"""문서·오케스트레이션 정합 검사 (DOC_HEALTH).

에이전트/사람이 우리가 작성한 시스템을 놓치지 않고 작업할 수 있게,
문서 체계가 내부적으로 일관되고 완결돼 있는지 확인한다.

사용법:
  python3 scripts/check_docs.py            # 전체 검사 (FAIL 있으면 exit 1)
  python3 scripts/check_docs.py --bundle FR-WIDGET-01   # 그 요구사항 작업에 필요한 문서를 한 번에 모아 출력
  python3 scripts/check_docs.py --list-checks

검사 항목·추가법: docs/setup/DOC_HEALTH.md
"""
from __future__ import annotations
import os
import re
import sys
import pathlib
import posixpath

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"

# ── 유틸 ───────────────────────────────────────────────
LINK_RE = re.compile(r"\]\(([^)]+)\)")
FR_ID_RE = re.compile(r"\bFR-([A-Z]+)-(\d{2,3})\b")
FR_RANGE_RE = re.compile(r"\bFR-([A-Z]+)-(\d{2,3})\s*~\s*(\d{2,3})\b")
ADR_NUM_RE = re.compile(r"\bADR-(\d{4})\b")
MERMAID_TYPES = (
    "flowchart", "graph", "sequenceDiagram", "stateDiagram-v2", "stateDiagram",
    "gitGraph", "erDiagram", "classDiagram", "mindmap", "journey", "pie",
    "gantt", "timeline", "quadrantChart", "C4Context",
)

results: list[tuple[str, str, str]] = []  # (level, check_id, message)  level ∈ PASS/WARN/FAIL

# 이 파일들은 검사를 문서화/구현하므로 DRIFT 패턴을 문자열로 담고 있다 → DRIFT 검사에서 제외.
DRIFT_SELF = {"scripts/check_docs.py", "scripts/check-docs.sh", "docs/setup/DOC_HEALTH.md",
              "docs/product/architecture/adr/ADR-0019-architecture-fitness-functions.md",
              "docs/product/architecture/adr/ADR-0023-branch-model.md"}


def add(level: str, cid: str, msg: str) -> None:
    results.append((level, cid, msg))


def md_files(base: pathlib.Path) -> list[pathlib.Path]:
    out = []
    for dp, dns, fns in os.walk(base):
        dns[:] = [d for d in dns if d not in (".git", "node_modules", "diagrams", "venv")]
        for fn in fns:
            if fn.endswith(".md"):
                out.append(pathlib.Path(dp) / fn)
    return out


def read(p: pathlib.Path) -> str:
    return p.read_text(encoding="utf-8")


def rel(p: pathlib.Path) -> str:
    return p.relative_to(ROOT).as_posix()


# ── STRUCT-1: 상대 링크가 모두 해석되는가 ───────────────
def check_links() -> None:
    bad = []
    scan = md_files(DOCS) + [ROOT / "README.md", ROOT / "작업로그.md"]
    for fp in scan:
        if not fp.exists():
            continue
        d = posixpath.dirname(rel(fp))
        for m in LINK_RE.finditer(read(fp)):
            raw = m.group(1).strip()
            if raw.startswith(("http://", "https://", "mailto:", "#")):
                continue
            path = raw.split("#")[0]
            if not path:
                continue
            target = path if path.startswith("/") else posixpath.normpath(posixpath.join(d, path))
            if not (ROOT / target).exists():
                bad.append(f"{rel(fp)}  ->  {raw}")
    if bad:
        add("FAIL", "STRUCT-1", f"깨진 상대 링크 {len(bad)}건:\n    " + "\n    ".join(bad))
    else:
        add("PASS", "STRUCT-1", "모든 상대 md 링크 해석됨")


# ── STRUCT-2: mermaid 코드블록이 온전한가 ───────────────
def check_mermaid() -> None:
    bad = []
    for fp in md_files(DOCS) + [ROOT / "README.md"]:
        if not fp.exists():
            continue
        lines = read(fp).splitlines()
        i = 0
        n_blocks = 0
        while i < len(lines):
            if lines[i].strip() == "```mermaid":
                n_blocks += 1
                j = i + 1
                while j < len(lines) and lines[j].strip() != "```":
                    j += 1
                if j >= len(lines):
                    bad.append(f"{rel(fp)}: mermaid 블록 #{n_blocks} 닫는 ``` 없음")
                    break
                body = [x.strip() for x in lines[i + 1:j] if x.strip() and not x.strip().startswith("%%")]
                if not body:
                    bad.append(f"{rel(fp)}: mermaid 블록 #{n_blocks} 비어 있음")
                elif not body[0].split()[0].startswith(MERMAID_TYPES):
                    bad.append(f"{rel(fp)}: mermaid 블록 #{n_blocks} 첫 줄이 다이어그램 타입 아님 ({body[0][:40]!r})")
                i = j + 1
            else:
                i += 1
    if bad:
        add("FAIL", "STRUCT-2", f"mermaid 블록 문제 {len(bad)}건:\n    " + "\n    ".join(bad))
    else:
        add("PASS", "STRUCT-2", "모든 mermaid 블록 온전 (fence 닫힘 + 타입 인식)")


# ── STRUCT-3: 각 폴더 README 가 그 폴더의 모든 .md 를 표에 링크하는가 ──
FOLDER_README_DIRS = [
    "docs",
    "docs/product",
    "docs/product/vision",
    "docs/product/requirements",
    "docs/product/architecture",
    "docs/product/architecture/adr",
    "docs/product/reference",
    "docs/product/testing",
    "docs/setup",
    "docs/progress",
]


def check_readme_coverage() -> None:
    missing_readme = []
    uncovered = []
    for d in FOLDER_README_DIRS:
        folder = ROOT / d
        readme = folder / "README.md"
        if not readme.exists():
            missing_readme.append(d + "/README.md")
            continue
        text = read(readme)
        linked = set()
        for m in LINK_RE.finditer(text):
            raw = m.group(1).split("#")[0].strip()
            if not raw or raw.startswith(("http", "mailto:")):
                continue
            linked.add(posixpath.normpath(posixpath.join(d, raw)))
        for f in sorted(folder.glob("*.md")):
            if f.name == "README.md":
                continue
            if rel(f) not in linked:
                uncovered.append(rel(f))
    if missing_readme:
        add("FAIL", "STRUCT-3", "README.md 없는 폴더:\n    " + "\n    ".join(missing_readme))
    elif uncovered:
        add("FAIL", "STRUCT-3", f"폴더 README 표에 안 걸린 문서 {len(uncovered)}건:\n    " + "\n    ".join(uncovered))
    else:
        add("PASS", "STRUCT-3", f"{len(FOLDER_README_DIRS)}개 폴더 README 가 모든 하위 .md 를 링크")


# ── XREF-1/2: 모든 ADR 파일이 DESIGN §2 표 + adr/README 표에 등재 ──
def check_adr_tables() -> None:
    adr_dir = ROOT / "docs/product/architecture/adr"
    adr_nums = set()
    for f in adr_dir.glob("ADR-*.md"):
        m = re.match(r"ADR-(\d{4})-", f.name)
        if m:
            adr_nums.add(m.group(1))
    design = read(ROOT / "docs/product/architecture/DESIGN.md")
    adr_readme = read(adr_dir / "README.md")
    in_design = set(ADR_NUM_RE.findall(design))
    in_readme = set(ADR_NUM_RE.findall(adr_readme))
    miss_design = sorted(adr_nums - in_design)
    miss_readme = sorted(adr_nums - in_readme)
    if miss_design:
        add("FAIL", "XREF-1", "DESIGN.md §2 표에 없는 ADR: " + ", ".join(miss_design))
    else:
        add("PASS", "XREF-1", f"{len(adr_nums)}개 ADR 전부 DESIGN.md §2 에 등재")
    if miss_readme:
        add("FAIL", "XREF-2", "adr/README.md 표에 없는 ADR: " + ", ".join(miss_readme))
    else:
        add("PASS", "XREF-2", f"{len(adr_nums)}개 ADR 전부 adr/README.md 에 등재")


# ── XREF-3: FUNCTIONAL 의 모든 FR-id 가 TRACEABILITY 에서 추적되는가 ──
def _expand(text: str) -> set[str]:
    ids = {f"FR-{d}-{int(n):02d}" for d, n in FR_ID_RE.findall(text)}
    for d, lo, hi in FR_RANGE_RE.findall(text):
        for k in range(int(lo), int(hi) + 1):
            ids.add(f"FR-{d}-{k:02d}")
    return ids


def check_fr_traceability() -> None:
    fr_doc = read(ROOT / "docs/product/requirements/REQUIREMENTS_FUNCTIONAL.md")
    tr_doc = read(ROOT / "docs/product/requirements/TRACEABILITY.md")
    defined = _expand(fr_doc)
    covered = _expand(tr_doc)
    missing = sorted(defined - covered)
    if missing:
        add("FAIL", "XREF-3", f"TRACEABILITY.md 에서 추적 안 되는 FR {len(missing)}건: " + ", ".join(missing))
    else:
        add("PASS", "XREF-3", f"FUNCTIONAL 의 FR {len(defined)}개 전부 TRACEABILITY 에 (정확 id 또는 범위)")


# ── XREF-4: planner.md 가 읽으라는 문서가 실제로 있는가 ──
def check_agent_doc_refs() -> None:
    bad = []
    for name in ("planner.md", "developer.md", "supervisor.md", "finisher.md"):
        p = ROOT / ".claude/agents" / name
        if not p.exists():
            continue
        for path in re.findall(r"docs/[A-Za-z0-9_./-]+\.md", read(p)):
            if not (ROOT / path).exists():
                bad.append(f".claude/agents/{name}  ->  {path}")
    for name in ("feature.md", "build-next.md"):
        p = ROOT / ".claude/commands" / name
        if not p.exists():
            continue
        for path in re.findall(r"docs/[A-Za-z0-9_./-]+\.md", read(p)):
            if not (ROOT / path).exists():
                bad.append(f".claude/commands/{name}  ->  {path}")
    if bad:
        add("FAIL", "XREF-4", "에이전트 문서가 가리키는 존재하지 않는 경로:\n    " + "\n    ".join(bad))
    else:
        add("PASS", "XREF-4", ".claude 에이전트·커맨드가 참조하는 docs 경로 전부 실재")


# ── DRIFT-1: 하드코딩된 절대 경로 (launchd plist 만 예외) ──
def check_hardcoded_paths() -> None:
    path_re = re.compile(r"/Users/[A-Za-z0-9._-]+/")
    talk_re = re.compile(r"grep|하드코딩|NFR-PORT|check[_-]docs|`/Users/`|절대\s*경로")
    hits = []
    for dp, dns, fns in os.walk(ROOT):
        dns[:] = [d for d in dns if d not in (".git", "node_modules", "venv", ".pytest_cache", "dist")]
        for fn in fns:
            if fn.endswith((".plist",)) or fn.startswith("."):
                continue
            if not fn.endswith((".md", ".sh", ".js", ".py", ".json", ".yml", ".yaml", ".txt")):
                continue
            fp = pathlib.Path(dp) / fn
            if rel(fp) in DRIFT_SELF:
                continue
            try:
                txt = read(fp)
            except Exception:
                continue
            for ln, line in enumerate(txt.splitlines(), 1):
                if path_re.search(line) and not talk_re.search(line):
                    hits.append(f"{rel(fp)}:{ln}  {line.strip()[:80]}")
    if hits:
        add("WARN", "DRIFT-1", f"하드코딩된 /Users/ 경로 {len(hits)}건 (설정으로 분리, NFR-PORT-03):\n    " + "\n    ".join(hits[:20]))
    else:
        add("PASS", "DRIFT-1", "하드코딩된 절대 경로 없음 (plist 제외)")


# ── DRIFT-2: 구버전 Claude 모델 id ──
def check_model_ids() -> None:
    pat = re.compile(r"claude-(?:opus-4|sonnet-4|haiku-4(?!-5)|3(?:[.-]\d)?)-?[a-z0-9-]*")
    hits = []
    for fp in md_files(DOCS) + list((ROOT / ".claude").rglob("*.md")):
        if rel(fp) in DRIFT_SELF:
            continue
        for ln, line in enumerate(read(fp).splitlines(), 1):
            if pat.search(line) and "claude-haiku-4-5" not in line:
                hits.append(f"{rel(fp)}:{ln}  {line.strip()[:80]}")
    if hits:
        add("WARN", "DRIFT-2", f"구버전 모델 id 로 보이는 것 {len(hits)}건 (기준: claude-opus-5):\n    " + "\n    ".join(hits))
    else:
        add("PASS", "DRIFT-2", "문서에 구버전 Claude 모델 id 없음")


# ── DRIFT-3: .env.example 에 실제 시크릿 패턴 ──
def check_env_example() -> None:
    p = ROOT / ".env.example"
    if not p.exists():
        add("WARN", "DRIFT-3", ".env.example 없음 (setup.sh 가 참조)")
        return
    secret_pat = re.compile(r"(sk-ant-|sk-[A-Za-z0-9]{20}|secret_[A-Za-z0-9]|GOCSPX-|xox[bap]-|eyJ[A-Za-z0-9_-]{10}|hooks\.slack\.com/services/T)")
    hits = []
    for ln, line in enumerate(read(p).splitlines(), 1):
        s = line.split("#", 1)[0]
        if secret_pat.search(s):
            hits.append(f"{ln}: {line.strip()[:60]}")
        if re.match(r"^\s*[A-Z_]+=\s+\S", line):  # '= ' 뒤 공백 + 값
            hits.append(f"{ln}: '=' 뒤 공백 (shell 파싱 깨짐) — {line.strip()[:50]}")
    if hits:
        add("FAIL", "DRIFT-3", ".env.example 에 실제 값/시크릿 패턴 (NFR-SEC-01):\n    " + "\n    ".join(hits))
    else:
        add("PASS", "DRIFT-3", ".env.example 은 플레이스홀더만 (시크릿 0)")


# ── DRIFT-4: 폐기된 브랜치 정책 문구 ──
def check_stale_branch_policy() -> None:
    stale = [
        r"main\s*단일\s*브랜치",
        r"초기\s*셋업.{0,20}main\s*직접\s*커밋\s*허용",
        r"Week\s*3~?\s*는?\s*`?feature",
        r"지금은?\s*`?main`?\s*직접\s*커밋\s*(?:OK|허용)",
    ]
    pat = re.compile("|".join(stale))
    hits = []
    for fp in md_files(DOCS) + [ROOT / "README.md"] + list((ROOT / ".claude").rglob("*.md")):
        if rel(fp) in DRIFT_SELF:
            continue
        for ln, line in enumerate(read(fp).splitlines(), 1):
            if pat.search(line):
                hits.append(f"{rel(fp)}:{ln}  {line.strip()[:80]}")
    if hits:
        add("WARN", "DRIFT-4", f"폐기된 브랜치 정책 문구 {len(hits)}건 (기준: ADR-0023, feature/* → PR → main):\n    " + "\n    ".join(hits))
    else:
        add("PASS", "DRIFT-4", "폐기된 브랜치 정책 문구 없음 (ADR-0023 정합)")


CHECKS = [
    check_links, check_mermaid, check_readme_coverage,
    check_adr_tables, check_fr_traceability, check_agent_doc_refs,
    check_hardcoded_paths, check_model_ids, check_env_example, check_stale_branch_policy,
]

CHECK_DESC = {
    "STRUCT-1": "모든 md 파일의 상대 링크가 실제 파일을 가리키는가 (FAIL)",
    "STRUCT-2": "mermaid 코드블록의 fence 가 닫히고 첫 줄이 다이어그램 타입인가 (FAIL)",
    "STRUCT-3": "각 폴더 README 가 그 폴더의 모든 .md 를 표에 링크하는가 (FAIL)",
    "XREF-1": "모든 ADR 파일이 DESIGN.md §2 표에 등재됐는가 (FAIL)",
    "XREF-2": "모든 ADR 파일이 adr/README.md 표에 등재됐는가 (FAIL)",
    "XREF-3": "REQUIREMENTS_FUNCTIONAL 의 모든 FR-id 가 TRACEABILITY 에서 추적되는가 (FAIL)",
    "XREF-4": ".claude 에이전트·커맨드가 참조하는 docs 경로가 실재하는가 (FAIL)",
    "DRIFT-1": "하드코딩된 /Users/ 절대 경로 (plist 제외) — NFR-PORT-03 (WARN)",
    "DRIFT-2": "문서에 구버전 Claude 모델 id (기준: claude-opus-5) (WARN)",
    "DRIFT-3": ".env.example 에 실제 값·시크릿 패턴·'=' 뒤 공백 — NFR-SEC-01 (FAIL)",
    "DRIFT-4": "폐기된 브랜치 정책 문구 (기준: ADR-0023) (WARN)",
}


# ── --bundle: 에이전트 컨텍스트 번들 ────────────────────
def bundle(fr_id: str) -> int:
    fr_id = fr_id.strip().upper()
    m = re.match(r"FR-([A-Z]+)-(\d+)", fr_id)
    if not m:
        print(f"FR id 형식이 아님: {fr_id!r} (예: FR-WIDGET-01)")
        return 2
    domain, num = m.group(1), f"{int(m.group(2)):02d}"
    fr_id = f"FR-{domain}-{num}"
    print(f"# 컨텍스트 번들 — {fr_id}\n")

    def section(title: str, path: str, pred):
        p = ROOT / path
        if not p.exists():
            print(f"## {title}\n  (없음: {path})\n")
            return
        hits = [ln.rstrip() for ln in read(p).splitlines() if pred(ln)]
        print(f"## {title}  ({path})")
        print("\n".join("  " + h for h in hits) if hits else "  (해당 행 없음)")
        print()

    section("요구사항 요약행", "docs/product/requirements/REQUIREMENTS_FUNCTIONAL.md",
            lambda l: fr_id in l)

    # 도메인 상세: 요청한 FR 의 섹션만 (## FR-... 부터 다음 ## 까지)
    dom_path = ROOT / f"docs/product/requirements/{domain}.md"
    print(f"## 도메인 상세 (수용 기준)  (docs/product/requirements/{domain}.md)")
    if dom_path.exists():
        dl = read(dom_path).splitlines()
        blk, grab = [], False
        for line in dl:
            if line.startswith("## ") and fr_id in line:
                grab = True
            elif line.startswith("## ") and grab:
                break
            if grab:
                blk.append(line)
        print("\n".join("  " + b for b in blk) if blk else "  (해당 FR 섹션 없음 — 파일 전체 확인)")
    else:
        print(f"  (없음: {dom_path.relative_to(ROOT)})")
    print()

    section("추적 행 (설계·Phase·테스트·코드)", "docs/product/requirements/TRACEABILITY.md",
            lambda l: fr_id in l or f"FR-{domain}-" in l)
    section("테스트 케이스", "docs/product/testing/TEST_PLAN.md",
            lambda l: fr_id in l or f"FR-{domain}" in l or f"TC-{domain}" in l)

    tr = read(ROOT / "docs/product/requirements/TRACEABILITY.md")
    tr_rows = [l for l in tr.splitlines() if fr_id in l or f"FR-{domain}-" in l]
    adrs = sorted(set(ADR_NUM_RE.findall("\n".join(tr_rows))))
    print("## 관련 ADR")
    if adrs:
        adr_dir = ROOT / "docs/product/architecture/adr"
        for a in adrs:
            f = next(iter(adr_dir.glob(f"ADR-{a}-*.md")), None)
            if f:
                first = read(f).splitlines()[0].lstrip("# ").strip()
                status = next((l for l in read(f).splitlines() if l.startswith("- 상태:")), "")
                print(f"  {f.relative_to(ROOT).as_posix()} — {first}  {status.replace('- 상태:', '').strip()}")
    else:
        print("  (추적 행에 명시된 ADR 없음 — architecture/adr/README.md 목록 확인)")
    print()
    print("## 다음 단계")
    print("  docs/product/requirements/README.md · docs/product/architecture/README.md 의 '다음으로' 표 참고")
    return 0


def main(argv: list[str]) -> int:
    if "--list-checks" in argv:
        for cid, desc in CHECK_DESC.items():
            print(f"  {cid:<10} {desc}")
        return 0
    if "--bundle" in argv:
        i = argv.index("--bundle")
        if i + 1 >= len(argv):
            print("사용법: --bundle FR-WIDGET-01")
            return 2
        return bundle(argv[i + 1])

    for c in CHECKS:
        try:
            c()
        except Exception as e:  # 검사 자체가 터지면 FAIL 로 보고 (조용히 넘어가지 않음)
            add("FAIL", c.__name__, f"검사 실행 중 예외: {e!r}")

    order = {"FAIL": 0, "WARN": 1, "PASS": 2}
    for level, cid, msg in sorted(results, key=lambda r: (order[r[0]], r[1])):
        icon = {"PASS": "✅", "WARN": "⚠️ ", "FAIL": "❌"}[level]
        print(f"{icon} [{cid}] {msg}")

    n_fail = sum(1 for r in results if r[0] == "FAIL")
    n_warn = sum(1 for r in results if r[0] == "WARN")
    n_pass = sum(1 for r in results if r[0] == "PASS")
    print(f"\n문서 정합: 통과 {n_pass} / 경고 {n_warn} / 실패 {n_fail}")
    return 1 if n_fail else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
