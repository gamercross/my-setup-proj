# ADR-0028: 단일 클라이언트 캐시 — 뷰는 스토어에서 파생만

- 상태: **제안** (2026-09-07, PO-7 반영 개정 2026-09-08) — P1 / 개인 OS P5. 사용자 결정: PO-7 = **할 일 위젯 내 리스트/보드 토글**.
- 관련: [PERSONAL_OS.md](../../vision/PERSONAL_OS.md) T1, [ADR-0005](ADR-0005-state-zustand.md)(zustand), [ADR-0011](ADR-0011-agent-backend-db-access.md), FR-TASK-02/03, FR-UI-01, [DASHBOARD_OS.md](../../vision/DASHBOARD_OS.md) DO-2

## 맥락
"한 곳에서 완료를 누르면 모든 곳에서 완료" 를 만들려면, 같은 할 일이 여러 뷰
(할 일 위젯 · 칸반 · 오늘 브리핑 · 프로젝트 하위 목록 · OKR 주간 플래너)에 나타나도
상태가 하나여야 한다.

지금은 `useTaskStore`(zustand)가 할 일 배열 하나를 들고, `TasksWidgetView` 하나만 구독한다.
`DO-2`(타입당 위젯 1개) 덕분에 아직 충돌이 없지만, 칸반·OKR 이 들어오면 깨진다.

## 결정

1. **`useTaskStore` 는 `byId` 맵을 정본으로 둔다.** `{ byId: Record<id, Task>, order: id[] }`.
   목록은 `order.map(id => byId[id])` 파생 셀렉터.
2. **모든 할 일 표시 컴포넌트는 이 스토어에서 파생(select)만 한다.** 자기 fetch 금지.
   칸반은 `byId` 를 우선순위로 그룹핑, 브리핑 위젯이 할 일을 보여주면 같은 `byId` 참조.
3. **쓰기(완료 토글·수정·삭제)는 스토어 액션 하나를 거친다.** 낙관적 갱신 + 롤백은
   기존 `useTaskStore` 패턴 재사용. 성공 시 `byId[id]` 갱신 → 구독 중인 모든 뷰 자동 리렌더.
4. **PO-7 (2026-09-08 사용자 결정) — 칸반은 `tasks` 위젯 안의 뷰 전환이다.** 별도 위젯 타입을
   만들지 않는다. `TasksWidgetView` 가 `config.view: 'list' | 'board'` 를 받아 같은 위젯 안에서
   세그먼티드 컨트롤로 전환한다(P2 캔버스 v2 "할 일 — 리스트 + 칸반" 아트보드 참조).
   - 위젯 개수가 안 늘고 `DO-2`("타입당 위젯 1개") 가 그대로 유지된다 — 별 타입을 추가하면
     DO-2 각주가 필요했지만 이제 불필요.
   - 리스트/보드는 `useTaskStore` 의 같은 `byId` 를 소비한다. 보드는 `byId` 를 우선순위로 그룹핑.
   - 크기·상호작용 차이는 위젯을 리사이즈해 흡수한다(보드 모드는 최소 폭을 넉넉히 — `widgetMeta`
     의 `minSize` 를 보드에 맞춰 상향). `config.view` 는 `WidgetSettings` 표시 탭 또는 위젯 내
     토글로 바꾼다.
   - 기각한 대안: 칸반을 별도 `taskboard` 위젯 타입으로 → 같은 데이터의 두 표현이 두 위젯으로
     쪼개지고 DO-2 예외가 필요. 사용자가 "위젯 개수 안 늘리는 쪽"을 택함.

## 결과 / 트레이드오프
- `useTaskStore` 내부 구조 변경(배열 → `byId`+`order`). 공개 셀렉터는 유지해 기존 뷰 무수정 목표.
- `useProjectStore` 도 같은 패턴으로 맞추면 프로젝트-할 일 교차 뷰가 쉬워진다(선택).
- 서버가 정본이라는 원칙(ADR-0011)은 불변 — 이건 **클라이언트 캐시** 규약일 뿐.
- 데모(`demoClient.js`)는 이미 인메모리 맵이라 자연스럽게 맞는다.

## 채택 시 영향
`frontend/src/store/useTaskStore.js`(배열 → `byId`+`order`, 공개 셀렉터 유지),
`widgets/views/TasksWidgetView.jsx`(셀렉터로 파생 + `config.view` 리스트/보드 전환 + 보드 그룹핑),
`widgets/widgetMeta.js`(`tasks` 메타에 `view` configSchema + 보드용 `minSize` 상향),
`frontend/src/components/`(칸반 열/카드 프레젠테이션 컴포넌트 — `TaskList` 선례),
`frontend/src/api/demoClient.js`/`demoData.js`(할 일 목 데이터에 우선순위·태그),
`requirements/WIDGET.md`(FR-TASK-* 리스트/보드), `UI_SPEC.md` §4(`TasksWidgetView` config),
`TEST_PLAN.md`(리스트↔보드 전환·같은 데이터 동기). `DASHBOARD_OS.md` DO-2 는 **무변경**(위젯 개수 불변).

> 선행: P5 는 P4.5(사이드바 셸) 위에서 진행. `tasks` 위젯은 `overview` 와 `tasks` 주제 양쪽에
> 올라갈 수 있고([ADR-0032](ADR-0032-sidebar-shell-per-topic-layouts.md) DO-2 주제 스코프), 각각 독립적으로 리스트/보드 뷰를 가진다.
