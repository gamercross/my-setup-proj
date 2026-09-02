"""Gmail 통합 (Week 6에서 구현 예정).

Week 1에서는 인터페이스와 더미 데이터만 제공한다.
"""


def get_unread_emails(max_results: int = 5) -> list[dict]:
    """미읽은 이메일 목록을 반환한다.

    TODO(Week 6): google-api-python-client 로 실제 Gmail API 연동.
    """
    # 개발용 더미 데이터
    return [
        {"from": "noreply@example.com", "subject": "샘플 이메일입니다", "snippet": "..."}
    ][:max_results]
