# ADR-0031: 안전 마크다운 렌더 — 서버 토큰화 + 클라이언트 React 매핑

- 상태: **제안** (2026-09-07) — P1. 사용자 결정: PO-11.
- 관련: [PERSONAL_OS.md](../../vision/PERSONAL_OS.md) T6, [ADR-0014](ADR-0014-dashboard-diagram-viewer.md)(다이어그램 뷰어), FR-UI-06(신규), NFR-SEC-04, Phase 개인 OS P9

## 맥락
사용자는 진행 상황 문서(`PROGRESS.md`·`PERSONAL_OS.md`·`작업로그.md`·`TRACEABILITY.md`·
`DEMO_FEEDBACK.md`)를 대시보드 위젯에서 보고 싶다. 지금은 다이어그램 뷰어(C4)가 `docs/**/*.md`
에서 mermaid 블록만 뽑아 렌더한다 — 본문 산문은 안 보여준다.

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
- `GET /api/docs` → 허용목록 + 각 문서 메타(name·title·mtime).
  `GET /api/docs/:name` → 토큰 배열. `:name` 은 허용목록(정확 일치)만 — 경로 순회 불가.
  허용목록: `progress`(PROGRESS.md) · `personal-os` · `worklog`(작업로그.md) · `traceability` · `demo-feedback`.
- 다이어그램 뷰어 인프라 재사용: `resolveDocsRoot`(`DOCS_PATH`→저장소→`resourcesPath`), 파일 크기 상한,
  docs 부재 시 200 빈 배열.

### 프론트 — `components/DocView.jsx`
- 토큰 배열을 순회하며 `heading→<h*>` · `list→<ul>/<ol>` · `table→<table>` · `code→<pre><code>` ·
  `paragraph→<p>` 로 매핑. 인라인은 작은 렌더러(`link→<a>` 는 Notion 링크처럼 **복사 버튼**,
  Electron 외부 내비 차단 — BriefCard 선례).
- `lang:'mermaid'` 코드 토큰은 기존 `DiagramPanel` 재사용.
- 파서·`dangerouslySetInnerHTML` **없음**.

### 위젯 — `progress` (진행 현황)
- 상단 문서 선택 바(다이어그램 뷰어와 동일 패턴) + 본문 스크롤.
- PO-11: **문서 전체**를 렌더하되 `heading` 기준 **섹션 접기**(기본: 첫 섹션 + "진행 상황 요약" /
  "개인 생산성 OS 방향" 펼침, 나머지 접힘). `PROGRESS.md` 가 ~530줄이라 필수.

### FR-UI-06 (신규)
- **AC-1** `GET /api/docs/:name`(허용목록) → 토큰 배열, 허용목록 밖은 404.
- **AC-2** 위젯이 문서를 제목·목록·표·코드·인용·mermaid 로 렌더, 파서 없음.
- **AC-3** 문서를 고치면 다음 요청에 반영(캐시 없음).
- **AC-4** 지원 안 하는 문법은 원문 텍스트로 안전하게 표시.

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
`frontend/src/components/DocView.jsx`·`widgets/views/ProgressWidgetView.jsx`·`widgets/{registry,widgetMeta}.js`,
`requirements/UI.md`(FR-UI-06)·`TRACEABILITY.md`·`API_REFERENCE.md`·`TEST_PLAN.md`.
