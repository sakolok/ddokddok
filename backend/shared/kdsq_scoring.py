from typing import Dict, List

_CONCERN_KEYWORDS = [
    "네",
    "맞",
    "그렇",
    "있",
    "자주",
    "가끔",
    "때때로",
    "힘들",
    "어렵",
    "모르",
    "잊",
    "헷갈",
    "불안",
    "우울",
]

_DENY_KEYWORDS = [
    "아니",
    "없",
    "괜찮",
    "문제없",
    "잘",
    "전혀",
]


def is_concern(answer: str) -> bool:
    if not answer:
        return False
    text = answer.replace(" ", "")
    has_deny = any(k in text for k in _DENY_KEYWORDS)
    has_concern = any(k in text for k in _CONCERN_KEYWORDS)
    if has_deny and not has_concern:
        return False
    if has_concern and not has_deny:
        return True
    # If both or neither, default to non-concern for safety
    return False


def daily_concern_counts(responses: List[dict]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for r in responses:
        answer = (r.get("answer") or "").strip()
        timestamp = (r.get("timestamp") or "").strip()
        if not timestamp:
            continue
        day = timestamp.split("T")[0]
        if is_concern(answer):
            counts[day] = counts.get(day, 0) + 1
    return counts


def compute_kdsq_stats(responses: List[dict]) -> Dict[str, object]:
    signals = {
        "orientation": "NONE",
        "memory": "NONE",
        "mood": "NONE",
        "social": "NONE",
        "daily": "NONE",
    }
    concern_count = 0
    total = 0
    concern_examples = []
    for r in responses:
        total += 1
        answer = (r.get("answer") or "").strip()
        question = (r.get("question") or "").strip()
        kdsq_type = (r.get("kdsq_type") or "").strip()
        if not kdsq_type:
            kdsq_id = r.get("kdsq_item_id") or ""
            if "_" in kdsq_id:
                kdsq_type = kdsq_id.split("_", 1)[0]
        if is_concern(answer):
            concern_count += 1
            if kdsq_type in signals:
                signals[kdsq_type] = "concern"
            if question and answer and len(concern_examples) < 3:
                concern_examples.append({"question": question, "answer": answer})

    score_total = concern_count
    if score_total <= 2:
        status_emoji = "🙂"
    elif score_total <= 5:
        status_emoji = "😐"
    elif score_total <= 8:
        status_emoji = "😟"
    else:
        status_emoji = "😣"

    summary = (
        f"최근 7일 KDSQ 기반 자가 점검 질문 {total}회 중 "
        f"우려 응답 {concern_count}회가 관찰되었습니다. 의료 진단이 아닌 참고 지표입니다."
    )
    if concern_examples:
        examples_text = " / ".join(
            [f"Q:{e['question']} A:{e['answer']}" for e in concern_examples]
        )
        summary = f"{summary} 예) {examples_text}"

    return {
        "summary": summary,
        "signals": signals,
        "score_total": score_total,
        "status_emoji": status_emoji,
        "concern_examples": concern_examples,
    }
