# ADR-0003: 스키마는 `schema.sql` 1파일 + `CREATE TABLE IF NOT EXISTS`

- 상태: 채택 (2026-09-02)
- 관련: NFR-MAINT-03, [DATA_DICTIONARY.md](../../reference/DATA_DICTIONARY.md)

## 맥락
DB DDL 이 [ARCHITECTURE.md](../ARCHITECTURE.md) 와 초기 DESIGN.md 두 곳에 다르게 적혀 드리프트 위험이 있었다. 스키마 정의의 단일 원천이 필요하다. 마이그레이션 도구는 아직 없다.

## 결정
`backend/db/schema.sql` **한 파일**을 유일한 원천으로 삼는다. 백엔드 부팅 시 이 스크립트를 그대로 실행하고, 모든 문(statement)은 `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` 로 작성해 재실행이 안전하게 한다. 문서는 DDL 을 복사하지 않고 링크한다.

## 근거
- 마이그레이션 라이브러리 없이 시작할 수 있다.
- `IF NOT EXISTS` 로 idempotent → 부팅마다 안전하게 적용.
- enum 제약(`CHECK`)을 스키마에 두면 코드/문서 불일치를 DB 가 막아준다.

## 대안
- **마이그레이션 도구(knex, drizzle-kit)**: 지금 규모엔 과하다. 컬럼 변경이 잦아지면 재검토.
- **ORM 스키마 정의**: [ADR-0002](ADR-0002-local-db-better-sqlite3.md) 에서 ORM 을 안 쓰기로 함.

## 결과 / 트레이드오프
- 컬럼 변경 시 기존 DB 는 자동 반영되지 않는다 → 초기 단계엔 DB 파일 삭제 후 재생성으로 대응, Week 10 전후 마이그레이션 도구 도입 검토.
- Supabase 확장 컬럼은 schema.sql 하단에 주석으로 예고.
