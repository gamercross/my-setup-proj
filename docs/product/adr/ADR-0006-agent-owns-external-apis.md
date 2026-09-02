# ADR-0006: 외부 API 는 Python 에이전트가 전담

- 상태: 채택 (2026-09-02)
- 관련: FR-AGENT, FR-CAL, FR-MAIL, FR-PROJ-03, 강의 Week 6·11(에이전트)

## 맥락
Gmail·Google Calendar·Notion·Claude 를 호출해야 한다. Node 백엔드와 Python 에이전트 중 어디서 할지 정해야 한다.

## 결정
외부 API 연동은 **Python 에이전트(`agent/`)** 가 전담한다. 에이전트가 결과를 로컬 SQLite 캐시 테이블(`emails`, `calendar_events`, `briefs`)에 쓰고, 백엔드는 그 테이블을 **읽기만** 한다.

## 근거
- Python 쪽 SDK(`anthropic`, `google-api-python-client`, `notion-client`)가 성숙하고 예제가 많다.
- 강의가 Python 에이전트·Claude API 를 다룬다.
- 수집(느리고 실패 가능)과 서빙(빠르고 안정)을 분리 → 백엔드 응답이 외부 API 상태와 무관해진다 (NFR-REL-02).

## 대안
- **Node 백엔드에서 전부**: JS SDK 성숙도가 낮고, 강의 방향과 어긋난다.
- **에이전트가 API 서버(FastAPI)로 상주**: 지금은 배치 실행으로 충분. 실시간 요구가 생기면 재검토.

## 결과 / 트레이드오프
- 백엔드와 에이전트가 같은 SQLite 파일에 접근 → 동시성 처리 필요 ([ADR-0011](ADR-0011-agent-backend-db-access.md)).
- 데이터 신선도는 에이전트 실행 주기에 묶인다(캐시 지연).
- OAuth 토큰 관리도 에이전트 쪽(`agent/auth/`, NFR-SEC-05).
