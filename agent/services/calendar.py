"""Google Calendar 통합 — 향후 7일 일정 수집 (Phase D2-b, FR-CAL-03).

읽기 전용(calendar.readonly)으로 오늘 00:00 ~ +7일 일정을 calendar_events 에 캐시한다.
네트워크 호출은 execute_with_retry 로 감싼다 (NFR-REL-05).
"""

import logging
from datetime import datetime, timedelta

import db
from services.google_common import _sanitize_error, execute_with_retry

logger = logging.getLogger(__name__)

DEFAULT_WINDOW_DAYS = 7
CALENDAR_ID = "primary"
_MAX_RESULTS = 250


def _normalize_when(when: dict) -> str:
    """start/end dict 를 naive(타임존 없는) ISO8601 문자열로 정규화한다.

    DB 창 경계·조회(db.get_today_events 등)가 모두 naive 문자열을 쓰므로
    SQLite 문자열 비교가 일관되도록 여기서도 naive 로 통일한다 (FR-CAL-03 AC-2).

    - timed 일정(dateTime): offset 이 붙어 있으면 로컬 시각으로 환산 후 tzinfo 제거.
    - 종일 일정(date 만 존재): YYYY-MM-DDT00:00:00.
    """
    if when.get("dateTime"):
        try:
            parsed = datetime.fromisoformat(when["dateTime"])
        except ValueError:
            return when["dateTime"]
        if parsed.tzinfo is not None:
            parsed = parsed.astimezone().replace(tzinfo=None)
        return parsed.isoformat()
    if when.get("date"):
        return f"{when['date']}T00:00:00"
    return ""


def fetch_events(days: int = DEFAULT_WINDOW_DAYS, *, service=None, now=None):
    """(window_start_iso, window_end_iso, events) 를 반환한다.

    events 키: event_id / title / start_time / end_time / location
    ※ 페이지네이션 미구현 — maxResults(250) 를 넘는 일정은 잘린다.
    """
    if service is None:
        from auth import google_oauth

        service = google_oauth.build_service("calendar", "v3")

    # 창 경계: offset-aware 는 Google API(timeMin/timeMax, RFC3339) 에만,
    # DB 창 경계로는 naive ISO 를 넘긴다 (_normalize_when·db 조회와 통일).
    base = (now or datetime.now()).astimezone()
    aware_start = base.replace(hour=0, minute=0, second=0, microsecond=0)
    # NOTE: DST 전환 지역에서는 timedelta(days=days) 가 timeMax 를 1시간 어긋나게 할 수 있다.
    # KST 는 DST 가 없어 영향 없음.
    aware_end = aware_start + timedelta(days=days)
    time_min = aware_start.isoformat()
    time_max = aware_end.isoformat()
    window_start = aware_start.replace(tzinfo=None).isoformat()
    window_end = aware_end.replace(tzinfo=None).isoformat()

    resp = execute_with_retry(
        service.events().list(
            calendarId=CALENDAR_ID,
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy="startTime",
            maxResults=_MAX_RESULTS,
        )
    )

    events: list[dict] = []
    for item in resp.get("items", []) or []:
        if item.get("status") == "cancelled":
            continue
        events.append(
            {
                "event_id": item.get("id"),
                "title": item.get("summary") or "(제목 없음)",
                "start_time": _normalize_when(item.get("start", {})),
                "end_time": _normalize_when(item.get("end", {})),
                "location": item.get("location") or None,
            }
        )
    return window_start, window_end, events


def sync_calendar(days: int = DEFAULT_WINDOW_DAYS) -> bool:
    """향후 일정을 수집해 calendar_events 를 갱신하고 sync_logs 에 결과를 남긴다.

    실패해도 예외를 전파하지 않고 False 를 반환한다. 캐시는 직전 값을 유지한다 (FR-CAL-03 AC-4).
    """
    try:
        window_start, window_end, events = fetch_events(days)
        db.replace_calendar_events(window_start, window_end, events)
        db.log_sync("calendar", "success")
        logger.info("Calendar 동기화 완료 — %d건", len(events))
        return True
    except Exception as err:  # noqa: BLE001 - 실패 격리
        logger.error("Calendar 동기화 실패: %s", err)
        db.log_sync("calendar", "failed", _sanitize_error(err))
        return False
