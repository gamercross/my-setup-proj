// 위젯 레지스트리 (ADR-0020)
// - 셸/호스트/피커/저장소는 여기의 WIDGET_TYPES · getWidgetMeta 만 사용한다. 타입 문자열 하드코딩 금지.
// - 뷰 컴포넌트는 자기 스토어를 직접 구독하므로 레지스트리에 useData 같은 데이터 훅은 두지 않는다.
// - configSchema 는 위젯 표시 옵션 정의 (C6 — FR-WIDGET-06). displayConfig.resolveDisplay 가 해석한다.
//   enum 값 도메인은 DATA_DICTIONARY 의 status 와 일치시킨다.

import TasksWidgetView from './views/TasksWidgetView.jsx';
import ProjectsWidgetView from './views/ProjectsWidgetView.jsx';
import CalendarWidgetView from './views/CalendarWidgetView.jsx';
import DiagramsWidgetView from './views/DiagramsWidgetView.jsx';

// 그리드 단위(w=열, h=행). rowHeight 40 + margin 12 기준.
export const WIDGET_REGISTRY = {
  tasks: {
    type: 'tasks',
    name: '할 일',
    icon: '✅',
    description: '할 일 목록 조회·추가·완료 토글',
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 12, h: 20 },
    view: TasksWidgetView,
    configSchema: {
      sortBy: { type: 'enum', options: ['due', 'priority', 'created'], default: 'created', label: '정렬 기준' },
      hideCompleted: { type: 'bool', default: false, label: '완료한 항목 숨기기' },
      maxItems: { type: 'number', min: 5, max: 100, step: 5, default: 50, label: '최대 표시 개수' },
    },
  },
  projects: {
    type: 'projects',
    name: '프로젝트',
    icon: '📁',
    description: '프로젝트 카드·진행률·상태',
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 12, h: 20 },
    view: ProjectsWidgetView,
    configSchema: {
      statusFilter: { type: 'enum', options: ['all', 'active', 'done', 'on_hold'], default: 'all', label: '상태 필터' },
      hideDone: { type: 'bool', default: false, label: '완료 프로젝트 숨기기' },
    },
  },
  calendar: {
    type: 'calendar',
    name: '일정',
    icon: '📅',
    description: '이번 주 일정(읽기 전용)',
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 12, h: 20 },
    view: CalendarWidgetView,
    configSchema: {
      range: { type: 'enum', options: ['today', 'week'], default: 'week', label: '표시 범위' },
    },
  },
  diagrams: {
    type: 'diagrams',
    name: '다이어그램',
    icon: '📊',
    description: 'docs 의 mermaid 다이어그램 뷰어',
    defaultSize: { w: 8, h: 8 },
    minSize: { w: 4, h: 4 },
    maxSize: { w: 12, h: 24 },
    view: DiagramsWidgetView,
    configSchema: {},
  },
};

// 등록된 위젯 메타 배열 (피커·기본 레이아웃 순회용)
export const WIDGET_TYPES = Object.values(WIDGET_REGISTRY);

// 타입 문자열 → 메타. 미등록이면 null (저장된 레이아웃에 낯선 타입이 있을 수 있음 — FR-WIDGET-08).
export function getWidgetMeta(type) {
  return WIDGET_REGISTRY[type] ?? null;
}
