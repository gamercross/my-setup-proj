"""일일 브리핑 에이전트 (Phase D1).

흐름: 컨텍스트 수집(할일=실 SQLite, 일정/메일=더미) -> Claude 분석 -> briefs upsert -> Notion 저장.
외부 호출 실패는 프로세스를 죽이지 않고 결과 텍스트에 사유를 담아 반환한다(FR-AGENT-06).

일정/메일은 아직 더미다 — 실데이터 배선은 D2 범위.
"""

import logging
from datetime import datetime

from db import connect, ensure_schema, get_today_tasks, upsert_brief
from services.calendar import get_today_events
from services.claude import ask
from services.gmail import get_unread_emails
from services.notion import save_to_notion

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "당신은 생산성 코치입니다. 사용자의 할일·이메일·일정을 보고 "
    "아래 형식(한국어, 300자 내외, 텍스트만)으로 정리해 주세요.\n"
    "오늘의 우선순위 TOP 3\n"
    "1. ...\n2. ...\n3. ...\n"
    "주의할 점\n"
    "- ...\n"
    "표·코드블록·마크다운 heading 없이 위 텍스트 형식만 사용합니다."
)


def build_context() -> str:
    """할일 / 이메일 / 일정을 모아 프롬프트용 텍스트를 만든다."""
    try:
        tasks = get_today_tasks()
        task_lines = (
            "\n".join(
                f"- [{t['priority']}] {t['title']} ({t['status']})" for t in tasks
            )
            or "없음"
        )
        logger.info("수집: 할일 %d건", len(tasks))
    except Exception as err:  # noqa: BLE001 - 실패를 격리하고 계속 진행한다(AC-3)
        task_lines = "(할일을 불러오지 못함)"
        logger.warning("할일 수집 실패: %s", err)

    emails = get_unread_emails()
    events = get_today_events()

    email_lines = "\n".join(f"- {e['from']}: {e['subject']}" for e in emails) or "없음"
    event_lines = "\n".join(f"- {ev['start']} {ev['title']}" for ev in events) or "없음"
    logger.info("수집: 이메일 %d건, 일정 %d건", len(emails), len(events))

    return (
        f"✅ 오늘 할일:\n{task_lines}\n\n"
        f"📧 미읽은 이메일:\n{email_lines}\n\n"
        f"📅 오늘 일정:\n{event_lines}\n\n"
        f"기준 시각: {datetime.now():%Y-%m-%d %H:%M}"
    )


def _run() -> tuple[bool, str]:
    """브리핑을 생성·저장하고 (성공여부, 결과텍스트) 를 반환한다."""
    logger.info("일일 브리핑 시작")

    # 빈 파일 DB 를 대비한 방어적 스키마 부트스트랩 (초기화 책임은 백엔드 — ADR-0011).
    try:
        with connect() as conn:
            ensure_schema(conn)
    except Exception as err:  # noqa: BLE001 - 부트스트랩 실패해도 계속 진행
        logger.warning("스키마 부트스트랩 실패(계속 진행): %s", err)

    today = f"{datetime.now():%Y-%m-%d}"
    context = build_context()

    try:
        brief = ask(context, system=SYSTEM_PROMPT)
    except Exception as err:  # noqa: BLE001 - 실패 격리(FR-AGENT-06 AC-1)
        logger.error("Claude 호출 실패: %s", err)
        return False, f"⚠️ Claude 호출 실패: {err}"

    logger.info("Claude 응답 %d자 수신", len(brief))

    result = brief
    try:
        upsert_brief(today, brief)
        logger.info("briefs 저장 완료 (date=%s)", today)
    except Exception as err:  # noqa: BLE001 - 로컬 저장 실패도 크래시하지 않는다
        logger.error("로컬 저장 실패: %s", err)
        result = f"{brief}\n\n⚠️ 로컬 저장 실패: {err}"

    try:
        save_to_notion(
            {
                "title": f"Daily Brief - {today}",
                "content": brief,
                "date": datetime.now().isoformat(),
            }
        )
        logger.info("Notion 저장 완료")
    except Exception as err:  # noqa: BLE001 - Notion 실패는 로컬 저장에 영향 없음(AC-2)
        logger.warning("Notion 저장만 실패: %s", err)
        result = f"{result}\n\n⚠️ Notion 저장만 실패: {err}"

    return True, result


def generate_daily_brief() -> str:
    """브리핑을 생성·저장한 뒤 텍스트를 반환한다 (기존 시그니처 유지)."""
    return _run()[1]


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    ok, text = _run()
    print(text)
    raise SystemExit(0 if ok else 1)
