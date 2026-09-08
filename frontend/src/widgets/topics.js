// 사이드바 주제(topic) 정의 (순수 데이터 — JSX·React 의존 없음, widgetMeta.js 선례)
// - 사이드바는 4그룹 11항목. 각 주제는 자기 위젯 레이아웃을 가진다 (ADR-0032).
// - 주제 id 문자열이 위젯 타입 문자열(tasks·brief…)과 겹칠 수 있으나 네임스페이스가 다르다
//   (여기 id 는 "화면", 위젯 타입은 "그리드에 올라가는 카드").
// - node --test(.mjs) 에서 JSX 없이 검증하기 위해 이 파일만 따로 둔다.

// 그룹 — 사이드바 네비 헤더 순서.
export const TOPIC_GROUPS = [
  { id: 'command', label: 'COMMAND' },
  { id: 'plan', label: 'PLAN' },
  { id: 'agent', label: 'AGENT' },
  { id: 'system', label: 'SYSTEM' },
];

// 주제 목록 (PO-13 순서). icon 은 TopicIcons.jsx 의 키.
export const TOPICS = [
  { id: 'overview', label: '개요', group: 'command', icon: 'overview', subtitle: '오늘 한눈에' },
  { id: 'tasks', label: '할 일', group: 'command', icon: 'tasks', subtitle: '우선순위와 마감' },
  { id: 'brief', label: '브리핑', group: 'command', icon: 'brief', subtitle: '오늘의 브리핑' },
  { id: 'projects', label: '프로젝트', group: 'command', icon: 'projects', subtitle: '진행 중인 일' },
  { id: 'calendar', label: '일정', group: 'command', icon: 'calendar', subtitle: '오늘 일정' },
  { id: 'okr', label: 'OKR', group: 'plan', icon: 'okr', subtitle: '목표와 핵심 결과' },
  { id: 'weekly', label: '주간 플래너', group: 'plan', icon: 'weekly', subtitle: '지난주·이번주·다음주' },
  { id: 'activity', label: '활동', group: 'agent', icon: 'activity', subtitle: '에이전트 실행 기록' },
  { id: 'progress', label: '진행 현황', group: 'agent', icon: 'progress', subtitle: '진행 현황과 파일' },
  { id: 'diagrams', label: '다이어그램', group: 'agent', icon: 'diagrams', subtitle: '아키텍처·로드맵' },
  { id: 'settings', label: '설정', group: 'system', icon: 'settings', subtitle: '환경 설정' },
];

// 마지막 선택 주제가 없을 때의 기본값.
export const DEFAULT_TOPIC_ID = 'overview';

// id → 주제. 없으면 null.
export function getTopic(id) {
  return TOPICS.find((t) => t.id === id) ?? null;
}

// 등록된 주제 id 인지.
export function isValidTopicId(id) {
  return typeof id === 'string' && TOPICS.some((t) => t.id === id);
}

// 그룹 id 에 속한 주제 배열 (사이드바 렌더 순회용).
export function getTopicsByGroup(groupId) {
  return TOPICS.filter((t) => t.group === groupId);
}
