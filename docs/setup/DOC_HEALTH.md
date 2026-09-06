# 🩺 문서 정합 검사 (DOC_HEALTH)

> 에이전트/사람이 **우리가 작성한 시스템을 놓치지 않고** 작업할 수 있도록,
> 문서·오케스트레이션 체계가 내부적으로 일관되고 완결돼 있는지 자동으로 확인한다.
> [ADR-0019](../product/architecture/adr/ADR-0019-architecture-fitness-functions.md) 의 피트니스 함수 개념을 **문서 체계 자체**에 적용한 것.

**📂 이동:** [⬆ setup/](README.md) · [docs/](../README.md) · [🚀 ONBOARDING](../ONBOARDING.md) · 관련: [GIT_WORKFLOW](GIT_WORKFLOW.md) · [ORCHESTRATION](ORCHESTRATION.md)

---

## 1. 실행

```bash
bash scripts/check-docs.sh                    # 전체 검사 (FAIL 있으면 exit 1)
bash scripts/check-docs.sh --list-checks      # 검사 항목 목록
bash scripts/check-docs.sh --bundle FR-WIDGET-01   # 그 요구사항 작업에 필요한 문서를 한 번에 모아 출력
```

- `bash verify.sh` (및 `--code-only`) 에 **"▶ 문서 정합 확인"** 으로 포함된다.
- CI (`.github/workflows/test.yml` 의 `docs` 잡) 에서 모든 push·PR 마다 실행된다.
- `python3` 가 없으면 래퍼가 SKIP(exit 0) — CI 에는 있으므로 거기서 반드시 돈다.

---

## 2. 무엇을 검사하나

| ID | 검사 | 수준 | 깨지면 |
|---|---|:---:|---|
| **STRUCT-1** | 모든 `.md` 의 상대 링크가 실제 파일을 가리킨다 (`docs/**`, 루트 README, 작업로그) | FAIL | 파일 이동·이름 변경 후 링크 미갱신 |
| **STRUCT-2** | 모든 ` ```mermaid ` 블록이 닫히고 첫 줄이 다이어그램 타입이다 | FAIL | 다이어그램이 GitHub 에서 안 그려짐 |
| **STRUCT-3** | 10개 폴더 README 각각이 그 폴더의 **모든 `.md` 를 표에 링크**한다 | FAIL | 새 문서를 추가하고 폴더 README 에 안 넣음 → 에이전트가 그 문서 존재를 모름 |
| **XREF-1** | 모든 `adr/ADR-NNNN-*.md` 가 `DESIGN.md §2` 표에 등재 | FAIL | 새 ADR 을 DESIGN 목록에 안 넣음 |
| **XREF-2** | 모든 ADR 이 `adr/README.md` 표에 등재 | FAIL | 〃 (adr 목록) |
| **XREF-3** | `REQUIREMENTS_FUNCTIONAL.md` 의 모든 `FR-<도메인>-<번호>` 가 `TRACEABILITY.md` 에서 추적된다 (정확 id 또는 `FR-X-01~04` 범위) | FAIL | 새 FR 을 추적 매트릭스에 안 넣음 → 설계·테스트·코드 연결 누락 |
| **XREF-4** | `.claude/agents/*`·`.claude/commands/*` 가 참조하는 `docs/...md` 경로가 실재한다 | FAIL | 문서 이동 후 에이전트 지시문 미갱신 → 에이전트가 없는 파일을 읽으려 함 |
| **DRIFT-1** | 하드코딩된 `/Users/<이름>/` 절대 경로 없음 (launchd `*.plist` 예외) | WARN | 다른 머신에서 깨짐 (NFR-PORT-03) |
| **DRIFT-2** | 문서에 구버전 Claude 모델 id 없음 (기준 `claude-opus-5`) | WARN | 에이전트가 옛 모델명을 복사 |
| **DRIFT-3** | `.env.example` 에 실제 값·시크릿 패턴(`sk-ant-`, `hooks.slack.com/services/T`, JWT…)·`= ` 뒤 공백 없음 | FAIL | 시크릿 유출(NFR-SEC-01), shell 파싱 깨짐 |
| **DRIFT-4** | 폐기된 브랜치 정책 문구("main 단일 브랜치", "초기엔 main 직접 커밋 허용" 등) 없음 | WARN | [ADR-0023](../product/architecture/adr/ADR-0023-branch-model.md) 이후 문서 드리프트 |

- **FAIL** = `verify.sh`/CI 를 빨갛게 만든다 → 커밋 게이트에 걸린다.
- **WARN** = 리포트에만 뜬다(exit 0). supervisor/finisher 가 판단해 처리하거나 이유를 남긴다.

---

## 3. `--bundle <FR-ID>` — 에이전트 컨텍스트 번들

기능 착수 전 `planner` 또는 사람이 한 줄로 그 작업에 필요한 문서를 전부 모은다:

```
$ bash scripts/check-docs.sh --bundle FR-TASK-03

# 컨텍스트 번들 — FR-TASK-03
## 요구사항 요약행       (REQUIREMENTS_FUNCTIONAL.md 해당 행)
## 도메인 상세 (수용 기준) (requirements/TASK.md 의 ## FR-TASK-03 섹션 전체)
## 추적 행               (TRACEABILITY.md 의 관련 행 — 설계·Phase·TC·코드 위치)
## 테스트 케이스          (TEST_PLAN.md 의 관련 TC)
## 관련 ADR              (추적 행에 명시된 ADR + 제목·상태)
## 다음 단계
```

"이 작업에 뭘 봐야 하지?" 를 매번 손으로 찾지 않게 한다.

---

## 4. 새 검사 추가하기

`scripts/check_docs.py`:

1. `def check_xxx() -> None:` 함수를 만들고, 판정마다 `add("FAIL"|"WARN"|"PASS", "<ID>", "<메시지>")`.
2. `CHECKS` 리스트에 함수 추가.
3. `CHECK_DESC` 에 `"<ID>": "설명 (FAIL|WARN)"` 추가.
4. 이 문서 §2 표에 행 추가.

**원칙:** FAIL 은 확신할 수 있는 규칙만(오탐이 잦으면 사람들이 게이트를 무시한다). 애매하면 WARN.
검사 자신을 문서화·구현하는 파일(`check_docs.py`, 이 문서, ADR-0019/0023)은 `DRIFT_SELF` 로 DRIFT 검사에서 제외돼 있다.

---

## 5. 왜 이게 필요한가

문서가 커지면서 생긴 실제 사고들:
- ADR 을 새로 썼는데 `DESIGN §2`·`adr/README` 목록에 안 넣어 에이전트가 결정 존재를 놓침 → **XREF-1/2**
- 문서를 폴더로 옮긴 뒤 상대 링크 250여 개가 깨짐 → **STRUCT-1**
- `ARCHITECTURE.md §버전 관리` 가 실제로 안 쓰는 `develop` Git Flow 를 계속 담고 있어 규칙이 갈림 → **DRIFT-4**
- `.env.example` 에 실제 Slack Webhook URL + `= ` 공백이 들어가 알림이 조용히 죽음 → **DRIFT-3**
- 새 폴더 README 에 문서를 빠뜨리면 에이전트가 그 문서를 못 봄 → **STRUCT-3**

이 검사는 그런 드리프트를 **커밋 전에** 잡는다.

---

**작성:** 2026-09-04
