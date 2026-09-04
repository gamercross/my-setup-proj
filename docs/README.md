# 📚 docs/ — 문서 지도

> `my-setup-proj` 의 모든 문서. **처음이면 [🚀 ONBOARDING.md](ONBOARDING.md) 부터** 읽는다 (읽는 순서·규칙·명령 요약 + 폴더 문서 지도 다이어그램).
> 이 파일은 폴더별 진입점이다. 각 폴더의 `README.md` 가 그 안의 문서를 표로 안내한다.

---

## 세 갈래

| 폴더 | 질문 | 진입점 |
|---|---|---|
| [`product/`](product/README.md) | **무엇을 만드는가** — 비전·요구사항·구조·결정·계약·테스트 | [product/README.md](product/README.md) |
| [`setup/`](setup/README.md) | **어떤 세팅·규칙인가** — 환경·컨벤션·git·오케스트레이션·자동화 | [setup/README.md](setup/README.md) |
| [`progress/`](progress/README.md) | **얼마나 됐는가** — 주간 진행·강의 매핑 | [progress/README.md](progress/README.md) |

추가 진입 문서:

| 문서 | 내용 |
|---|---|
| [ONBOARDING.md](ONBOARDING.md) | 15분 온보딩 — 3문장 요약, 읽는 순서, 절대 규칙, 자주 쓰는 명령, **폴더 문서 지도(Mermaid)** |
| [STUDY_GUIDE.md](STUDY_GUIDE.md) | 아키텍처를 더 공부하려면 — 부족분 진단 + 도서·표준 목록 (C4/arc42, SA in Practice, Release It!, DDIA, RFC 9457 …) |

---

## `product/` 안의 5개 카테고리 (읽는 순서)

```
vision  →  requirements  →  architecture  →  reference · testing
 왜         무엇을 만족       어떻게 만드나      정확한 계약 · 검증
```

| # | 카테고리 | 대표 문서 | 폴더 README |
|:-:|---|---|---|
| 1 | **vision** | VISION · DASHBOARD_OS · AS_IS · CONSTRAINTS · RISKS · USE_SCENARIOS | [product/vision/](product/vision/README.md) |
| 2 | **requirements** | REQUIREMENTS_FUNCTIONAL(FR) · REQUIREMENTS_NONFUNCTIONAL(NFR) · TRACEABILITY · TASK/UI/AGENT/PROJ/WIDGET | [product/requirements/](product/requirements/README.md) |
| 3 | **architecture** | ARCHITECTURE(§0 뷰 지도) · DESIGN · DRIVERS · RUNTIME_VIEW · DATA_ARCHITECTURE · CROSSCUTTING · EVOLUTION · [adr/](product/architecture/adr/README.md) | [product/architecture/](product/architecture/README.md) |
| 4 | **reference** | API_REFERENCE · UI_SPEC · DATA_DICTIONARY · GLOSSARY | [product/reference/](product/reference/README.md) |
| 5 | **testing** | TEST_PLAN | [product/testing/](product/testing/README.md) |
| — | (product/ 루트) | [ROADMAP.md](product/ROADMAP.md) (주차 일정) · [DOC_PLAN.md](product/DOC_PLAN.md) (문서 계획·메타) | — |

---

## 이동 규칙 (모든 폴더 README 공통)

- 각 폴더 `README.md` 상단에 **네비게이션 바**(⬆ 상위 · 카테고리 형제 · 🚀 ONBOARDING)가 있다.
- 각 문서 표에는 **`언제 참조`** 와 **`⚠️ 놓치기 쉬운 것`** 열이 있다 — 에이전트/사람이 훑고 바로 필요한 문서로 간다.
- "이 문서와 코드가 다르면 코드가 맞다" — 단일 원천은 `backend/db/schema.sql`(스키마), `.env.example`+[ENV_REFERENCE](setup/ENV_REFERENCE.md)(환경변수), 각 라우트 코드(API 동작).
- 이 구조가 실제로 일관되고 완결돼 있는지는 **`bash scripts/check-docs.sh`** 가 검사한다 (링크·ADR표·FR추적·폴더 README 커버리지·드리프트 — `verify.sh`·CI 포함). 작업 착수 전 `--bundle <FR-ID>` 로 필요한 문서를 한 번에 모을 수 있다. → [setup/DOC_HEALTH.md](setup/DOC_HEALTH.md)

---

**작성:** 2026-09-04
