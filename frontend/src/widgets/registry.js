// 위젯 레지스트리 (ADR-0020)
// - 셸/호스트/피커/저장소는 여기의 WIDGET_TYPES · getWidgetMeta 만 사용한다. 타입 문자열 하드코딩 금지.
// - 뷰 컴포넌트는 자기 스토어를 직접 구독하므로 레지스트리에 useData 같은 데이터 훅은 두지 않는다.
// - 메타(크기·configSchema)는 widgetMeta.js(순수 데이터)에 있고, 여기서 view 컴포넌트만 붙인다.
// - configSchema 는 위젯 표시 옵션 정의 (C6 — FR-WIDGET-06). displayConfig.resolveDisplay 가 해석한다.

import { WIDGET_META } from './widgetMeta.js';
import TasksWidgetView from './views/TasksWidgetView.jsx';
import ProjectsWidgetView from './views/ProjectsWidgetView.jsx';
import CalendarWidgetView from './views/CalendarWidgetView.jsx';
import DiagramsWidgetView from './views/DiagramsWidgetView.jsx';
import BriefWidgetView from './views/BriefWidgetView.jsx';

// 타입 → view 컴포넌트 매핑.
const VIEWS = {
  tasks: TasksWidgetView,
  projects: ProjectsWidgetView,
  calendar: CalendarWidgetView,
  diagrams: DiagramsWidgetView,
  brief: BriefWidgetView,
};

// 메타 + view 를 합쳐 최종 레지스트리를 만든다.
export const WIDGET_REGISTRY = Object.fromEntries(
  Object.entries(WIDGET_META).map(([type, meta]) => [type, { ...meta, view: VIEWS[type] }])
);

// 등록된 위젯 메타 배열 (피커·기본 레이아웃 순회용)
export const WIDGET_TYPES = Object.values(WIDGET_REGISTRY);

// 타입 문자열 → 메타. 미등록이면 null (저장된 레이아웃에 낯선 타입이 있을 수 있음 — FR-WIDGET-08).
export function getWidgetMeta(type) {
  return WIDGET_REGISTRY[type] ?? null;
}
