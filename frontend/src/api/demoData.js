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

  // 지난 ISO 주(월~일)의 수요일 — 오늘 요일과 무관하게 항상 지난주에 들어간다.
  const isoOffset = (now.getDay() + 6) % 7; // 월=0 … 일=6
  const lastWeekWed = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - isoOffset - 7 + 2
  );
  const lastWeekThu = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - isoOffset - 7 + 3
  );

  const t = (id, title, priority, status, dueDays, project_id, tags = []) => ({
    id,
    title,
    description: '',
    due_date: dueDays == null ? null : dateOnly(at(dueDays, 0, 0)),
    priority,
    status,
    project_id,
    tags,
    created_at: nowIso,
    updated_at: nowIso,
  });
  // 우선순위 분포는 보드 뷰(FR-TASK-09)에서 3열이 모두 차도록 잡는다: high 3 / medium 3 / low 2.
  // 태그(FR-TASK-08): 8건 중 5건에 태그, 3건은 [] (자동 분류 대상 시연용).
  const tasks = [
    t(1, '위젯 셸 레이아웃 저장 버그 재현', 'high', 'in_progress', 0, 1, ['개발', '버그']),
    t(2, 'Notion 저장 실패 시 재시도 로그 확인', 'medium', 'todo', 1, 1, ['개발']),
    t(3, 'BriefCard 다크테마 대비 점검', 'low', 'todo', 2, 1, []),
    t(4, '프로세스 스케줄링 과제 3번 풀이', 'high', 'todo', 1, 2, ['공부']),
    t(5, '페이지 교체 알고리즘 정리 노트', 'medium', 'done', -1, 2, ['공부']),
    t(6, '릴스 썸네일 5개 시안', 'medium', 'todo', 3, 4, []),
    t(7, '치과 예약 잡기', 'low', 'todo', 2, null, ['건강']),
    t(8, '주간 회고 작성', 'high', 'todo', 4, null, []),
  ];
  // 주간 플래너(FR-OKR-05) 시연용 — 지난주 마감 2건 (1건 완료).
  tasks.push(
    {
      id: 9,
      title: '지난주 스프린트 데모 준비',
      description: '',
      due_date: dateOnly(lastWeekWed),
      priority: 'medium',
      status: 'done',
      project_id: 1,
      tags: [],
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: 10,
      title: '지난주 코드리뷰 피드백 반영',
      description: '',
      due_date: dateOnly(lastWeekThu),
      priority: 'medium',
      status: 'todo',
      project_id: 1,
      tags: [],
      created_at: nowIso,
      updated_at: nowIso,
    }
  );

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

  // 다이어그램 — 데모에서 빈 화면을 피하기 위한 mermaid 샘플 1건 (ADR-0026).
  const diagrams = [
    {
      doc: 'ARCHITECTURE.md',
      path: 'docs/product/architecture/ARCHITECTURE.md',
      index: 0,
      title: '앱 셸 구조',
      code: [
        'flowchart TD',
        '  App[App.jsx] --> Shell[AppShell]',
        '  Shell --> Sidebar',
        '  Shell --> TopicView',
        '  TopicView --> WidgetShell',
        '  WidgetShell --> Grid[위젯 그리드]',
      ].join('\n'),
    },
  ];

  // 동기화 이력 — 에이전트 활동 위젯(P7, FR-AGENT-08) 시연용. 성공·실패 혼합.
  const sl = (id, service, status, minsAgo, error_message = null) => ({
    id,
    service,
    status,
    last_sync: iso(new Date(now.getTime() - minsAgo * 60 * 1000)),
    error_message,
  });
  const sync_logs = [
    sl(1, 'gmail', 'success', 1400),
    sl(2, 'calendar', 'success', 1398),
    sl(3, 'notion', 'failed', 1396, '401 Unauthorized'),
    sl(4, 'classify', 'success', 1395),
    sl(5, 'gmail', 'success', 90),
    sl(6, 'calendar', 'success', 88),
    sl(7, 'classify', 'success', 86),
  ];

  // OKR(FR-OKR-01~04) 시연용 — 목표 2 / 핵심 결과 4 (평균 84% 근처).
  const objectives = [
    { id: 1, title: '3분기 건강 회복', period: '2026-Q3', status: 'active', created_at: nowIso, updated_at: nowIso },
    { id: 2, title: '사이드 프로젝트 출시', period: '2026', status: 'active', created_at: nowIso, updated_at: nowIso },
  ];
  const key_results = [
    { id: 1, objective_id: 1, title: '주 3회 운동', target: 36, current: 30, unit: '회', project_id: null, created_at: nowIso, updated_at: nowIso },
    { id: 2, objective_id: 1, title: '평균 수면 7시간', target: 7, current: 6.5, unit: '시간', project_id: null, created_at: nowIso, updated_at: nowIso },
    { id: 3, objective_id: 2, title: 'MVP 기능 완성', target: 10, current: 9, unit: null, project_id: 1, created_at: nowIso, updated_at: nowIso },
    { id: 4, objective_id: 2, title: '베타 테스터 모집', target: 20, current: 15, unit: '명', project_id: null, created_at: nowIso, updated_at: nowIso },
  ];
  // 최근 4개월치 KR 평균 달성률 스냅샷 (오름차순).
  const ym = (back) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - back, 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
  };
  const kr_snapshots = [
    { id: 1, key_result_id: 1, month: ym(3), pct: 0.55 },
    { id: 2, key_result_id: 1, month: ym(2), pct: 0.68 },
    { id: 3, key_result_id: 1, month: ym(1), pct: 0.8 },
    { id: 4, key_result_id: 3, month: ym(3), pct: 0.5 },
    { id: 5, key_result_id: 3, month: ym(2), pct: 0.7 },
    { id: 6, key_result_id: 3, month: ym(1), pct: 0.85 },
  ];

  return {
    projects,
    tasks,
    calendar_events,
    brief,
    diagrams,
    sync_logs,
    objectives,
    key_results,
    kr_snapshots,
    _runNowPending: false,
    _seq: 100,
  };
}
