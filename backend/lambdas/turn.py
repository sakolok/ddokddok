import json
import os
import logging
import random
from datetime import datetime, timedelta, timezone
from boto3.dynamodb.conditions import Key
from shared.response import json_response
from shared.utils import now_iso
from shared.ddb import turns_table, sessions_table, kdsq_responses_table
from shared.bedrock import invoke_chat
from shared.polly import synthesize_to_s3
from shared.kdsq_questions import KDSQ_QUESTIONS

SAFE_FALLBACK = {
    "say": "오늘 하루 중에 가장 좋았던 순간을 알려주실 수 있을까요?",
    "tags": {"kdsq_item_id": "NONE", "risk_hint": "NONE"},
}

BANNED_PHRASES = [
    "치매입니다",
    "우울증입니다",
    "진단",
    "확정",
]

_logger = logging.getLogger(__name__)
_logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))


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
    pending_kdsq_id = session_item.get("pending_kdsq_item_id")
    pending_kdsq_question = session_item.get("pending_kdsq_question")
    last_kdsq_item_id = session_item.get("last_kdsq_item_id")
    turn_count = int(session_item.get("turn_count", 0))
    last_kdsq_turn = int(session_item.get("last_kdsq_turn", -999))
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

    kdsq_just_answered = False
    kdsq_just_answered_payload = None
    # If previous assistant asked a KDSQ question, store this user response only
    if pending_kdsq_id:
        kdsq_just_answered = True
        kdsq_just_answered_payload = {
            "question": pending_kdsq_question,
            "answer": transcript,
            "kdsq_item_id": pending_kdsq_id,
        }
        if turns_table:
            turns_table.put_item(
                Item={
                    "session_id": session_id,
                    "timestamp": user_ts,
                    "role": "user",
                    "text": transcript,
                    "tags": {"kdsq_item_id": pending_kdsq_id},
                }
            )
        if kdsq_responses_table:
            kdsq_type = ""
            if "_" in pending_kdsq_id:
                kdsq_type = pending_kdsq_id.split("_", 1)[0]
            kdsq_responses_table.put_item(
                Item={
                    "user_id": user_id,
                    "timestamp": user_ts,
                    "session_id": session_id,
                    "kdsq_item_id": pending_kdsq_id,
                    "kdsq_type": kdsq_type,
                    "question": pending_kdsq_question,
                    "answer": transcript,
                }
            )
        sessions_table.update_item(
            Key={"session_id": session_id},
            UpdateExpression="REMOVE pending_kdsq_item_id, pending_kdsq_question",
        )

    next_turn = turn_count + 1
    kdsq_allowed = (next_turn - last_kdsq_turn) >= 8
    candidates = [
        q for q in KDSQ_QUESTIONS
        if q.get("id") not in asked_ids and q.get("id") not in recent_kdsq_ids
    ]
    kdsq_target = None
    if kdsq_allowed and len(asked_ids) < 3 and candidates:
        kdsq_target = random.choice(candidates)

    prompt = {
        "task": "elder_companion",
        "user_input": transcript,
        "kdsq_just_answered": kdsq_just_answered_payload,
        "recent_kdsq_item_id": last_kdsq_item_id,
        "exclude_kdsq_item_ids": list(set(asked_ids + recent_kdsq_ids)),
        "kdsq_target": kdsq_target,
        "constraints": {
            "style": "polite_korean",
            "sentence_limit": 2,
            "max_questions": 1,
            "kdsq_injection_rate": "1_per_5_7_turns",
            "kdsq_allowed": kdsq_allowed,
            "kdsq_contextual": True,
            "kdsq_no_repeat_last": True,
            "acknowledge_kdsq_answer_first": True,
            "conversation_mode": "balanced_dialogue",
            "question_ratio": "low",
            "no_diagnosis": True,
            "no_sensitive_requests": True,
            "no_fear_inducing": True,
            "kdsq_rephrase": True,
            "avoid_survey_tone": True,
            "explain_kdsq_naturally_if_asked": True,
            "response_format": "json",
        },
        "kdsq_question_pool": KDSQ_QUESTIONS,
        "response_schema": {
            "say": "string",
            "tags": {
                "kdsq_item_id": "NONE|orientation|memory|mood|social|daily",
                "risk_hint": "NONE|concern",
            },
        },
    }

    try:
        model_resp = invoke_chat(prompt)
    except Exception as exc:
        _logger.exception("Bedrock invoke failed: %s", exc)
        model_resp = {}
    say = (model_resp.get("say") or "").strip()
    tags = model_resp.get("tags") or {}
    kdsq_item_id = tags.get("kdsq_item_id", "NONE")
    risk_hint = tags.get("risk_hint", "NONE")

    if not say:
        _logger.warning("Empty model response; using SAFE_FALLBACK")
        model_resp = SAFE_FALLBACK
        say = model_resp["say"]
        tags = model_resp["tags"]
        kdsq_item_id = tags["kdsq_item_id"]
        risk_hint = tags["risk_hint"]

    if not kdsq_allowed and kdsq_item_id != "NONE":
        _logger.warning("KDSQ not allowed this turn; overriding to SAFE_FALLBACK")
        model_resp = SAFE_FALLBACK
        say = model_resp["say"]
        tags = model_resp["tags"]
        kdsq_item_id = tags["kdsq_item_id"]
        risk_hint = tags["risk_hint"]

    if kdsq_item_id in asked_ids or kdsq_item_id in recent_kdsq_ids:
        _logger.warning("KDSQ already asked recently; overriding to SAFE_FALLBACK")
        model_resp = SAFE_FALLBACK
        say = model_resp["say"]
        tags = model_resp["tags"]
        kdsq_item_id = tags["kdsq_item_id"]
        risk_hint = tags["risk_hint"]

    if kdsq_target and (not kdsq_item_id or kdsq_item_id == "NONE"):
        kdsq_item_id = kdsq_target.get("id", "NONE")

    for banned in BANNED_PHRASES:
        if banned in say:
            _logger.warning("Banned phrase detected; using SAFE_FALLBACK")
            model_resp = SAFE_FALLBACK
            say = model_resp["say"]
            tags = model_resp["tags"]
            kdsq_item_id = tags["kdsq_item_id"]
            risk_hint = tags["risk_hint"]
            break

    assistant_ts = now_iso()
    if kdsq_item_id and kdsq_item_id != "NONE" and turns_table:
        turns_table.put_item(
            Item={
                "session_id": session_id,
                "timestamp": assistant_ts,
                "role": "assistant",
                "text": say,
                "tags": {"kdsq_item_id": kdsq_item_id},
            }
        )

    if kdsq_item_id and kdsq_item_id != "NONE":
        # enforce daily max 3 KDSQ
        if len(asked_ids) >= 3:
            _logger.warning("Daily KDSQ limit reached; overriding to SAFE_FALLBACK")
            model_resp = SAFE_FALLBACK
            say = model_resp["say"]
            tags = model_resp["tags"]
            kdsq_item_id = tags["kdsq_item_id"]
            risk_hint = tags["risk_hint"]

        if kdsq_item_id and kdsq_item_id != "NONE":
            try:
                sessions_table.update_item(
                    Key={"session_id": session_id},
                    UpdateExpression=(
                        "SET kdsq_injected_count_by_type.#k = if_not_exists(kdsq_injected_count_by_type.#k, :zero) + :one, "
                        "pending_kdsq_item_id = :kdsq_id, pending_kdsq_question = :q, last_kdsq_turn = :turn_count, "
                        "turn_count = :turn_count, last_kdsq_item_id = :kdsq_item_id, "
                        "kdsq_asked_date = :asked_date, "
                    "kdsq_asked_ids = list_append(if_not_exists(kdsq_asked_ids, :empty), :new_id)"
                ),
                ExpressionAttributeNames={"#k": kdsq_item_id},
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

    audio = synthesize_to_s3(say)

    return json_response(200, {
        "assistant_text": say,
        "audio": audio,
        "tags": {"kdsq_item_id": kdsq_item_id, "risk_hint": risk_hint},
    })
