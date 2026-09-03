# ADR-0015: 아키텍처 스타일 — 로컬 우선 + 프로세스 분리

- 상태: 제안 (2026-09-03)
- 관련: ASR-1·ASR-2·ASR-3 ([ARCHITECTURE_DRIVERS.md](../ARCHITECTURE_DRIVERS.md)), NFR-REL-02/04, [ADR-0006](ADR-0006-agent-owns-external-apis.md), [ADR-0008](ADR-0008-supabase-deferred.md), [ADR-0011](ADR-0011-agent-backend-db-access.md)

## 맥락
ADR 0001~0014 는 전술적 선택(라이브러리·파일 위치)만 기록했다. 이 시스템의 **전체 아키텍처 스타일**이 문서에 명시된 적이 없다. 큰 틀의 아키텍처가 부족하다는 피드백의 핵심이 이것이다.

## 결정
이 시스템의 아키텍처 스타일을 **"로컬 우선(local-first) 데스크톱 앱 + 프로세스 분리 에이전트 + 단방향 캐시 동기화"** 로 명시한다.

- **로컬 우선:** 로컬 SQLite 가 사용자 데이터의 진실의 원천. 클라우드·외부 API 는 그 위에 얹는 캐시/백업.
- **프로세스 분리:** UI(Electron), 로컬 API(Express), 에이전트(Python)는 독립 프로세스. SQLite 파일과 HTTP 로만 결합.
- **단방향 캐시 동기화:** 외부(Gmail/Calendar/Notion) → 로컬 캐시 테이블 방향으로만 흐른다. 에이전트가 유일한 유입 지점.

## 근거
- ASR-2(외부 실패 격리): 외부 호출을 한 프로세스에 가두면 UI·API 는 캐시만 읽어 안정적.
- ASR-3(무인 브리핑): 에이전트가 백엔드에 의존하지 않아 앱이 꺼져도 동작.
- ASR-1(오프라인): 진실의 원천이 로컬이라 네트워크 없이 CRUD 가능.
- 개인용·저빈도·단일 기기라 분산 시스템의 복잡도(합의·트랜잭션 코디네이터)를 피할 수 있다.

## 대안
- **모놀리식 단일 프로세스(Electron 안에 Express·에이전트 임베드):** 배포 단순하나 외부 API 예외가 UI 스레드에 영향, 무인 실행 불가.
- **클라우드 우선(Supabase 를 1차 저장소):** 오프라인 조회 불가, 개발 중 네트워크 의존. → [ADR-0008](ADR-0008-supabase-deferred.md) 에서 이미 기각.
- **이벤트 기반(메시지 큐로 프로세스 연결):** 개인용 규모에 과설계.

## 결과 / 트레이드오프
- SQLite 파일 공유로 인한 동시 접근 관리 필요 → [ADR-0011](ADR-0011-agent-backend-db-access.md).
- 실시간 반영 없음(폴링) → 다중 기기 시 Realtime 추가 ([ARCHITECTURE_EVOLUTION.md](../ARCHITECTURE_EVOLUTION.md)).
- "로컬 우선" 이지만 현재 렌더러는 백엔드 경유로만 로컬 데이터를 읽음 — 엄밀히는 "로컬 백엔드 우선". 한계와 목표는 [ARCHITECTURE_EVOLUTION.md](../ARCHITECTURE_EVOLUTION.md) §3.
- 재검토 조건: 다중 기기 동시 편집이 일상이 되거나, 서버측 에이전트(Stage 3)로 가면 스타일 재평가.
