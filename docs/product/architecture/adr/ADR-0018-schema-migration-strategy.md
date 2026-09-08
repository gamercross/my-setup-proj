# ADR-0018: 스키마 마이그레이션 전략

- 상태: 채택 (2026-09-08) — 최소안 채택. `PRAGMA user_version` + `db/index.js` 인라인 러너, `migrations/` 디렉터리·별도 러너 모듈 없음, forward-only, 실행 전 `app.db` → `.bak-<ts>`. 정식 순번 러너(아래 "결정")는 Supabase 도입(Week 10) 시 재검토.
- 관련: [ADR-0003](ADR-0003-schema-single-file.md), [ADR-0008](ADR-0008-supabase-deferred.md), [DATA_ARCHITECTURE.md](../DATA_ARCHITECTURE.md) §3, NFR-MAINT-03

## 맥락
[ADR-0003](ADR-0003-schema-single-file.md) 은 `schema.sql` 1파일 + `CREATE TABLE IF NOT EXISTS` 로 스키마를 멱등 적용한다. 이 방식은 **기존 테이블의 컬럼 추가·제약 변경을 할 수 없다.** Week 10 의 `user_id`/`synced_at`/`deleted_at` 추가에서 즉시 막힌다.

## 채택된 최소안 (2026-09-08, 개인 OS P6)
FR-TASK-08(`task_tags` + `sync_logs` CHECK 확장)에서 첫 마이그레이션이 필요해졌다. 정식 순번 러너 대신 최소 구현을 채택한다.

- `backend/db/index.js` 상단 `SCHEMA_VERSION` 상수 + `applyMigrations(db, dbPath)` 인라인 함수. 별도 파일·`migrations/` 디렉터리 없음.
- `openDatabase()` 에서 `db.exec(schema)` 직후 `applyMigrations` 호출. `PRAGMA user_version` 으로 적용 버전 추적.
- 파일 DB 가 실제 존재할 때만 마이그레이션 직전 `copyFileSync` → `${dbPath}.bak-<ts>`. `:memory:`·신규 파일은 스킵.
- forward-only, down 스크립트 없음. 실패 시 기존 `openDatabase` try/catch 가 잡아 재던진다.
- 에이전트(`agent/db.py:ensure_schema`)는 마이그레이션을 실행하지 않는다.
- v1: `sync_logs` 를 테이블 재작성(new→copy→drop→rename) 패턴으로 CHECK 에 `'classify'` 추가.

## 결정 (정식안 — Supabase 도입 시 재검토)
순번 기반 순방향 전용(forward-only) 마이그레이션을 도입한다.

- `backend/db/migrations/0001_init.sql`, `0002_add_user_id.sql` … — 순번 + 설명.
- `0001_init.sql` = 현재 `schema.sql` 내용(초기 스키마). 이후 스키마 변경은 마이그레이션 파일로만.
- `schema_migrations(version INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)` 로 이력 추적. (또는 `PRAGMA user_version`)
- **백엔드 부팅 시**: 미적용 파일을 순서대로 트랜잭션으로 실행 → 버전 기록. 실행 직전 `app.db` 백업(`.bak-<ts>`).
- **에이전트**: 마이그레이션 실행 안 함. 버전이 자기가 아는 최소치보다 낮으면 경고 후 종료(백엔드를 먼저 부팅하라는 메시지).
- CHECK 제약 변경 등 SQLite 가 직접 지원 안 하는 것은 "테이블 재작성"(new→copy→drop→rename) 패턴을 마이그레이션 안에 명시.
- `schema.sql` 은 문서·신규 셋업용 스냅샷으로 유지하되 "생성물, 원천은 migrations/" 라고 주석.

## 근거
- 표준적이고 작다. 외부 마이그레이션 라이브러리 없이 20줄 러너로 구현 가능.
- 순방향 전용 + 백업이 SQLite·개인용 규모에 적절(down 스크립트 유지 비용 회피).
- Supabase(PostgreSQL) 도입 시 같은 순번을 Supabase 마이그레이션과 맞출 수 있음.

## 대안
- **`schema.sql` 유지 + 수동 `ALTER`:** 재현 불가, 머신 간 드리프트.
- **ORM(Prisma/Drizzle) 도입:** [ADR-0002](ADR-0002-local-db-better-sqlite3.md)(생 SQL·동기 API) 방향과 충돌, 학습 비용.
- **매번 DB 재생성:** 사용자 데이터 유실 — 운영 불가.

## 결과 / 트레이드오프
- 부팅 로직에 마이그레이션 러너 추가(`backend/db/index.js`). 테스트 필요(TC-DB 확장).
- down 없음 → 실수한 마이그레이션은 백업 복원으로만 롤백.
- `.gitignore` 에 `*.bak-*` 추가.
- 재검토: Supabase 도입 시 두 저장소의 마이그레이션 동기화 방식을 Week 10 ADR 에서.
