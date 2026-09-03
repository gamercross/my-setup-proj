# ADR-0021: 위젯 레이아웃·설정 영속화

- 상태: 제안 (2026-09-03)
- 관련: FR-WIDGET-04·05·06, [ADR-0020](ADR-0020-widget-shell-architecture.md), [ADR-0015](ADR-0015-local-first-architecture.md), [ADR-0018](ADR-0018-schema-migration-strategy.md), [DATA_ARCHITECTURE.md](../DATA_ARCHITECTURE.md)

## 맥락
사용자가 만든 위젯 배치(위치·크기·z·최소화)와 위젯별 `config`(테마·표시 옵션)를 앱 재시작 후에도 복원해야 한다. 어디에 저장할지 정한다. 이건 **UI 상태**지 도메인 데이터가 아니다.

## 결정 (제안)
**단계적 영속화. 1차는 `localStorage`, 이후 SQLite, 최종 사용자별.**

| 단계 | 저장소 | 키/스키마 | 시점 |
|---|---|---|---|
| 1 (지금) | 브라우저 `localStorage` | `dashboard.layout.v1` = `{ version, instances:[{ id, type, x,y,w,h, z, minimized, config }] }` | 위젯 셸 최초 구현(Phase C5) |
| 2 | SQLite `widget_instances` 테이블 (백엔드 `/api/widgets` CRUD) | 아래 DDL | 재설치·다기기 요구 생길 때 |
| 3 | Supabase, `user_id` 스코프 (RLS) | 단계 2 + `user_id` | [ARCHITECTURE_EVOLUTION.md](../ARCHITECTURE_EVOLUTION.md) Stage 2 |

- **저장 트리거:** 레이아웃/ config 변경 → 300ms 디바운스 → 저장 (FR-WIDGET-04 AC-1).
- **복원 실패 처리:** 파싱 실패·`version` 불일치·손상 → 기본 레이아웃으로 폴백 + `console.warn`, 앱은 계속 (AC-4).
- **기본 레이아웃:** 코드 상수(`widgets/defaultLayout.js`) — 할일·프로젝트·브리핑 3개.
- **config 검증:** 레지스트리의 `configSchema` 로 프론트에서 검증. 단계 2에서 백엔드도 화이트리스트 검증(임의 키·CSS 문자열 거부, NFR-SEC-04).
- **마이그레이션:** `localStorage` 키에 `v1` 붙임. 스키마 바뀌면 `v2` + 1회 변환 함수. SQLite 단계는 [ADR-0018](ADR-0018-schema-migration-strategy.md) 마이그레이션.

### 단계 2 DDL (제안 — 아직 schema.sql 미적용)
```sql
CREATE TABLE IF NOT EXISTS widget_instances (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  widget_type TEXT    NOT NULL,           -- 'tasks'|'projects'|'calendar'|'emails'|'brief'|'diagrams'
  x INTEGER NOT NULL, y INTEGER NOT NULL,
  w INTEGER NOT NULL, h INTEGER NOT NULL,
  z INTEGER NOT NULL DEFAULT 0,
  minimized   INTEGER NOT NULL DEFAULT 0 CHECK (minimized IN (0,1)),
  config      TEXT    NOT NULL DEFAULT '{}',   -- JSON: { theme:{...}, display:{...} }
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);
-- Week 10+: ADD COLUMN user_id TEXT;
```

## 근거
- **로컬 우선**([ADR-0015](ADR-0015-local-first-architecture.md)) — 레이아웃은 네트워크 없이 즉시 저장/복원돼야 한다. `localStorage` 가 가장 단순.
- 단일 사용자·단일 기기 단계에서 SQLite 왕복은 과설계. 하지만 `config`(JSON)를 쓰므로 나중에 테이블로 옮겨도 형태가 그대로.
- UI 상태를 도메인 테이블과 섞지 않아 [DATA_ARCHITECTURE.md](../DATA_ARCHITECTURE.md) 의 "테이블당 쓰기 주체 1" 불변식 유지(위젯 테이블은 백엔드 소유, 프론트가 `/api/widgets` 로 요청).

## 대안
- **처음부터 SQLite:** 오프라인 즉시성 손해, `/api/widgets` 라우트를 C5 에 같이 만들어야 함(범위 팽창).
- **파일(`userData/layout.json`):** Electron 전용 경로, 웹/테스트에서 불편. `localStorage` 가 이식성 높음.
- **도메인 스토어에 UI 필드 추가:** 관심사 혼합, 동기화 충돌 모델 오염.

## 결과 / 트레이드오프
- `localStorage` 는 브라우저/프로필별 → 다기기 공유 안 됨(단계 2에서 해소). 프라이빗 창·데이터 삭제 시 초기화될 수 있음 → 항상 기본 레이아웃 폴백 보장.
- `config` 를 문자열 JSON 으로 두므로 스키마 검증을 코드가 책임진다.
- 단계 전환(1→2) 시 기존 `localStorage` 레이아웃을 1회 import 하는 마이그레이션 필요.
