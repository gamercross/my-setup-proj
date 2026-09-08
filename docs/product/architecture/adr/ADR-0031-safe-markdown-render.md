# ADR-0031: 안전 마크다운 렌더 + 파일 트리 API

- 상태: **채택** (2026-09-08, 개정) — 개인 OS P9 에서 구현. 사용자 결정: PO-11 = 섹션 접기 큐레이션(초안대로),
  PO-12 = **허용 루트를 `docs/` + 저장소 루트 `*.md` 로 축소, 소스 파일(`.js`/`.py`/`.sh`)은 트리에
  노출하지 않고 내용도 열지 않음** (`.md` 만 렌더). 위젯 레이아웃은 **좌·우 패널 크기 사용자 조절 +
  패널 접기/펼치기**, 상단 브레드크럼은 파일 경로 표시용. 토큰 문법 범위는 초안 그대로.
- 관련: [PERSONAL_OS.md](../../vision/PERSONAL_OS.md) T6, [ADR-0014](ADR-0014-dashboard-diagram-viewer.md)(다이어그램 뷰어), [ADR-0013](ADR-0013-dashboard-agent-queue.md)(파일 조작 없음), FR-UI-06(신규), NFR-SEC-04, Phase 개인 OS P9

## 맥락
사용자는 저장소를 IDE 로 열지 않고 대시보드 위젯에서 ① 프로젝트 파일 구조를 왼쪽 폴더 트리로 훑고
② 파일(진행 문서·ADR·소스)을 클릭해 내용을 보고 싶다. 지금은 다이어그램 뷰어(C4)가 `docs/**/*.md`
에서 mermaid 블록만 뽑아 렌더한다 — 본문 산문도, 파일 트리도 안 보여준다.

제약: `BriefCard` 주석·TEST_PLAN 에 명시된 규범 — **렌더러에서 마크다운 파서·
`dangerouslySetInnerHTML` 를 쓰지 않는다**(Electron RCE 표면 최소화, NFR-SEC-04 정신).
백엔드에도 마크다운 의존성이 없다(express·better-sqlite3·supabase-js 뿐).

## 결정

**서버에서 제한된 토큰 배열로 파싱 → 클라이언트가 React 요소로 매핑.** HTML 문자열이
생성되지 않으므로 주입 표면이 없다.

### 백엔드 — `services/docs.js` (`services/diagrams.js` 스타일, 의존성 0)
- 우리 문서가 실제로 쓰는 부분집합만 토큰화:
  `heading`(h1~h4) · `paragraph` · `list`(ul/ol, 중첩 1단) · `table` · `code`(펜스, lang 포함) ·
  `blockquote` · `hr` · 인라인 `link`·`code`·`strong`·`em`.
  mermaid 펜스는 `code` 토큰이되 `lang: 'mermaid'` 로 표시 → 프론트가 `DiagramPanel` 로 위임.
- 지원 안 하는 문법(이미지·HTML 블록·각주 등)은 **원문 텍스트 그대로** 담아 안전하게 넘긴다.
- `GET /api/docs/:path` → 토큰 배열. **`.md` 만 허용** — 소스 파일(`.js`/`.py`/`.sh` 등)은
  받지 않고 404/400. (2026-09-08 PO-12: 소스 렌더 제외 — 보안 표면·범위 축소.) `:path` 는
  **허용 루트 안의 정규화된 상대경로**만 받고, `..`·절대경로·심링크 탈출은 거부한다.
- **`GET /api/tree`** → 허용 루트를 재귀 나열한 트리 JSON(`{name, path, type: 'dir'|'file', children?}`).
  - 허용 루트 (2026-09-08 PO-12 축소): **`docs/` + 저장소 루트의 `*.md` 만.** 소스 디렉터리
    (`frontend/src/` · `backend/src/` · `agent/` · `scripts/`)는 제외 — 진행 문서 전용 뷰.
  - 트리에는 `.md` 파일만 노출한다(비-`.md` 는 나열 안 함).
  - 제외: `.env*` · `node_modules` · `.git` · `venv`/`.venv` · `.secrets` · `dist` · `*.log` · `__pycache__` · 숨김 디렉터리.
  - 상한: 깊이 8 · 항목 2000 · `services/diagrams.js` 의 파일 크기/개수 로직 재사용.
- 다이어그램 뷰어 인프라 재사용: `resolveDocsRoot` 를 일반화한 `resolveRepoRoot`
  (`REPO_PATH`→저장소→`resourcesPath`), 파일 크기 상한, 루트 부재 시 200 빈 트리.
- **읽기 전용.** 파일 생성·수정·삭제 없음 (ADR-0013 "파일 조작 없음" 유지).

### 프론트 — `components/DocView.jsx`
- 토큰 배열을 순회하며 `heading→<h*>` · `list→<ul>/<ol>` · `table→<table>` · `code→<pre><code>` ·
  `paragraph→<p>` 로 매핑. 인라인은 작은 렌더러(`link→<a>` 는 Notion 링크처럼 **복사 버튼**,
  Electron 외부 내비 차단 — BriefCard 선례).
- `lang:'mermaid'` 코드 토큰은 기존 `DiagramPanel` 재사용.
- 파서·`dangerouslySetInnerHTML` **없음**.

### 위젯 — `progress` (진행 현황 · 파일 탐색)
- 위젯 내부 레이아웃 (2026-09-08 PO-12): **왼쪽 폴더 트리 + 오른쪽 내용 패널**, 둘 사이 분할선을
  드래그해 **크기를 사용자가 조절**한다(기본 ~30/70). 각 패널은 **접기/펼치기** 가능 —
  트리를 접으면 내용이 전체 폭, 반대도 가능. 셸의 별도 좌측 레일이 아니라 위젯 한 칸 안에서
  (DO-1 단일 그리드 유지). 상단에 **브레드크럼**(현재 파일 경로)을 둔다.
- 트리: 폴더 접기/펼치기, `.md` 파일 클릭 → 오른쪽에 `GET /api/docs/:path` 결과 렌더.
- 내용 패널: `heading` 기준 **섹션 접기**(기본: 첫 섹션 + "진행 상황 요약" / "개인 생산성 OS 방향"
  펼침). `PROGRESS.md` 가 ~530줄이라 필수.

### FR-UI-06 (신규)
- **AC-1** `GET /api/tree` → `docs/` + 루트 `*.md` 의 `.md` 파일 트리 JSON. 제외 목록·상한 적용. 루트 부재 시 200 빈 트리.
- **AC-2** `GET /api/docs/:path`(허용 루트 안 `.md`) → 토큰 배열. `..`·절대경로·허용 밖·비-`.md` 는 404/400.
- **AC-3** 위젯이 왼쪽 트리 + 오른쪽 내용(제목·목록·표·코드·인용·mermaid)을 렌더, 파서 없음.
- **AC-4** 파일을 고치면 다음 요청에 반영(캐시 없음).
- **AC-5** 지원 안 하는 문법은 원문 텍스트로 안전하게 표시. 파일 조작(쓰기·삭제) 없음.
- **AC-6** 위젯의 좌/우 패널 분할 비율을 드래그로 바꿀 수 있고, 각 패널을 접었다 펼 수 있다.

## 대안
- **클라이언트 `marked` + `DOMPurify`:** 빠르지만 의존성 2개 + CSP 조정 + 규범 예외.
  → 기각. 우리 문서 문법이 좁아 직접 토크나이저가 감당 가능.
- **백엔드에서 md→HTML→sanitize:** 여전히 HTML 문자열을 렌더러에 주입 → 규범 위반.

## 결과 / 트레이드오프
- 토크나이저를 직접 유지(테스트로 고정 — TC-DOCS-*). 문서가 새 문법을 쓰기 시작하면 확장 필요.
- `services/diagrams.js` 와 파싱 로직이 겹침 → mermaid 추출을 `docs.js` 로 통합하고 diagrams 는
  그 위에 얹는 리팩터 고려(선택).

## 채택 시 영향
`backend/src/services/docs.js`·`routes/docs.js`·`routes/api.js`·`test/docs.test.js`(신규),
`backend/src/services/tree.js`·`routes/tree.js`(신규),
`frontend/src/components/{DocView,FileTree}.jsx`·`widgets/views/ProgressWidgetView.jsx`·`widgets/{registry,widgetMeta}.js`, `frontend/src/api/demoClient.js`(목 트리),
`requirements/UI.md`(FR-UI-06)·`TRACEABILITY.md`·`API_REFERENCE.md`·`TEST_PLAN.md`.
