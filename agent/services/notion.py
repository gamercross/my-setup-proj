"""Notion 통합 (Week 4에서 구현 예정).

Week 1에서는 인터페이스만 제공한다.
"""


def save_to_notion(data: dict) -> bool:
    """결과를 Notion 페이지에 저장한다.

    TODO(Week 4): notion-client 로 실제 저장 구현.
    """
    # 지금은 콘솔에 출력만 한다
    print("[notion] 저장 요청:", data.get("title", "(제목 없음)"))
    return True
