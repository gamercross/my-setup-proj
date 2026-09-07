"""외부 데이터 동기화 엔트리포인트 (Phase D2-b).

Gmail·Calendar 를 각각 독립적으로 동기화한다. 한쪽 실패가 다른 쪽을 막지 않는다.
daily_brief 와는 분리된 프로세스다 (브리핑은 로컬 캐시만 읽는다).

실행: python agent/sync.py
"""

import logging

from db import connect, ensure_schema
from services.calendar import sync_calendar
from services.gmail import sync_gmail

logger = logging.getLogger(__name__)


def sync_all() -> dict[str, bool]:
    """Gmail·Calendar 를 동기화하고 서비스별 성공 여부를 반환한다."""
    try:
        with connect() as conn:
            ensure_schema(conn)
    except Exception as err:  # noqa: BLE001 - 부트스트랩 실패해도 계속 시도
        logger.warning("스키마 부트스트랩 실패(계속 진행): %s", err)

    results: dict[str, bool] = {}
    results["gmail"] = sync_gmail()
    results["calendar"] = sync_calendar()
    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    outcome = sync_all()
    for service, ok in outcome.items():
        print(f"{service}: {'성공' if ok else '실패'}")
    raise SystemExit(0 if all(outcome.values()) else 1)
