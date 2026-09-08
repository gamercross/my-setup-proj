"""지금 실행 트리거 소비 엔트리포인트 (P7, FR-AGENT-08).

백엔드가 `agent/.triggers/run-now` 파일을 만들면(POST /api/agent/run-now),
launchd `WatchPaths` 가 그 디렉터리 변경을 감지해 이 스크립트를 부른다.

ADR-0013 을 부분 채택한다(PO-9): 전체 작업 큐(`agent_jobs`) 대신,
대시보드의 "지금 실행" 버튼 하나만 파일 플래그로 구현한다. 상주 프로세스는 없다.

동작:
  1. 플래그 파일이 있으면 **먼저 삭제**하고(중복 실행 방지) sync.sync_all() 을 돌린다.
  2. 플래그가 없으면(launchd 가 다른 이유로 깨어난 경우) 아무것도 하지 않고 0 을 반환한다.

실행: python agent/trigger.py
"""

import logging
from pathlib import Path

import sync

logger = logging.getLogger(__name__)

FLAG_DIR = Path(__file__).resolve().parent / ".triggers"
FLAG_PATH = FLAG_DIR / "run-now"


def consume(path: Path | None = None) -> bool:
    """플래그 파일이 있으면 삭제하고 True, 없으면 False. 삭제 실패는 warning + False."""
    target = path or FLAG_PATH
    try:
        if not target.exists():
            return False
        target.unlink(missing_ok=True)
        return True
    except OSError as err:
        logger.warning("트리거 플래그 삭제 실패(실행 건너뜀): %s", err)
        return False


def main() -> int:
    """플래그가 있으면 sync 를 실행한다. 삭제를 실행보다 먼저 한다."""
    if not consume():
        logger.info("트리거 플래그 없음 — 실행 건너뜀")
        return 0

    logger.info("트리거 감지 — sync 실행")
    outcome = sync.sync_all()
    for service, ok in outcome.items():
        print(f"{service}: {'성공' if ok else '실패'}")
    return 0 if all(outcome.values()) else 1


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    raise SystemExit(main())
