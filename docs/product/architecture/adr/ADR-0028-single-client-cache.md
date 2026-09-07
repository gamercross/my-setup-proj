# ADR-0028: 단일 클라이언트 캐시 — 뷰는 스토어에서 파생만

- 상태: **제안** (2026-09-07) — P1. 사용자 결정: PO-7.
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
4. **PO-7 — 칸반은 할 일 위젯을 대체하지 않고 별도 뷰(위젯)다.** `DO-2` 는 유지하되
   "할 일" 과 "칸반" 을 **다른 타입**으로 등록(`tasks`, `taskboard`). 둘 다 같은 `useTaskStore`
   구독. 사용자가 피커에서 원하는 쪽을 올린다(둘 다 올려도 됨 — 같은 데이터의 두 표현).
   - 대안: 칸반을 `tasks` 위젯의 표시 옵션(리스트/보드 토글)으로 → **기각:** 위젯 크기·상호작용이
     크게 달라 config 로 감당 안 됨. 별 타입이 깔끔.

## 결과 / 트레이드오프
- `useTaskStore` 내부 구조 변경(배열 → `byId`+`order`). 공개 셀렉터는 유지해 기존 뷰 무수정 목표.
- `useProjectStore` 도 같은 패턴으로 맞추면 프로젝트-할 일 교차 뷰가 쉬워진다(선택).
- 서버가 정본이라는 원칙(ADR-0011)은 불변 — 이건 **클라이언트 캐시** 규약일 뿐.
- 데모(`demoClient.js`)는 이미 인메모리 맵이라 자연스럽게 맞는다.

## 채택 시 영향
`frontend/src/store/useTaskStore.js`(구조), `widgets/registry.js`·`widgetMeta.js`(`taskboard` 타입 추가),
`widgets/views/TaskboardWidgetView.jsx`(신규), `widgets/views/TasksWidgetView.jsx`(셀렉터로 정리),
`WIDGET.md`, `UI_SPEC.md`, `DASHBOARD_OS.md` DO-2 각주.
