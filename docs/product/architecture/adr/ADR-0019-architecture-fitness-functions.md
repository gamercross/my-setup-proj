# ADR-0019: 아키텍처 피트니스 함수

- 상태: 제안 (2026-09-03)
- 관련: NFR-MAINT-02/03, NFR-SEC-03/04, NFR-PORT-03, [ARCHITECTURE_DRIVERS.md](../ARCHITECTURE_DRIVERS.md) §4

## 맥락
`routes→services→db` 계층, "렌더러에 시크릿 없음", "하드코딩 경로 없음" 같은 구조 규칙이 **문장으로만** 존재한다. 규칙이 깨져도 CI·리뷰가 자동으로 잡지 못한다. 시간이 지나면 구조가 침식된다(architectural drift).

## 결정 (제안)
핵심 구조 규칙을 **자동 검사(피트니스 함수)**로 강제한다. `verify.sh` + 테스트 + CI grep 으로 구현하고, 구현 시점은 해당 계층이 생길 때로 미룬다.

| # | 규칙 | 구현 |
|---|---|---|
| FF-1 | 라우트가 `db` 직접 import 금지 | `backend/test/arch.test.js` (services 도입 후) |
| FF-2 | `db.js` 공개 API 시그니처 스냅샷 | 테스트 스냅샷 |
| FF-3 | 렌더러 번들에 시크릿 패턴 0 | CI grep on `frontend/dist` |
| FF-4 | `contextIsolation:false`/`nodeIntegration:true` 금지 | CI grep + `frontend/test` |
| FF-5 | 백엔드 `package.json` 에 외부 API SDK 없음 | 의존성 화이트리스트 테스트 |
| FF-6 | 모든 요청 1줄 로그 | `middleware.test.js` (✅ 완료) |
| FF-7 | `/Users/` 등 절대경로 하드코딩 0 (plist 예외) | `verify.sh` grep 단계 |

## 근거
- 규칙을 테스트로 만들면 리뷰 부담이 줄고, 위반이 PR 에서 바로 빨간불.
- 점진 도입 가능 — 지금 당장 전부 구현할 필요 없음.

## 대안
- **코드 리뷰에만 의존:** 리뷰어가 놓치면 침식. supervisor 에이전트도 diff 만 봄.
- **dependency-cruiser / ArchUnit 같은 전용 툴:** 이 규모엔 무겁다. grep + 테스트로 충분.

## 결과 / 트레이드오프
- 가짜 양성(false positive) 가능 — 규칙은 좁고 명확하게.
- `verify.sh` 실행 시간 소폭 증가.
- 새 구조 규칙이 생기면 이 표에 행 추가(별도 ADR 불필요).
