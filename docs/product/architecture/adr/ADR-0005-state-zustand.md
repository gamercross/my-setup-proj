# ADR-0005: 상태관리는 zustand

- 상태: 채택 (2026-09-02)
- 관련: FR-UI-02, [UI_SPEC.md](../../reference/UI_SPEC.md) §6

## 맥락
대시보드가 할일·프로젝트·일정·브리핑을 여러 컴포넌트에서 공유한다. 전역 상태 도구가 필요하다. `frontend/package.json` 에 이미 `zustand` 의존성이 선언돼 있으나 사용처는 없다.

## 결정
**zustand** 를 쓴다. 도메인별 스토어(`useTaskStore`, `useAppStore`)를 만들고, 서버 데이터는 fetch 후 스토어에 보관한다.

## 근거
- 이미 의존성에 있다.
- 보일러플레이트가 적다 — 훅 하나로 상태+액션.
- 프로바이더 래핑이 필요 없다.

## 대안
- **Redux (+Toolkit)**: 이 규모엔 과하다.
- **React Query / SWR**: 서버 상태 캐싱엔 좋지만 지금은 스토어 + 단순 fetch 래퍼로 충분. 폴링·재검증이 늘면 재검토.
- **Context 만**: 리렌더 제어가 번거롭다.

## 결과 / 트레이드오프
- 서버 상태 캐시·무효화 로직을 직접 관리한다(각 스토어의 `loading`/`error` 필드).
- 액션은 모두 `api/client.js` 경유로 통일해 에러 정규화 (NFR-REL-02).
