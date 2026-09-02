"""Google Calendar 통합 (Week 5에서 구현 예정).

Week 1에서는 인터페이스와 더미 데이터만 제공한다.
"""

from datetime import datetime


def get_today_events() -> list[dict]:
    """오늘 일정 목록을 반환한다.

    TODO(Week 5): google-api-python-client 로 실제 Calendar API 연동.
    """
    # 개발용 더미 데이터
    return [
        {"start": datetime.now().strftime("%H:%M"), "title": "샘플 일정"}
    ]
