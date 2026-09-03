# ADR-0018: 스키마 마이그레이션 전략

- 상태: 제안 (2026-09-03) — 첫 `ALTER` 필요 시점(Week 10 `user_id`) 전 확정
- 관련: [ADR-0003](ADR-0003-schema-single-file.md), [ADR-0008](ADR-0008-supabase-deferred.md), [DATA_ARCHITECTURE.md](../DATA_ARCHITECTURE.md) §3, NFR-MAINT-03

## 맥락
[ADR-0003](ADR-0003-schema-single-file.md) 은 `schema.sql` 1파일 + `CREATE TABLE IF NOT EXISTS` 로 스키마를 멱등 적용한다. 이 방식은 **기존 테이블의 컬럼 추가·제약 변경을 할 수 없다.** Week 10 의 `user_id`/`synced_at`/`deleted_at` 추가에서 즉시 막힌다.

## 결정 (제안)
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
