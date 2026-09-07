#!/usr/bin/env node
// 데모/프로토타입용 샘플 데이터 시드 (FR-DEMO 보조)
//
// 대시보드를 "보여줄 수 있는" 상태로 만들기 위해 6개 테이블에 현실적인 한국어
// 샘플을 넣는다. 로컬 개발·스크린샷·웹 데모 빌드의 기준 데이터.
//
//   node scripts/seed-demo.js                 # backend/data/app.db (기본)
//   DATABASE_PATH=/tmp/demo.db node scripts/seed-demo.js
//   node scripts/seed-demo.js --reset         # 넣기 전에 6개 테이블 비우기
//
// 안전장치: 대상 테이블에 이미 행이 있으면(--reset 없이) 건너뛴다.
// 에이전트 소유 테이블(calendar_events·emails·briefs)도 데모 목적상 여기서 직접 쓴다 —
// 실제 동기화가 돌면 upsert 로 덮어써진다.

const { getDb } = require('../backend/db');

const RESET = process.argv.includes('--reset');
const db = getDb();

// 상대 날짜 헬퍼 (로컬 기준)
const now = new Date();
const iso = (d) => d.toISOString();
const dateOnly = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const at = (days, h, m) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, h, m);
const today = dateOnly(now);
const nowIso = iso(now);

const projects = [
  { name: 'AI 대시보드 프로토타입', progress: 70, status: 'active' },
  { name: '우송대 운영체제 과제', progress: 40, status: 'active' },
  { name: '포트폴리오 사이트 개편', progress: 100, status: 'done' },
  { name: '유튜브 채널 리브랜딩', progress: 15, status: 'on_hold' },
];

// project_id 는 시드 후 채워진 실제 id 로 매핑한다 (아래 참조).
const tasks = [
  { title: '위젯 셸 레이아웃 저장 버그 재현', priority: 'high', status: 'in_progress', due: 0, proj: 0 },
  { title: 'Notion 저장 실패 시 재시도 로그 확인', priority: 'medium', status: 'todo', due: 1, proj: 0 },
  { title: 'BriefCard 다크테마 대비 점검', priority: 'low', status: 'todo', due: 2, proj: 0 },
  { title: '프로세스 스케줄링 과제 3번 풀이', priority: 'high', status: 'todo', due: 1, proj: 1 },
  { title: '페이지 교체 알고리즘 정리 노트', priority: 'medium', status: 'done', due: -1, proj: 1 },
  { title: '릴스 썸네일 5개 시안', priority: 'medium', status: 'todo', due: 3, proj: 3 },
  { title: '치과 예약 잡기', priority: 'low', status: 'todo', due: 2, proj: null },
  { title: '주간 회고 작성', priority: 'medium', status: 'todo', due: 4, proj: null },
];

const events = [
  ['오전 팀 스탠드업', at(0, 9, 30), at(0, 10, 0), '회의실 A'],
  ['설계 리뷰', at(0, 14, 0), at(0, 15, 30), '온라인'],
  ['운영체제 강의', at(1, 10, 0), at(1, 12, 0), '공학관 401'],
  ['치과 예약', at(2, 11, 0), at(2, 12, 0), '시청역 치과'],
  ['친구 저녁 약속', at(4, 19, 0), at(4, 21, 0), '강남'],
  ['이사 준비 (일정 조율 중)', null, null, null],
];

const emails = [
  ['noreply@notion.so', '[Notion] 새 페이지가 공유되었습니다', '오늘의 Daily Brief 페이지가 생성되었습니다…', -0.1, 0],
  ['ta-os@wsu.ac.kr', '운영체제 과제 3 마감 안내', '이번 주 금요일 23:59 까지 제출입니다…', -0.3, 0],
  ['team@github.com', '[my-setup-proj] PR #26 merged', 'feature/d3-brief-ui-schedule 가 main 에 병합되었습니다…', -0.5, 0],
  ['newsletter@dev.to', 'This week in JavaScript', 'Node 26, Vite 7, 그리고…', -1, 0],
  ['billing@anthropic.com', 'Your API usage summary', '지난 7일 사용량 요약…', -2, 1],
];

const brief = [
  '오늘의 우선순위 TOP 3',
  '1. 위젯 셸 레이아웃 저장 버그를 먼저 재현해 원인을 좁히세요 (마감 오늘).',
  '2. 운영체제 과제 3번 풀이를 시작하세요 — 금요일 마감이라 여유가 많지 않습니다.',
  '3. 릴스 썸네일 시안은 짧게라도 오늘 손대두면 이후가 수월합니다.',
  '',
  '주의할 점',
  '- 치과 예약 전화는 업무 시간에만 가능하니 오전에 처리하세요.',
  '- PR 병합 직후이니 main CI 초록인지 한 번 더 확인하세요.',
].join('\n');

function count(table) {
  return db.prepare(`SELECT COUNT(*) c FROM ${table}`).get().c;
}

const seed = db.transaction(() => {
  if (RESET) {
    for (const t of ['tasks', 'projects', 'calendar_events', 'emails', 'briefs']) {
      db.prepare(`DELETE FROM ${t}`).run();
    }
    console.log('  (--reset) tasks·projects·calendar_events·emails·briefs 비움');
  }

  // projects
  const projIds = [];
  if (count('projects') === 0) {
    const insP = db.prepare(
      `INSERT INTO projects (name, progress, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const p of projects) {
      projIds.push(Number(insP.run(p.name, p.progress, p.status, nowIso, nowIso).lastInsertRowid));
    }
    console.log(`  projects  +${projIds.length}`);
  } else {
    console.log(`  projects  건너뜀 (이미 ${count('projects')}건)`);
  }

  // tasks (project_id 매핑: proj 인덱스 → 실제 id, projIds 가 없으면 NULL)
  if (count('tasks') === 0) {
    const insT = db.prepare(
      `INSERT INTO tasks (title, description, due_date, priority, status, project_id, created_at, updated_at)
       VALUES (?, '', ?, ?, ?, ?, ?, ?)`
    );
    let n = 0;
    for (const t of tasks) {
      const pid = t.proj != null && projIds[t.proj] != null ? projIds[t.proj] : null;
      insT.run(t.title, dateOnly(at(t.due, 0, 0)), t.priority, t.status, pid, nowIso, nowIso);
      n += 1;
    }
    console.log(`  tasks     +${n}`);
  } else {
    console.log(`  tasks     건너뜀 (이미 ${count('tasks')}건)`);
  }

  // calendar_events
  if (count('calendar_events') === 0) {
    const insE = db.prepare(
      `INSERT INTO calendar_events (event_id, title, start_time, end_time, location, synced_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    events.forEach(([title, start, end, loc], i) => {
      insE.run(`demo-${i + 1}@local`, title, start ? iso(start) : null, end ? iso(end) : null, loc, nowIso);
    });
    console.log(`  calendar_events +${events.length}`);
  } else {
    console.log(`  calendar_events 건너뜀 (이미 ${count('calendar_events')}건)`);
  }

  // emails
  if (count('emails') === 0) {
    const insM = db.prepare(
      `INSERT INTO emails (email_id, from_address, subject, snippet, received_at, is_read, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    emails.forEach(([from, subject, snippet, days, read], i) => {
      insM.run(`demo-mail-${i + 1}`, from, subject, snippet, iso(at(days, 8, 0)), read, nowIso);
    });
    console.log(`  emails    +${emails.length}`);
  } else {
    console.log(`  emails    건너뜀 (이미 ${count('emails')}건)`);
  }

  // briefs (오늘 1건)
  db.prepare(
    `INSERT INTO briefs (date, content, notion_url, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET content = excluded.content`
  ).run(today, brief, 'https://www.notion.so/demo-daily-brief', nowIso);
  console.log(`  briefs    오늘(${today}) 1건`);
});

seed();
console.log('✅ 데모 데이터 시드 완료');
