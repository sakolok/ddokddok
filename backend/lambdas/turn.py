import json
import os
import logging
import random
import re
from datetime import datetime, timedelta, timezone
from boto3.dynamodb.conditions import Key
from shared.response import json_response
from shared.utils import now_iso, ttl_epoch
from shared.ddb import turns_table, sessions_table, kdsq_responses_table
from shared.bedrock import invoke_chat
from shared.polly import synthesize_to_s3
from shared.kdsq_questions import KDSQ_QUESTIONS
from shared.auth import AuthError, require_session_access, require_user_access
from shared.metrics import put_metric
from shared.knowledge_base import is_configured as knowledge_base_configured, retrieve_context

SAFE_FALLBACK = {
    "say": "제가 지금 답을 준비하는 연결이 불안정해요. 방금 말씀을 한 번만 다시 들려주시면 바로 이어서 대화할게요.",
    "tags": {"kdsq_item_id": "NONE", "risk_hint": "NONE"},
}

SAFETY_FALLBACK = {
    "say": "걱정되는 마음이 드실 수 있어요. 지금은 안전이 가장 중요하니, 가까운 가족이나 보호자에게 바로 알려주세요. 제가 곁에서 천천히 들어드릴게요.",
    "tags": {"kdsq_item_id": "NONE", "risk_hint": "concern"},
}

BANNED_PHRASES = [
    "치매입니다",
    "치매 환자입니다",
    "알츠하이머입니다",
    "알츠하이머병입니다",
    "우울증입니다",
    "진단입니다",
    "진단되었습니다",
    "확정입니다",
    "확정되었습니다",
]

SAFETY_ALERT_PHRASES = [
    "자해",
    "자살",
    "죽고싶",
    "죽을래",
    "극단적",
    "해를",
    "해치",
]

SENSITIVE_REQUEST_PHRASES = [
    "계좌",
    "카드번호",
    "비밀번호",
    "주민번호",
    "인증번호",
    "OTP",
    "주민등록번호",
    "계좌번호",
    "핀번호",
    "상품권",
    "결제",
    "송금",
    "대출",
    "투자",
]

AWKWARD_PHRASE_REPLACEMENTS = {
    "힐링": "마음을 가라앉히는 시간",
    "오늘 하루도 잘 마무리하시길 바래요.": "",
    "오늘 하루도 잘 마무리하시길 바라요.": "",
    "오늘 하루도 마음이 많이 가라앉으셨겠어요.": "마음이 많이 무거우셨겠어요.",
    "옆집 할머니님이": "옆집 할머니가",
    "할머니님이": "할머니가",
    "할머니님": "할머니",
    "좋은 음식을 먹으시니 기분이 좋아하실 거예요.": "고마운 마음이 드셨겠어요.",
    "오늘 이야기 하시는 건 좀 피곤하시겠죠?": "오늘은 여기까지 이야기하고 싶으시군요. 편하실 때 다시 이어가요.",
    "엄마님께서는": "",
    "엄마님께서": "",
    "엄마님은": "",
    "엄마님": "",
    "아버님께서는": "",
    "아버님께서": "",
    "아버님은": "",
    "아버님": "",
}

_logger = logging.getLogger(__name__)
_logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))
PROMPT_VERSION = os.getenv("PROMPT_VERSION", "elder-companion-v3")
KDSQ_MIN_TURNS_BEFORE_FIRST = int(os.getenv("KDSQ_MIN_TURNS_BEFORE_FIRST", "5"))
KDSQ_TURN_INTERVAL = int(os.getenv("KDSQ_TURN_INTERVAL", "8"))
KDSQ_DAILY_LIMIT = int(os.getenv("KDSQ_DAILY_LIMIT", "3"))
KDSQ_BY_ID = {item.get("id"): item for item in KDSQ_QUESTIONS if item.get("id")}
KDSQ_IDS = set(KDSQ_BY_ID.keys())

SHORT_CONTINUATION_REPLIES = {
    "그래",
    "네",
    "응",
    "음",
    "어",
    "맞아",
    "그렇지",
    "어려워",
    "힘들어",
}

CONCERN_KEYWORDS = [
    "걱정",
    "불안",
    "우울",
    "힘들",
    "외롭",
    "무섭",
    "속상",
    "답답",
    "슬프",
    "아프",
]

FAMILY_CONTACT_KEYWORDS = [
    "아들",
    "딸",
    "자식",
    "며느리",
    "사위",
    "손자",
    "손녀",
    "가족",
    "연락",
    "전화",
    "문자",
]

KDSQ_CONTEXT_KEYWORDS = {
    "memory": ["기억", "깜빡", "잊", "물건", "약속", "이름", "대화"],
    "orientation": ["날짜", "요일", "길", "방향", "헷갈", "잃"],
    "daily": ["계산", "돈", "거스름", "기구", "정리", "옷", "갈아입"],
    "social": ["대중교통", "버스", "지하철", "목적지", "외출"],
    "mood": ["성격", "기분", "화", "짜증", "우울"],
}

EXTERNAL_FACT_KEYWORDS = [
    "예약",
    "일정",
    "약속 시간",
    "몇 시",
    "몇시",
    "날씨",
    "뉴스",
    "전화번호",
    "주소",
    "영업시간",
    "버스 시간",
    "지하철 시간",
    "가격",
    "주가",
    "환율",
]

EXTERNAL_FACT_REQUEST_KEYWORDS = [
    "알려",
    "확인",
    "찾아",
    "몇",
    "언제",
    "어디",
    "바로",
    "전화번호",
    "주소",
    "어때",
]

FAMILY_PREDICTION_KEYWORDS = [
    "전화할까",
    "연락할까",
    "연락올까",
    "연락 올까",
    "전화올까",
    "전화 올까",
]

CONVERSATION_CLOSING_KEYWORDS = [
    "여기까지",
    "그만할",
    "그만 할",
    "마칠",
    "마무리",
    "쉬고 싶",
    "다음에",
]

KNOWLEDGE_BASE_QUERY_KEYWORDS = [
    "kdsq",
    "인지검사",
    "자가문진",
    "문진",
    "검사",
    "점수",
    "해석",
    "기준",
    "똑똑똑",
    "서비스",
    "음성",
    "stt",
    "transcribe",
    "polly",
    "bedrock",
    "보호자",
    "알림",
    "치매안심센터",
    "왜 물어",
    "왜 묻",
    "무슨 뜻",
    "뭐야",
    "무엇",
    "설명",
    "의미",
]


def _safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _recent_turns(session_id, limit=8):
    if not turns_table:
        return []
    try:
        resp = turns_table.query(
            KeyConditionExpression=Key("session_id").eq(session_id),
            ScanIndexForward=False,
            Limit=limit,
        )
    except Exception as exc:
        _logger.warning("Failed to load recent turns: %s", exc)
        return []

    items = list(reversed(resp.get("Items", [])))
    history = []
    for item in items:
        role = item.get("role")
        text = (item.get("text") or "").strip()
        if role not in {"user", "assistant"} or not text:
            continue
        history.append(
            {
                "role": role,
                "text": text,
                "tags": item.get("tags") or {},
            }
        )
    return history


def _is_kdsq_allowed(next_turn, last_kdsq_turn, asked_ids):
    if len(asked_ids) >= KDSQ_DAILY_LIMIT:
        return False
    if last_kdsq_turn < 0:
        return next_turn >= KDSQ_MIN_TURNS_BEFORE_FIRST
    return (next_turn - last_kdsq_turn) >= KDSQ_TURN_INTERVAL


def _valid_kdsq_item_id(value):
    return value == "NONE" or value in KDSQ_IDS


def _normalized(text):
    return (text or "").replace(" ", "").lower()


def _contains_any(text, keywords):
    normalized = _normalized(text)
    return any(keyword in normalized for keyword in keywords)


def _recent_user_texts(history, limit=2):
    user_texts = [item.get("text", "") for item in history if item.get("role") == "user"]
    return user_texts[-limit:]


def _kdsq_context_types(text):
    matched = []
    for kdsq_type, keywords in KDSQ_CONTEXT_KEYWORDS.items():
        if _contains_any(text, keywords):
            matched.append(kdsq_type)
    return matched


def _conversation_signals(transcript, recent_history, pending_kdsq_id):
    normalized = _normalized(transcript)
    recent_users = _recent_user_texts(recent_history, limit=2)
    short_continuation = normalized in SHORT_CONTINUATION_REPLIES or len(normalized) <= 2
    latest_family_contact_concern = _contains_any(transcript, FAMILY_CONTACT_KEYWORDS) and _contains_any(transcript, ["연락", "전화", "문자", "걱정", "안와", "없"])
    recent_family_contact_concern = any(
        _contains_any(text, FAMILY_CONTACT_KEYWORDS)
        and _contains_any(text, ["연락", "전화", "문자", "걱정", "안와", "없"])
        for text in recent_users
    )
    family_contact_concern = latest_family_contact_concern or (short_continuation and recent_family_contact_concern)
    emotional_concern = _contains_any(transcript, CONCERN_KEYWORDS)
    active_recent_concern = short_continuation and any(_contains_any(text, CONCERN_KEYWORDS) for text in recent_users)
    kdsq_context_types = _kdsq_context_types(transcript)

    deferred_reason = "NONE"
    if pending_kdsq_id:
        deferred_reason = "pending_kdsq_answer"
    elif short_continuation:
        deferred_reason = "short_continuation"
    elif family_contact_concern:
        deferred_reason = "active_family_contact_concern"
    elif emotional_concern and not kdsq_context_types:
        deferred_reason = "active_emotional_concern"
    elif active_recent_concern and not kdsq_context_types:
        deferred_reason = "recent_concern_followup"

    return {
        "short_continuation": short_continuation,
        "family_contact_concern": family_contact_concern,
        "emotional_concern": emotional_concern,
        "active_recent_concern": active_recent_concern,
        "kdsq_context_types": kdsq_context_types,
        "deferred_reason": deferred_reason,
    }


def _choose_kdsq_target(candidates, signals):
    if not candidates or signals["deferred_reason"] != "NONE":
        return None

    context_types = signals["kdsq_context_types"]
    if context_types:
        contextual_candidates = [q for q in candidates if q.get("type") in context_types]
        if contextual_candidates:
            return random.choice(contextual_candidates)

    return random.choice(candidates)


def _topic_guidance(signals):
    if signals["family_contact_concern"]:
        return (
            "The user is worried because a family member has not contacted them. "
            "Acknowledge the worry once, then ask when they last heard from that person or whether they want to try one more call/text. "
            "Do not suggest vague healing/rest and do not ask KDSQ on this turn."
        )
    if signals["short_continuation"]:
        return "The latest user message is a short continuation. Continue the previous topic and ask a clarifying question only if needed."
    if signals["emotional_concern"]:
        return "The user is sharing an emotional concern. Stay with that feeling and offer one concrete, gentle next step."
    return "No special topic constraint beyond staying natural and avoiding repeated phrasing."


def _conversation_closing_response(transcript):
    if not _contains_any(transcript, CONVERSATION_CLOSING_KEYWORDS):
        return None
    return "네, 오늘은 여기까지 이야기해요. 편하실 때 다시 오시면 제가 이어서 들어드릴게요."


def _unsupported_external_fact_response(transcript):
    if _contains_any(transcript, FAMILY_CONTACT_KEYWORDS) and _contains_any(transcript, FAMILY_PREDICTION_KEYWORDS):
        return "제가 가족분이 오늘 연락하실지는 알 수 없어요. 걱정되시면 짧게 안부 문자를 남기고, 급한 일이라면 가까운 가족이나 이웃에게 같이 확인을 부탁해보세요."

    if (
        _contains_any(transcript, EXTERNAL_FACT_KEYWORDS)
        and _contains_any(transcript, EXTERNAL_FACT_REQUEST_KEYWORDS)
    ):
        if _contains_any(transcript, ["예약", "일정", "약속 시간", "몇 시", "몇시"]):
            return "제가 이 앱 안에서는 병원 예약 시간이나 개인 일정을 확인할 수 없어요. 예약 문자나 병원 앱을 확인해보시고, 어려우시면 보호자에게 같이 확인을 부탁해보세요."
        if _contains_any(transcript, ["전화번호", "주소", "영업시간", "가까운"]):
            return "제가 여기서 현재 위치나 기관 연락처를 바로 조회할 수는 없어요. 지역명과 함께 치매안심센터를 검색하거나, 보호자에게 확인을 부탁해보는 게 안전해요."
        return "제가 여기서 실시간 정보는 확인할 수 없어요. 휴대폰 알림이나 공식 안내를 확인하고, 필요하면 보호자에게 같이 확인을 부탁해보세요."

    return None


def _forced_policy_response(transcript):
    closing = _conversation_closing_response(transcript)
    if closing:
        return closing, "conversation_closing"

    external_fact = _unsupported_external_fact_response(transcript)
    if external_fact:
        return external_fact, "unsupported_external_fact_guard"

    return None, None


def _should_use_knowledge_base(transcript, signals):
    if not knowledge_base_configured():
        return False, "knowledge_base_not_configured"
    if signals.get("short_continuation"):
        return False, "short_continuation"
    if _contains_any(transcript, KNOWLEDGE_BASE_QUERY_KEYWORDS):
        return True, "information_question"
    if signals.get("family_contact_concern"):
        return False, "active_family_contact_concern"
    return False, "not_information_question"


def _split_sentences(text):
    return [part.strip() for part in re.findall(r"[^.!?。？！]+[.!?。？！]?", text or "") if part.strip()]


def _drop_repeated_phrase_sentences(text, phrase):
    sentences = _split_sentences(text)
    if not sentences:
        return text
    seen = False
    kept = []
    for sentence in sentences:
        if phrase in sentence:
            if seen:
                continue
            seen = True
        kept.append(sentence)
    return " ".join(kept)


def _recent_assistant_text(recent_history, limit=4):
    assistant_texts = [item.get("text", "") for item in recent_history if item.get("role") == "assistant"]
    return " ".join(assistant_texts[-limit:])


def _asks_contact_timing(text):
    return _contains_any(text, FAMILY_CONTACT_KEYWORDS) and _contains_any(text, ["언제", "마지막", "최근"])


def _asked_contact_timing_recently(recent_history):
    recent_assistant = _recent_assistant_text(recent_history or [], limit=4)
    return _asks_contact_timing(recent_assistant)


def _continuation_fallback(transcript, signals, recent_history=None):
    recent_assistant = _normalized(_recent_assistant_text(recent_history or [], limit=4))

    def first_new(candidates):
        for candidate in candidates:
            if _normalized(candidate) not in recent_assistant:
                return candidate
        return candidates[-1]

    if signals and signals.get("family_contact_concern"):
        if signals.get("emotional_concern"):
            return first_new([
                "오늘 하루도 마음이 많이 가라앉으셨겠어요. 아드님 연락 문제는 혼자 끌어안지 말고, 조금 뒤 한 번 더 연락을 남기고 가까운 가족에게도 알려두세요.",
                "우울한 마음까지 겹쳐서 더 무겁게 느껴지셨겠어요. 저는 듣고 있을게요. 지금은 연락을 다시 남겨볼지, 다른 가족에게 먼저 말할지 하나만 정해봐요.",
            ])
        if "어려" in _normalized(transcript):
            return first_new([
                "어려우시군요. 혼자 해결하려 하지 마시고, 한 번 더 연락해본 뒤 가까운 가족이나 이웃에게 같이 확인을 부탁해보세요.",
                "쉽지 않으시죠. 지금은 혼자 끙끙대기보다 가까운 분께 같이 확인해달라고 부탁하는 게 좋겠어요.",
            ])
        normalized = _normalized(transcript)
        if normalized in {"그래", "네", "응", "맞아", "그렇지"}:
            return first_new([
                "네. 그 걱정이 계속 마음에 남아 있으시군요. 조금 있다가 다시 전화해볼지, 다른 가족에게 먼저 확인해볼지 같이 정해봐요.",
                "알겠어요. 지금은 조급하게 단정하지 말고, 마지막 연락 시간과 다시 연락해볼 시간을 하나씩 정해보면 좋겠어요.",
            ])
        if normalized in {"음", "어"}:
            return first_new([
                "잠깐 망설여지실 수 있어요. 지금은 한 번 더 연락을 남겨볼지, 가까운 가족에게 먼저 알려볼지 정해봐요.",
                "말을 고르기 어려우실 수 있어요. 저는 듣고 있을게요. 필요하면 가까운 분께 같이 확인을 부탁해보세요.",
            ])
        return first_new([
            "그렇군요. 계속 마음이 쓰이실 것 같아요. 급한 일이 걱정되면 한 번 더 전화해보고, 가까운 가족에게도 같이 확인해달라고 부탁해보세요.",
            "그 마음 이해돼요. 연락이 계속 닿지 않으면 한 번 더 문자나 전화를 남기고, 가까운 가족에게도 상황을 알려두세요.",
        ])
    if signals and signals.get("emotional_concern"):
        return first_new([
            "마음이 많이 무거우셨겠어요. 지금은 제가 곁에서 들어드릴게요.",
            "그런 날은 말하는 것만으로도 조금 버거울 수 있어요. 천천히 이어서 말씀해주세요.",
        ])
    return first_new([
        "그렇군요. 제가 곁에서 계속 들어드릴게요.",
        "네, 천천히 말씀해주세요. 제가 이어서 듣고 있을게요.",
    ])


def _has_contact_next_step(text):
    return _contains_any(text, ["전화", "문자", "확인", "마지막", "다른가족", "가까운가족", "부탁"])


def _polish_response_text(text, recent_history=None, transcript="", signals=None):
    polished = text
    for source, replacement in AWKWARD_PHRASE_REPLACEMENTS.items():
        polished = polished.replace(source, replacement)

    if recent_history:
        recent_assistant = _recent_assistant_text(recent_history)
        kept_sentences = []
        for sentence in _split_sentences(polished):
            if _normalized(sentence) and _normalized(sentence) in _normalized(recent_assistant):
                continue
            kept_sentences.append(sentence)
        polished = " ".join(kept_sentences)

    polished = " ".join(polished.split()).strip()
    polished = _drop_repeated_phrase_sentences(polished, "당연")
    if (
        signals
        and signals.get("family_contact_concern")
        and _asks_contact_timing(polished)
        and _asked_contact_timing_recently(recent_history)
    ):
        return _continuation_fallback(transcript, signals, recent_history)
    if signals and signals.get("family_contact_concern") and not signals.get("short_continuation"):
        latest_is_family_contact = _contains_any(transcript, FAMILY_CONTACT_KEYWORDS)
        if latest_is_family_contact and (not _contains_any(polished, FAMILY_CONTACT_KEYWORDS) or not _has_contact_next_step(polished)):
            return _continuation_fallback(transcript, signals, recent_history)
    if signals and signals.get("family_contact_concern") and "어려" in _normalized(transcript):
        return _continuation_fallback(transcript, signals, recent_history)

    if not polished and signals:
        return _continuation_fallback(transcript, signals, recent_history)
    return polished


def _append_contextual_kdsq(say, question):
    if not question:
        return say
    if question in say:
        return say
    if not say:
        return question
    return f"{say} {question}"


def _trim_knowledge_base_response(say, transcript):
    sentences = _split_sentences(say)
    if not sentences:
        return say
    if not _contains_any(transcript, FAMILY_CONTACT_KEYWORDS):
        sentences = [
            sentence for sentence in sentences
            if not (
                _contains_any(sentence, FAMILY_CONTACT_KEYWORDS)
                and _contains_any(sentence, ["연락", "전화", "마지막"])
            )
        ]
    return " ".join(sentences[:3])


def handler(event, _context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return json_response(400, {"message": "invalid_json"})

    session_id = (body.get("session_id") or "").strip()
    user_id = (body.get("user_id") or "").strip()
    transcript = (body.get("final_transcript") or "").strip()

    if not session_id or not user_id or not transcript:
        return json_response(400, {"message": "missing_required_fields"})

    user_ts = now_iso()
    session_item = sessions_table.get_item(Key={"session_id": session_id}).get("Item") or {}
    if not session_item:
        return json_response(404, {"message": "session_not_found"})
    try:
        require_user_access(event, user_id)
        require_session_access(event, session_item)
    except AuthError:
        return json_response(403, {"message": "forbidden"})

    pending_kdsq_id = session_item.get("pending_kdsq_item_id")
    pending_kdsq_question = session_item.get("pending_kdsq_question")
    last_kdsq_item_id = session_item.get("last_kdsq_item_id")
    turn_count = _safe_int(session_item.get("turn_count"), 0)
    last_kdsq_turn = _safe_int(session_item.get("last_kdsq_turn"), -1)
    today = user_ts.split("T")[0]
    asked_date = session_item.get("kdsq_asked_date")
    asked_ids = session_item.get("kdsq_asked_ids")
    if not isinstance(asked_ids, list):
        asked_ids = []
    if asked_date != today:
        asked_ids = []
    recent_kdsq_ids = []
    if user_id and kdsq_responses_table:
        now = datetime.now(timezone.utc)
        start_ts = (now - timedelta(days=6)).isoformat()
        end_ts = now.isoformat()
        resp = kdsq_responses_table.query(
            KeyConditionExpression=Key("user_id").eq(user_id) & Key("timestamp").between(start_ts, end_ts),
            ScanIndexForward=True,
        )
        recent_kdsq_ids = list({i.get("kdsq_item_id") for i in resp.get("Items", []) if i.get("kdsq_item_id")})
    recent_history = _recent_turns(session_id)
    conversation_signals = _conversation_signals(transcript, recent_history, pending_kdsq_id if pending_kdsq_id in KDSQ_IDS else None)

    kdsq_just_answered = False
    kdsq_just_answered_payload = None
    # If previous assistant asked a KDSQ question, store this user response only
    if pending_kdsq_id and pending_kdsq_id in KDSQ_IDS:
        kdsq_just_answered = True
        kdsq_just_answered_payload = {
            "question": pending_kdsq_question,
            "answer": transcript,
            "kdsq_item_id": pending_kdsq_id,
        }
        if kdsq_responses_table:
            kdsq_type = KDSQ_BY_ID[pending_kdsq_id].get("type", "")
            kdsq_responses_table.put_item(
                Item={
                    "user_id": user_id,
                    "timestamp": user_ts,
                    "session_id": session_id,
                    "kdsq_item_id": pending_kdsq_id,
                    "kdsq_type": kdsq_type,
                    "question": pending_kdsq_question,
                    "answer": transcript,
                    "expires_at": ttl_epoch(365),
                }
            )
        sessions_table.update_item(
            Key={"session_id": session_id},
            UpdateExpression="REMOVE pending_kdsq_item_id, pending_kdsq_question",
        )
    elif pending_kdsq_id:
        _logger.warning("Clearing invalid pending KDSQ id: %s", pending_kdsq_id)
        sessions_table.update_item(
            Key={"session_id": session_id},
            UpdateExpression="REMOVE pending_kdsq_item_id, pending_kdsq_question",
        )

    if turns_table:
        turns_table.put_item(
            Item={
                "session_id": session_id,
                "timestamp": user_ts,
                "role": "user",
                "text": transcript,
                "tags": {"kdsq_item_id": pending_kdsq_id if pending_kdsq_id in KDSQ_IDS else "NONE"},
                "expires_at": ttl_epoch(180),
            }
        )

    next_turn = turn_count + 1
    kdsq_allowed = _is_kdsq_allowed(next_turn, last_kdsq_turn, asked_ids)
    candidates = [
        q for q in KDSQ_QUESTIONS
        if q.get("id") not in asked_ids and q.get("id") not in recent_kdsq_ids
    ]
    kdsq_target = None
    if kdsq_allowed and candidates:
        kdsq_target = _choose_kdsq_target(candidates, conversation_signals)

    forced_say, forced_reason = _forced_policy_response(transcript)
    if forced_say:
        knowledge_context = {
            "configured": knowledge_base_configured(),
            "used": False,
            "results": [],
            "skipped_reason": forced_reason,
        }
    else:
        should_retrieve_kb, kb_skip_reason = _should_use_knowledge_base(transcript, conversation_signals)
        knowledge_context = retrieve_context(transcript) if should_retrieve_kb else {
            "configured": knowledge_base_configured(),
            "used": False,
            "results": [],
            "skipped_reason": kb_skip_reason,
        }

    prompt = {
        "prompt_version": PROMPT_VERSION,
        "task": "elder_companion_friend_with_natural_kdsq",
        "user_input": transcript,
        "conversation_history": recent_history,
        "knowledge_base": knowledge_context,
        "knowledge_base_policy": {
            "use_only_for_information_questions": True,
            "active_topic_has_priority": True,
            "instruction": (
                "If knowledge_base.used is true, ground factual explanations about KDSQ, self-assessment, "
                "guardian alerts, or service guidance in the retrieved snippets. If the snippets are insufficient, "
                "say that the app cannot confirm the detail from the available guide instead of inventing."
            ),
        },
        "kdsq_just_answered": kdsq_just_answered_payload,
        "recent_kdsq_item_id": last_kdsq_item_id,
        "exclude_kdsq_item_ids": list(set(asked_ids + recent_kdsq_ids)),
        "kdsq_target": kdsq_target,
        "kdsq_policy": {
            "basis": "KDSQ-inspired 15-item subjective cognitive decline screening. This service records conversation signals only and does not diagnose.",
            "should_ask_this_turn": bool(kdsq_target),
            "deferred_reason": conversation_signals["deferred_reason"],
            "min_turns_before_first": KDSQ_MIN_TURNS_BEFORE_FIRST,
            "turn_interval": KDSQ_TURN_INTERVAL,
            "daily_limit": KDSQ_DAILY_LIMIT,
            "asked_today_count": len(asked_ids),
            "instruction": "Stay on the user's active topic. If and only if should_ask_this_turn is true and deferred_reason is NONE, ask the kdsq_target.question naturally as the single follow-up.",
        },
        "conversation_signals": conversation_signals,
        "topic_guidance": _topic_guidance(conversation_signals),
        "response_strategy": [
            "Directly answer or acknowledge the user's latest utterance first.",
            "Continue the current concern instead of resetting to a generic daily check-in.",
            "Do not repeat a prior assistant sentence or question from conversation_history.",
            "Ask at most one follow-up question that is relevant to the user's latest topic.",
            "If KDSQ is asked, make it sound like a caring friend checking in, not a survey.",
            "For service/KDSQ explanation questions, use knowledge_base snippets when available and keep the answer concise.",
        ],
        "constraints": {
            "style": "polite_korean",
            "sentence_limit": 3,
            "max_questions": 1,
            "kdsq_injection_rate": f"after_turn_{KDSQ_MIN_TURNS_BEFORE_FIRST}_then_every_{KDSQ_TURN_INTERVAL}_turns",
            "kdsq_allowed": kdsq_allowed,
            "kdsq_contextual": True,
            "kdsq_no_repeat_last": True,
            "acknowledge_kdsq_answer_first": True,
            "conversation_mode": "balanced_dialogue",
            "question_ratio": "low",
            "stay_on_active_topic": True,
            "avoid_repeating_recent_assistant_text": True,
            "avoid_canned_phrases": ["힐링", "휴식하시고 힐링", "오늘 하루도 잘 마무리"],
            "no_diagnosis": True,
            "no_sensitive_requests": True,
            "no_fear_inducing": True,
            "no_self_harm": True,
            "no_financial_or_pii": True,
            "no_live_external_fact_hallucination": True,
            "kdsq_rephrase": True,
            "avoid_survey_tone": True,
            "explain_kdsq_naturally_if_asked": True,
            "use_knowledge_base_when_available": bool(knowledge_context.get("used")),
            "response_format": "json",
        },
        "kdsq_question_pool": [kdsq_target] if kdsq_target else [],
        "response_schema": {
            "say": "string",
            "tags": {
                "kdsq_item_id": "NONE or the exact kdsq_target.id only when the response actually asks that KDSQ question",
                "risk_hint": "NONE|concern",
            },
        },
    }

    fallback_reason = None
    if forced_say:
        model_resp = {
            "say": forced_say,
            "tags": {"kdsq_item_id": "NONE", "risk_hint": "NONE"},
        }
        metric_name = "UnsupportedExternalFactGuard" if forced_reason == "unsupported_external_fact_guard" else "ConversationClosingGuard"
        put_metric(metric_name)
    else:
        try:
            model_resp = invoke_chat(prompt)
        except Exception as exc:
            _logger.exception("Bedrock invoke failed: %s", exc)
            fallback_reason = "bedrock_exception"
            model_resp = {}
    say = (model_resp.get("say") or "").strip()
    tags = model_resp.get("tags") or {}
    kdsq_item_id = tags.get("kdsq_item_id", "NONE")
    risk_hint = tags.get("risk_hint", "NONE")
    if not _valid_kdsq_item_id(kdsq_item_id):
        _logger.warning("Invalid KDSQ tag returned by model: %s", kdsq_item_id)
        fallback_reason = fallback_reason or "invalid_kdsq_tag"
        kdsq_item_id = "NONE"
        tags["kdsq_item_id"] = "NONE"

    if kdsq_item_id != "NONE" and (not kdsq_target or kdsq_item_id != kdsq_target.get("id")):
        _logger.warning("KDSQ tag did not match current target; stripping KDSQ tag")
        fallback_reason = fallback_reason or "kdsq_target_mismatch_tag_stripped"
        kdsq_item_id = "NONE"
        tags["kdsq_item_id"] = "NONE"

    if not say:
        _logger.warning("Empty model response; using SAFE_FALLBACK")
        fallback_reason = fallback_reason or "empty_response"
        model_resp = SAFE_FALLBACK
        say = model_resp["say"]
        tags = model_resp["tags"]
        kdsq_item_id = tags["kdsq_item_id"]
        risk_hint = tags["risk_hint"]

    say = _polish_response_text(
        say,
        recent_history=recent_history,
        transcript=transcript,
        signals=conversation_signals,
    )
    if knowledge_context.get("used"):
        say = _trim_knowledge_base_response(say, transcript)

    if (
        not forced_say
        and kdsq_item_id == "NONE"
        and kdsq_target
        and conversation_signals.get("deferred_reason") == "NONE"
        and conversation_signals.get("kdsq_context_types")
    ):
        kdsq_question = kdsq_target.get("question", "")
        say = _append_contextual_kdsq(say, kdsq_question)
        if kdsq_question and kdsq_question in say:
            kdsq_item_id = kdsq_target.get("id", "NONE")
            tags["kdsq_item_id"] = kdsq_item_id

    if not say:
        _logger.warning("Response became empty after polishing; using SAFE_FALLBACK")
        fallback_reason = fallback_reason or "empty_after_polish"
        model_resp = SAFE_FALLBACK
        say = model_resp["say"]
        tags = model_resp["tags"]
        kdsq_item_id = tags["kdsq_item_id"]
        risk_hint = tags["risk_hint"]

    if not kdsq_allowed and kdsq_item_id != "NONE":
        _logger.warning("KDSQ not allowed this turn; stripping KDSQ tag")
        fallback_reason = fallback_reason or "kdsq_rate_limited_tag_stripped"
        kdsq_item_id = "NONE"
        tags["kdsq_item_id"] = "NONE"

    if kdsq_item_id in asked_ids or kdsq_item_id in recent_kdsq_ids:
        _logger.warning("KDSQ already asked recently; stripping KDSQ tag")
        fallback_reason = fallback_reason or "kdsq_duplicate_tag_stripped"
        kdsq_item_id = "NONE"
        tags["kdsq_item_id"] = "NONE"

    for banned in BANNED_PHRASES:
        if banned in say:
            _logger.warning("Banned phrase detected; using SAFE_FALLBACK")
            fallback_reason = fallback_reason or "diagnostic_phrase_guardrail"
            model_resp = SAFE_FALLBACK
            say = model_resp["say"]
            tags = model_resp["tags"]
            kdsq_item_id = tags["kdsq_item_id"]
            risk_hint = tags["risk_hint"]
            break

    for banned in SAFETY_ALERT_PHRASES:
        if banned in say:
            _logger.warning("Safety phrase detected; using SAFETY_FALLBACK")
            fallback_reason = fallback_reason or "safety_phrase_guardrail"
            model_resp = SAFETY_FALLBACK
            say = model_resp["say"]
            tags = model_resp["tags"]
            kdsq_item_id = tags["kdsq_item_id"]
            risk_hint = tags["risk_hint"]
            break

    for banned in SENSITIVE_REQUEST_PHRASES:
        if banned in say:
            _logger.warning("Sensitive request phrase detected; using SAFE_FALLBACK")
            fallback_reason = fallback_reason or "sensitive_request_guardrail"
            model_resp = SAFE_FALLBACK
            say = model_resp["say"]
            tags = model_resp["tags"]
            kdsq_item_id = tags["kdsq_item_id"]
            risk_hint = tags["risk_hint"]
            break

    if kdsq_item_id and kdsq_item_id != "NONE":
        # enforce daily max KDSQ count without throwing away the useful answer text
        if len(asked_ids) >= KDSQ_DAILY_LIMIT:
            _logger.warning("Daily KDSQ limit reached; stripping KDSQ tag")
            fallback_reason = fallback_reason or "daily_kdsq_limit"
            kdsq_item_id = "NONE"
            tags["kdsq_item_id"] = "NONE"

        if kdsq_item_id and kdsq_item_id != "NONE":
            try:
                kdsq_type = KDSQ_BY_ID.get(kdsq_item_id, {}).get("type", "unknown")
                sessions_table.update_item(
                    Key={"session_id": session_id},
                    UpdateExpression=(
                        "SET kdsq_injected_count_by_type.#k = if_not_exists(kdsq_injected_count_by_type.#k, :zero) + :one, "
                        "pending_kdsq_item_id = :kdsq_id, pending_kdsq_question = :q, last_kdsq_turn = :turn_count, "
                        "turn_count = :turn_count, last_kdsq_item_id = :kdsq_item_id, "
                        "kdsq_asked_date = :asked_date, "
                        "kdsq_asked_ids = list_append(if_not_exists(kdsq_asked_ids, :empty), :new_id)"
                    ),
                    ExpressionAttributeNames={"#k": kdsq_type},
                    ExpressionAttributeValues={
                        ":zero": 0,
                        ":one": 1,
                        ":kdsq_id": kdsq_item_id,
                        ":q": say,
                        ":turn_count": next_turn,
                        ":kdsq_item_id": kdsq_item_id,
                        ":asked_date": today,
                        ":empty": [],
                        ":new_id": [kdsq_item_id],
                    },
                )
            except Exception as exc:
                _logger.exception("Session update failed: %s", exc)
                sessions_table.update_item(
                    Key={"session_id": session_id},
                    UpdateExpression="SET turn_count = :turn_count",
                    ExpressionAttributeValues={":turn_count": next_turn},
                )
        else:
            sessions_table.update_item(
                Key={"session_id": session_id},
                UpdateExpression="SET turn_count = :turn_count",
                ExpressionAttributeValues={":turn_count": next_turn},
            )
    else:
        sessions_table.update_item(
            Key={"session_id": session_id},
            UpdateExpression="SET turn_count = :turn_count",
            ExpressionAttributeValues={":turn_count": next_turn},
        )

    assistant_ts = now_iso()
    if turns_table:
        turns_table.put_item(
            Item={
                "session_id": session_id,
                "timestamp": assistant_ts,
                "role": "assistant",
                "text": say,
                "tags": {
                    "kdsq_item_id": kdsq_item_id,
                    "risk_hint": risk_hint,
                    "prompt_version": PROMPT_VERSION,
                    "knowledge_base_used": knowledge_context.get("used", False),
                    "knowledge_base_skipped_reason": knowledge_context.get("skipped_reason", "NONE"),
                },
                "expires_at": ttl_epoch(180),
            }
        )

    if fallback_reason:
        put_metric("ModelFallback", dimensions={"Reason": fallback_reason})

    audio = synthesize_to_s3(say)

    return json_response(200, {
        "assistant_text": say,
        "audio": audio,
        "tags": {
            "kdsq_item_id": kdsq_item_id,
            "risk_hint": risk_hint,
            "prompt_version": PROMPT_VERSION,
            "knowledge_base_used": knowledge_context.get("used", False),
            "knowledge_base_skipped_reason": knowledge_context.get("skipped_reason", "NONE"),
            "knowledge_base_sources": [
                result.get("source")
                for result in knowledge_context.get("results", [])
                if result.get("source")
            ][:3],
        },
    })
