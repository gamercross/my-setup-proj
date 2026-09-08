"""할일 자동 분류 (T2 — FR-TASK-08 / ADR-0029).

태그가 하나도 없는 미완료 할일을 모아 Claude 에 한 번 보내고,
반환된 짧은 한국어 태그(할일당 1~3개)를 task_tags 에 source='agent' 로 저장한다.
daily_brief 배치 컨텍스트에서만 호출한다 (PO-4).

실패는 브리핑을 죽이지 않는다 — 경고 로그 + sync_logs('classify','failed') 후 0 반환.
"""

import json
import logging
import re

from db import add_agent_tags, get_untagged_tasks, log_sync
from services.claude import ask
from services.sanitize import sanitize_error

logger = logging.getLogger(__name__)

BATCH_LIMIT = 30
MAX_TAGS_PER_TASK = 3

SYSTEM_PROMPT = (
    "당신은 할일 분류기입니다. 각 할일에 짧은 한국어 태그를 1~3개 붙이세요.\n"
    "태그는 1~20자, 명사 위주(예: '공부', '건강', '업무', '집안일').\n"
    "아래 JSON 만 출력합니다. 설명·코드블록·다른 텍스트 금지.\n"
    '{"tags": {"<할일 id>": ["태그1", "태그2"]}}'
)

# 코드펜스 제거용 (```json ... ``` 래핑 대응)
_FENCE_RE = re.compile(r"^```[a-zA-Z]*\s*|\s*```$")


def build_prompt(tasks: list[dict]) -> str:
    """할일 목록을 분류용 프롬프트 텍스트로 만든다 (순수 함수)."""
    lines = []
    for t in tasks:
        desc = (t.get("description") or "").strip()
        suffix = f" — {desc}" if desc else ""
        lines.append(f"- id={t['id']}: {t.get('title', '')}{suffix}")
    return "다음 할일들을 분류하세요:\n" + "\n".join(lines)


def parse_tags(text: str) -> dict[int, list[str]]:
    """Claude 응답 텍스트를 {task_id: [tag, ...]} 로 파싱한다 (순수 함수).

    형식 위반(파싱 불가·구조 불일치)이면 ValueError 를 던진다.
    태그는 트림·1~20자·중복 제거·최대 MAX_TAGS_PER_TASK 개로 정리한다.
    """
    cleaned = _FENCE_RE.sub("", str(text).strip())
    try:
        data = json.loads(cleaned)
    except (json.JSONDecodeError, TypeError) as err:
        raise ValueError(f"JSON 파싱 실패: {err}") from err

    if not isinstance(data, dict) or not isinstance(data.get("tags"), dict):
        raise ValueError("응답에 tags 객체가 없습니다.")

    out: dict[int, list[str]] = {}
    for raw_id, raw_tags in data["tags"].items():
        try:
            task_id = int(raw_id)
        except (ValueError, TypeError) as err:
            raise ValueError(f"할일 id 가 정수가 아님: {raw_id!r}") from err
        if not isinstance(raw_tags, list):
            raise ValueError(f"id={task_id} 의 태그가 리스트가 아닙니다.")
        tags: list[str] = []
        for tag in raw_tags:
            if not isinstance(tag, str):
                raise ValueError(f"id={task_id} 태그가 문자열이 아닙니다.")
            t = tag.strip()
            if not (1 <= len(t) <= 20):
                continue
            if t not in tags:
                tags.append(t)
            if len(tags) >= MAX_TAGS_PER_TASK:
                break
        if tags:
            out[task_id] = tags
    return out


def classify_untagged(limit: int = BATCH_LIMIT) -> int:
    """태그 없는 할일을 분류해 저장한다. 저장한 (할일,태그) 쌍 수를 반환한다.

    대상 0건이면 Claude 를 호출하지 않고 0 을 반환한다.
    어떤 예외도 상위로 전파하지 않는다 (경고 로그 + sync_logs 기록 후 0).
    """
    try:
        tasks = get_untagged_tasks(limit)
        if not tasks:
            return 0

        response = ask(build_prompt(tasks), system=SYSTEM_PROMPT)
        mapping = parse_tags(response)

        # 이번 배치에 실제로 포함된 id 로만 제한한다 (환각 id 방어).
        valid_ids = {t["id"] for t in tasks}
        mapping = {tid: tags for tid, tags in mapping.items() if tid in valid_ids}

        written = add_agent_tags(mapping)
        log_sync("classify", "success")
        logger.info("자동 분류: 할일 %d건 대상, 태그 %d개 저장", len(tasks), written)
        return written
    except Exception as err:  # noqa: BLE001 - 분류 실패는 브리핑을 막지 않는다
        logger.warning("자동 분류 실패: %s", err)
        log_sync("classify", "failed", sanitize_error(err))
        return 0
