# 🔀 커밋·푸시 절차 (에이전트용)

> `finisher` 가 GitHub 에 변경을 올릴 때 따르는 규칙. `developer`·`supervisor` 도 "커밋 가능 상태" 판단에 참고한다.
> 컨벤션 전반은 [CONVENTIONS.md](CONVENTIONS.md), 자동화 개요는 [AUTOMATION.md](AUTOMATION.md).

---

## 0. 지금 이 저장소의 상태 (2026-09)

| 항목 | 값 | 함의 |
|---|---|---|
| 원격 | `https://github.com/gamercross/my-setup-proj.git` (HTTPS) | 푸시에 자격증명 helper/PAT 필요. 실패 시 사용자에게 알림 |
| 기본 브랜치 | `main` | 아래 §2 브랜치 정책 |
| 개발 머신 | `node`/`npm` 미설치, `python3` 있음, `.env`·`node_modules`·`venv` 없음 | `verify.sh` 전체는 **통과 불가**. §1 참조 |
| CI | 모든 push/PR 에서 `npm install`+문법, `pip install`+`compileall` | 푸시 후 결과 확인 (§5) |

---

## 1. 검증 게이트 — `verify.sh` 를 어떻게 해석하는가

`verify.sh` 는 두 가지를 섞어서 본다. 에이전트는 이를 **분리해서** 판단한다.

| 부류 | 검사 | 실패의 의미 |
|---|---|---|
| **환경** | node/npm/python3 설치, `node_modules`/`venv`/`.env` 존재 | 이 **머신이 미프로비저닝**. 변경 자체의 문제가 아님 |
| **문법/테스트** | `node -c ...`, `python -m compileall`, (있으면) 단위·통합 테스트 | 변경한 **코드의 문제**. 반드시 막아야 함 |
| **SKIP** | 문법 검사 도구(node 등)가 아예 없음 | 확인 **못 함**. 통과도 실패도 아님 |

### 판정 규칙 (finisher)

1. 변경에 실행 코드(`.js`/`.jsx`/`.py`/`.sh`)가 **없다** (문서·`.md`·`.sql`·설정만):
   → `bash verify.sh --code-only` 실행. `FAIL 0` 이면 통과. SKIP 은 무시하되 보고에 남긴다.
2. 변경에 실행 코드가 **있다**:
   → `bash verify.sh --code-only` 실행.
   - 관련 문법 검사가 **PASS** → 통과.
   - 관련 문법 검사가 **FAIL** → **커밋 금지.** 실패 내용 보고 후 멈춘다.
   - 관련 문법 검사가 **SKIP** (도구 없음) 이고 supervisor 코드리뷰가 PASS →
     조건부 통과: 커밋 본문과 사용자 보고에 **"검증 일부 미실행: `<무엇>` (도구 없음)"** 을 반드시 명시한다.
     (선례: `docs/progress/PROGRESS.md` Week 2 — node 미설치로 검증 못 하고 리뷰만으로 커밋한 기록.)
3. **환경 검사 실패만으로는 커밋을 막지 않는다.** 단, 환경이 준비되면(Phase A2) 전체 `verify.sh` 를 다시 돌려 SKIP 을 없앤다.

> ⚠️ **절대 규칙:** 실행하지 않은 검사를 "통과했다" 고 보고하지 않는다. SKIP 은 SKIP 이라고 말한다.

---

## 2. 브랜치 정책

| 시기 | 정책 |
|---|---|
| **지금 (초기 셋업 · Week 1~2)** | `main` 직접 커밋 허용. 저장소 정리·문서·스캐폴드 단계라 브랜치 오버헤드가 크다. |
| **Week 3~ (기능 개발 시작)** | `main` 직접 커밋 **금지**. `feature/<짧은-이름>` 에서 작업 → 푸시 → (PR). `main` 은 통과된 것만. |

- 오케스트레이터(`/feature`)가 단계 시작 시 어느 브랜치인지 확인하고, Week 3 이후인데 `main` 위라면 **먼저 브랜치를 만든다**.
- 브랜치 전환·생성은 오케스트레이터 또는 finisher 가 하되, 사용자에게 브랜치명을 알린다.
- `git push --force` 금지. `main` 에 강제 푸시 절대 금지.

---

## 3. 무엇을 스테이징하는가

| 대상 | 규칙 |
|---|---|
| 이번 작업의 변경 파일 | 스테이징 |
| `my-setup-proj/` 폴더 **밖** 파일 | 건드리지 않는다 (`~/Library/LaunchAgents/` 등) |
| `작업로그.md` | finisher 가 **내용을 편집하지 않는다**. Stop 훅이 만든 변경이 이미 있으면 그대로 함께 커밋해도 되지만, 별도 편집 금지 |
| `.env`, `*.db`, `node_modules/`, `venv/`, `dist/` | `.gitignore` 로 제외됨. 실수로 `git add -f` 하지 않는다 |
| 무관한 기존 미커밋 변경 | 이번 작업과 논리적으로 다르면 **별도 커밋**으로 나눈다 (§4) |

커밋 전 `git status` 와 `git diff --staged` 로 스테이징 내용을 반드시 육안 확인한다.

---

## 4. 커밋 단위와 메시지

- **한 커밋 = 한 논리적 변경.** 저장소 구조 변경 + 새 기능 + 무관한 설정 수정이 섞여 있으면 나눈다.
- 형식: `<타입>: <내용>` — `feat`/`fix`/`docs`/`style`/`refactor`/`chore` ([CONVENTIONS.md](CONVENTIONS.md) §5)
- 본문: 무엇을·왜 2~4줄. 검증을 일부 못 했으면 그 사실을 본문에 적는다.
- 꼬리말(항상):
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  ```
  세션이 `Claude-Session:` 줄을 지정했으면 그 줄도 추가.
- `PROGRESS.md` 갱신: 해당 주차에 대응하는 체크박스가 있으면 갱신. 없으면(예: "문서 정비") 억지로 체크박스를 만들지 말고 그 주차 노트에 한 줄 남긴다.

---

## 5. 푸시와 사후 확인

1. `git push`（Week 3~ 는 `git push -u origin <feature-브랜치>`).
2. 푸시가 **인증 실패**하면: 커밋은 로컬에 남기고, 사용자에게
   "푸시 실패(자격증명). `gh auth login` 또는 PAT 설정 후 재시도 필요" 라고 보고하고 멈춘다.
3. 푸시 성공 시 **커밋 해시**와 브랜치를 보고한다.
4. CI(`.github/workflows/test.yml`)가 도는 변경(코드/의존성)이면, 결과를 확인하도록 안내한다
   (`gh run list --limit 1` 또는 Actions 탭). CI 실패 시 후속 수정 작업을 제안한다.
5. 슬랙 알림:
   ```
   bash scripts/slack-notify.sh "✅" "마무리하는 친구" "커밋 <해시>: <제목> — <브랜치> 푸시 완료"
   ```

---

## 6. 멈춰야 하는 경우 (커밋·푸시하지 않음)

- 관련 문법/테스트 검사가 **실제로 실행됐고 FAIL**.
- supervisor 판정이 `CHANGES_NEEDED` (2회 반복 후에도).
- 스테이징에 시크릿·`.env`·대용량 바이너리가 포함됨.
- 계획 범위를 벗어난 변경이 섞여 있고 분리가 불가능.
- 푸시 대상 브랜치가 정책과 안 맞음 (Week 3~ 인데 `main`).

이 경우 이유를 사용자에게 보고하고 슬랙에 알린 뒤 멈춘다.

---

## 7. 요약 체크리스트 (finisher)

```
[ ] git status / git diff --staged 로 스테이징 내용 확인
[ ] 실행 코드 포함 여부 판단 → verify.sh 또는 verify.sh --code-only
[ ] FAIL 0 확인 (SKIP 은 보고에 명시)
[ ] 브랜치 정책 확인 (지금은 main OK, Week 3~ 는 feature 브랜치)
[ ] my-setup-proj/ 밖 파일 미포함, .gitignore 대상 미포함
[ ] 커밋 메시지 형식 + 꼬리말 + (필요 시) "검증 일부 미실행" 명시
[ ] PROGRESS.md 갱신 (대응 항목 있을 때)
[ ] git push → 실패 시 로컬 보존 + 보고
[ ] 커밋 해시·브랜치 보고 + CI 확인 안내 + 슬랙 알림
```

---

**작성:** 2026-09-02
