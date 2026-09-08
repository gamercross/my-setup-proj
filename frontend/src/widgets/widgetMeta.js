// 위젯 메타데이터 (순수 데이터 — JSX·React 의존 없음)
// - registry.js 가 여기에 view 컴포넌트를 붙여 WIDGET_REGISTRY 를 완성한다.
// - 이 파일만 따로 두는 이유: node --test 환경(.mjs)에서 JSX 없이 메타를 검증하기 위함.
// - configSchema enum 값 도메인은 DATA_DICTIONARY 의 status 와 일치시킨다.

// 그리드 단위(w=열, h=행). rowHeight 40 + margin 12 기준.
export const WIDGET_META = {
  tasks: {
    type: 'tasks',
    name: '할 일',
    icon: '✅',
    description: '할 일 목록 조회·추가·완료 토글',
    defaultSize: { w: 4, h: 6 },
    // minSize.w 는 overview 기본 레이아웃의 tasks w(=4)를 넘지 않는다 (registry.test / TC-SHELL-08).
    minSize: { w: 4, h: 4 },
    maxSize: { w: 12, h: 20 },
    configSchema: {
      // view: 리스트 / 보드(우선순위 칸반). 저장은 config.display.view (ADR-0028 §결정4 각주).
      view: { type: 'enum', options: ['list', 'board'], default: 'list', label: '보기 방식' },
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
    configSchema: {},
  },
  brief: {
    type: 'brief',
    name: '오늘 브리핑',
    icon: '🤖',
    description: '에이전트가 만든 오늘의 우선순위',
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 12, h: 20 },
    configSchema: {
      showMeta: { type: 'bool', default: true, label: '생성 시각·Notion 링크 표시' },
    },
  },
  // "준비 중" 자리표시자 — 전용 위젯이 아직 없는 주제의 기본 인스턴스 (ADR-0032).
  // hidden: true 는 옵셔널 신규 필드. 피커 목록에서 제외한다 (다른 메타엔 넣지 않는다).
  placeholder: {
    type: 'placeholder',
    name: '준비 중',
    description: '이 주제는 아직 준비 중입니다',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 12, h: 12 },
    configSchema: {},
    hidden: true,
  },
};
