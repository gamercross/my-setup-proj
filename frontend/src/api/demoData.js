// 웹 데모(프로토타입) 전용 인메모리 샘플 데이터 (ADR-0026)
// - scripts/seed-demo.js 와 같은 성격의 데이터를 프런트 단독으로 들고 있는 버전.
// - 백엔드 응답 스키마(backend/src/db.js 의 *_COLS)와 키를 맞춘다.
// - createDataset() 은 매 호출 새 객체를 반환한다 → 새로고침하면 초기 상태로 돌아온다.

function iso(d) {
  return d.toISOString();
}
function dateOnly(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function createDataset() {
  const now = new Date();
  const at = (days, h, m) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, h, m);
  const nowIso = iso(now);
  const today = dateOnly(now);

  const projects = [
    { id: 1, name: 'AI 대시보드 프로토타입', progress: 70, status: 'active', notion_id: null, created_at: nowIso, updated_at: nowIso },
    { id: 2, name: '우송대 운영체제 과제', progress: 40, status: 'active', notion_id: null, created_at: nowIso, updated_at: nowIso },
    { id: 3, name: '포트폴리오 사이트 개편', progress: 100, status: 'done', notion_id: null, created_at: nowIso, updated_at: nowIso },
    { id: 4, name: '유튜브 채널 리브랜딩', progress: 15, status: 'on_hold', notion_id: null, created_at: nowIso, updated_at: nowIso },
  ];

  const t = (id, title, priority, status, dueDays, project_id) => ({
    id,
    title,
    description: '',
    due_date: dueDays == null ? null : dateOnly(at(dueDays, 0, 0)),
    priority,
    status,
    project_id,
    created_at: nowIso,
    updated_at: nowIso,
  });
  const tasks = [
    t(1, '위젯 셸 레이아웃 저장 버그 재현', 'high', 'in_progress', 0, 1),
    t(2, 'Notion 저장 실패 시 재시도 로그 확인', 'medium', 'todo', 1, 1),
    t(3, 'BriefCard 다크테마 대비 점검', 'low', 'todo', 2, 1),
    t(4, '프로세스 스케줄링 과제 3번 풀이', 'high', 'todo', 1, 2),
    t(5, '페이지 교체 알고리즘 정리 노트', 'medium', 'done', -1, 2),
    t(6, '릴스 썸네일 5개 시안', 'medium', 'todo', 3, 4),
    t(7, '치과 예약 잡기', 'low', 'todo', 2, null),
    t(8, '주간 회고 작성', 'medium', 'todo', 4, null),
  ];

  const ev = (id, title, start, end, location) => ({
    id,
    event_id: `demo-${id}@local`,
    title,
    start_time: start ? iso(start) : null,
    end_time: end ? iso(end) : null,
    location: location ?? null,
    synced_at: nowIso,
  });
  const calendar_events = [
    ev(1, '오전 팀 스탠드업', at(0, 9, 30), at(0, 10, 0), '회의실 A'),
    ev(2, '설계 리뷰', at(0, 14, 0), at(0, 15, 30), '온라인'),
    ev(3, '운영체제 강의', at(1, 10, 0), at(1, 12, 0), '공학관 401'),
    ev(4, '치과 예약', at(2, 11, 0), at(2, 12, 0), '시청역 치과'),
    ev(5, '친구 저녁 약속', at(4, 19, 0), at(4, 21, 0), '강남'),
    ev(6, '이사 준비 (일정 조율 중)', null, null, null),
  ];

  const briefContent = [
    '오늘의 우선순위 TOP 3',
    '1. 위젯 셸 레이아웃 저장 버그를 먼저 재현해 원인을 좁히세요 (마감 오늘).',
    '2. 운영체제 과제 3번 풀이를 시작하세요 — 금요일 마감이라 여유가 많지 않습니다.',
    '3. 릴스 썸네일 시안은 짧게라도 오늘 손대두면 이후가 수월합니다.',
    '',
    '주의할 점',
    '- 치과 예약 전화는 업무 시간에만 가능하니 오전에 처리하세요.',
    '- PR 병합 직후이니 main CI 초록인지 한 번 더 확인하세요.',
  ].join('\n');
  const brief = {
    id: 1,
    date: today,
    content: briefContent,
    notion_url: 'https://www.notion.so/demo-daily-brief',
    created_at: iso(at(0, 7, 30)),
  };

  return { projects, tasks, calendar_events, brief, _seq: 100 };
}
