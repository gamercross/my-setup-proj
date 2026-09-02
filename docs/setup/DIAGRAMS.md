# 📊 다이어그램 (Mermaid)

> 이 저장소의 다이어그램은 **[Mermaid](https://mermaid.js.org/)** — "코드로 쓰고 그림으로 보는" 오픈소스(MIT) 다이어그램 도구 — 로 작성한다.
> 문서 안에 ```` ```mermaid ```` 코드블록으로 넣으면, 사람이 볼 때는 그림으로 렌더된다.

---

## 1. 왜 Mermaid 인가

| 요구 | Mermaid 가 충족하는 방식 |
|---|---|
| 에이전트/개발자는 **코드로** 다룬다 | 다이어그램이 텍스트(마크다운 코드블록). diff·리뷰·버전관리 가능 |
| 사람은 **그림으로** 본다 | GitHub·GitLab 이 ```` ```mermaid ```` 블록을 **자동 렌더** (설치 불필요) |
| 오프라인/발표용 이미지 | `@mermaid-js/mermaid-cli` 로 SVG·PNG·PDF 추출 (§3) |
| 라이선스 | Mermaid 코어 MIT, mermaid-cli MIT |

ASCII 아트 다이어그램은 새로 만들지 않는다. 기존 것은 점진적으로 Mermaid 로 교체한다.

---

## 2. 보는 방법 (설치 없이)

| 환경 | 방법 |
|---|---|
| **GitHub** | `.md` 파일을 열면 다이어그램이 자동으로 그려진다. 별도 작업 없음 |
| **Mermaid Live Editor** | <https://mermaid.live> 에 코드블록 내용을 붙여넣기 → 즉시 렌더, PNG/SVG 다운로드 |
| **VS Code** | 확장 "Markdown Preview Mermaid Support" (`bierner.markdown-mermaid`) 설치 후 마크다운 미리보기 |
| **JetBrains** | 내장 마크다운 미리보기가 Mermaid 지원 (플러그인 "Mermaid" 활성화) |

---

## 3. 오프라인 이미지로 내보내기 (선택)

발표 자료·오프라인 열람용으로 SVG/PNG 파일이 필요할 때.

### 도구: `@mermaid-js/mermaid-cli`

- 저장소: <https://github.com/mermaid-js/mermaid-cli> (MIT)
- 설치형이 아니라 `npx` 로 즉석 실행 가능 (Node 18+ 필요, 최초 실행 시 Chromium 다운로드)

### 한 번에 렌더: `scripts/render-diagrams.sh`

```bash
bash scripts/render-diagrams.sh
```

- `docs/**/*.md` 안의 모든 ```` ```mermaid ```` 블록을 찾아 `docs/diagrams/<문서이름>-N.svg` 로 저장한다.
- 내부적으로 `npx -y @mermaid-js/mermaid-cli` 를 호출한다. Node 가 없으면 안내만 하고 종료(치명적 아님).
- `docs/diagrams/` 는 `.gitignore` 대상 — 산출물은 커밋하지 않는다 (원천은 `.md` 코드블록).

### 개별 파일

```bash
npx -y @mermaid-js/mermaid-cli -i docs/product/DESIGN.md -o docs/diagrams/DESIGN.svg
# → DESIGN-1.svg, DESIGN-2.svg ... (블록마다 하나)

# .mmd 단일 파일
npx -y @mermaid-js/mermaid-cli -i flow.mmd -o flow.png -t dark -b transparent
```

---

## 4. 작성 규칙

- 다이어그램은 설명하려는 **문서 안에** 둔다 (별도 다이어그램 전용 문서를 만들지 않는다).
- 노드 라벨은 한국어 가능. `<br/>` 로 줄바꿈.
- 방향: 흐름은 `flowchart TB`(위→아래) 또는 `LR`(좌→우), 상호작용은 `sequenceDiagram`.
- 너무 커지면 나눈다. 한 다이어그램에 15노드 이하 권장.
- 색·테마 커스터마이즈는 하지 않는다 (뷰어 기본 테마에 맡긴다 — 라이트/다크 모두 대응).

---

## 5. 현재 이 저장소의 Mermaid 다이어그램

| 문서 | 다이어그램 |
|---|---|
| [DESIGN.md](../product/DESIGN.md) §3 | 목표 아키텍처 (flowchart) |
| [DESIGN.md](../product/DESIGN.md) §6 | 할일 생성 흐름 (sequence) |
| [DESIGN.md](../product/DESIGN.md) §7 | Daily Brief 생성 흐름 (sequence) |
| [AUTOMATION.md](AUTOMATION.md) §2 | `/feature` 에이전트 파이프라인 (flowchart) |
| [ORCHESTRATION.md](ORCHESTRATION.md) §2 | 오케스트레이션 상태 그래프 (stateDiagram) |
| [ARCHITECTURE.md](../product/ARCHITECTURE.md) | 시스템 구조 · 데이터 흐름 3종 · OAuth 인증 · Git Flow |
| [AS_IS.md](../product/AS_IS.md) §2.7 | 현재 모듈 의존 관계 (flowchart) |
| [ROADMAP.md](../product/ROADMAP.md) | 개발 일정 (gantt) · 강의↔프로젝트 동기화 (flowchart) |
| [COURSE_MAPPING.md](../progress/COURSE_MAPPING.md) | 강의 연결도 (flowchart) |
| [USE_SCENARIOS.md](../product/USE_SCENARIOS.md) | 아침 사용 여정 (journey) · 할일/동기화 흐름 |

---

**작성:** 2026-09-02
