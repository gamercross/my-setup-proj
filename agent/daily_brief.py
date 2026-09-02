"""일일 브리핑 에이전트 (Week 7에서 완성 예정).

Week 1에서는 전체 흐름의 뼈대만 만든다:
데이터 수집 -> Claude 분석 -> 저장.
"""

from datetime import datetime

from services.calendar import get_today_events
from services.claude import ask
from services.gmail import get_unread_emails
from services.notion import save_to_notion

SYSTEM_PROMPT = (
    "당신은 생산성 코치입니다. 사용자의 이메일과 일정을 보고 "
    "오늘의 우선순위 TOP 3와 주의할 점을 간결하게 정리해 주세요."
)


def build_context() -> str:
    """이메일 / 일정을 모아 프롬프트용 텍스트를 만든다."""
    emails = get_unread_emails()
    events = get_today_events()

    email_lines = "\n".join(f"- {e['from']}: {e['subject']}" for e in emails) or "없음"
    event_lines = "\n".join(f"- {ev['start']} {ev['title']}" for ev in events) or "없음"

    return (
        f"📧 미읽은 이메일:\n{email_lines}\n\n"
        f"📅 오늘 일정:\n{event_lines}\n\n"
        f"기준 시각: {datetime.now():%Y-%m-%d %H:%M}"
    )


def generate_daily_brief() -> str:
    """브리핑을 생성하고 저장한 뒤 텍스트를 반환한다."""
    context = build_context()

    try:
        brief = ask(context, system=SYSTEM_PROMPT)
    except Exception as err:  # noqa: BLE001 - Week 1 단계에서는 넓게 잡는다
        return f"⚠️ Claude 호출 실패: {err}"

    save_to_notion(
        {
            "title": f"Daily Brief - {datetime.now():%Y-%m-%d}",
            "content": brief,
            "date": datetime.now().isoformat(),
        }
    )
    return brief


if __name__ == "__main__":
    print(generate_daily_brief())
