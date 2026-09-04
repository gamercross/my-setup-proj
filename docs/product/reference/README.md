# 📚 reference/ — 정확한 계약

> 구현할 때 그대로 보고 쓰는 계약 문서 — REST 엔드포인트, 화면·컴포넌트, DB 필드, 용어.
> "왜"는 [architecture/](../architecture/README.md), "무엇을"은 [requirements/](../requirements/README.md).

**📂 이동:** [⬆ product/](../README.md) · [docs/](../../README.md) · [🚀 ONBOARDING](../../ONBOARDING.md)
**카테고리:** [🎯 vision](../vision/README.md) → [✅ requirements](../requirements/README.md) → [🏛 architecture](../architecture/README.md) → **📚 reference** · [🧪 testing](../testing/README.md)

---

## 이 폴더의 문서

| 문서 | 무엇 | 언제 참조 | ⚠️ 놓치기 쉬운 것 |
|---|---|---|---|
| [API_REFERENCE.md](API_REFERENCE.md) | 백엔드 REST 엔드포인트별 요청/응답 예시, 파라미터, 검증 규칙, 상태코드, 부작용, curl | 라우트·프론트 API 배선 시 | "현재 구현과의 차이" 표. 오류 형태는 현재 `{error}` — 확장은 [ADR-0017](../architecture/adr/ADR-0017-rest-error-contract.md)(제안) |
| [UI_SPEC.md](UI_SPEC.md) | 화면·컴포넌트 트리, 4상태 렌더, 와이어프레임(현재/위젯 셸), **§3.8~3.10 위젯 셸/프레임/설정**, 컴포넌트 계약표, zustand 스토어 계약(`useTaskStore`·`useProjectStore`·`useLayoutStore`) | 컴포넌트 구현/수정 시 | "코드와 다르면 코드가 맞다". §0·§2 위젯 셸 버전은 C5~C6 목표(현재 코드는 고정 패널) |
| [DATA_DICTIONARY.md](DATA_DICTIONARY.md) | 테이블·컬럼 단위 의미·타입·제약·예시, 관계 요약 | 쿼리 작성, 필드명 확인 | **단일 원천은 `backend/db/schema.sql`** — 이 문서는 설명. §7 `widget_instances` 는 제안(1차 localStorage) |
| [GLOSSARY.md](GLOSSARY.md) | 도메인·상태값·시스템 용어 정의 + 코드에서 쓰는 정확한 문자열 | 용어가 헷갈릴 때, 문서/커밋에서 같은 단어 쓰기 | 상태 enum(`todo`/`in_progress`/`done`, `active`/`done`/`on_hold`) 정확한 문자열. 위젯 용어 8개 추가됨 |

---

## 단일 원천 (이 문서들이 설명만 하는 것)

| 대상 | 진짜 원천 |
|---|---|
| DB 스키마(DDL) | `backend/db/schema.sql` |
| API 실제 동작 | `backend/src/routes/*.js` |
| 컴포넌트 실제 props/state | `frontend/src/components/*`, `frontend/src/store/*` |
| 환경변수 | [`.env.example`](../../../.env.example) + [../../setup/ENV_REFERENCE.md](../../setup/ENV_REFERENCE.md) |

## 다음으로

| 하려는 것 | 가는 곳 |
|---|---|
| 이 계약이 어느 요구사항인지 | [../requirements/TRACEABILITY.md](../requirements/TRACEABILITY.md) |
| 설계 배경·결정 | [../architecture/README.md](../architecture/README.md) |
| 테스트 케이스 | [../testing/TEST_PLAN.md](../testing/TEST_PLAN.md) |

---

**작성:** 2026-09-04
