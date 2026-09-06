# tests/

프로젝트 통합 테스트 디렉토리 (Week 2부터 채워나감).

- `frontend/` - Electron/React 컴포넌트 테스트 (Jest)
- `backend/` - Express API 테스트 (supertest)
- `agent/` - Python 에이전트 테스트 (pytest)

지금은 각 하위 프로젝트의 자체 테스트(`agent/test_claude.py` 등)를 사용한다.

**문서·오케스트레이션 정합 검사**(링크·ADR표·FR추적·README 커버리지·드리프트)는
코드 테스트가 아니라 `scripts/check_docs.py` 에 있고 `verify.sh`·CI 에 포함된다 —
설명은 [docs/setup/DOC_HEALTH.md](../docs/setup/DOC_HEALTH.md).
