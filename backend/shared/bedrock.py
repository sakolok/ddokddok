import json
import os
import logging
import boto3
from botocore.exceptions import ClientError
from .utils import env_bool
from .metrics import put_metric

_bedrock = boto3.client("bedrock-runtime")
MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "")
FALLBACK_MODEL_ID = os.getenv("BEDROCK_FALLBACK_MODEL_ID", "apac.amazon.nova-lite-v1:0")
MOCK_LLM = env_bool("MOCK_LLM", default=True)
_logger = logging.getLogger(__name__)
_logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

SAFE_MOCK_RESPONSE = {
    "say": "제가 지금 답을 준비하는 연결이 불안정해요. 방금 말씀을 한 번만 다시 들려주시면 바로 이어서 대화할게요.",
    "tags": {
        "kdsq_item_id": "NONE",
        "risk_hint": "NONE",
    },
}


SYSTEM_PROMPT = (
    "You are 삐약이, a warm Korean AI companion for an older adult. "
    "Return JSON only and match the schema exactly. "
    "Priority order: first answer or acknowledge the user's latest utterance directly; "
    "then add one short empathetic reflection; then ask at most one gentle follow-up that stays on the active topic. "
    "Use conversation_history to avoid repeating your previous sentence, advice, or question. "
    "If the user is worried about a family member not contacting them, stay with that concern and ask one practical, natural question such as when they last heard from them or whether another trusted person can be contacted. "
    "Do not invent family-role titles for the user; avoid calling the user 엄마님, 아버님, 어르신, or 환자 unless the user used that exact title for themselves. "
    "Do not use canned wellness phrases such as 힐링, 휴식하시고 힐링, or generic rest advice unless the user asks for rest. "
    "If the user's latest utterance is a short backchannel or answer such as 그래, 네, 음, or 어려워, treat it as a continuation of the previous topic; do not introduce a new topic. "
    "If kdsq_policy.should_ask_this_turn is true, you may naturally weave the provided "
    "kdsq_target.question into the follow-up after answering the user. "
    "If kdsq_policy.deferred_reason is not NONE, do not ask KDSQ even indirectly. "
    "If the user asked a direct information/help question, do not skip the answer just to ask KDSQ. "
    "If knowledge_base.used is true, use the retrieved snippets as the factual basis for KDSQ, self-assessment, guardian-alert, or service-guide explanations; do not invent details beyond those snippets. "
    "If knowledge_base.used is false or the snippets are insufficient, answer from the conversation policy only and clearly avoid unsupported medical or service claims. "
    "Do not pretend to know live external facts such as weather, news, appointments, prices, or schedules; "
    "if the information is not in the conversation, say you cannot check it here and suggest a safe next step. "
    "Use the exact kdsq_target.id only when your 'say' actually includes that KDSQ question; otherwise use NONE. "
    "Never diagnose, label the user as having dementia/depression, request money, passwords, OTPs, or personal IDs. "
    "Keep Korean plain, friendly, and concise."
)


def _extract_json(text):
    if not text:
        return {}
    text = text.strip()
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Try to extract the first JSON object from a mixed response
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return {}
    snippet = text[start:end + 1]
    try:
        return json.loads(snippet)
    except json.JSONDecodeError:
        return {}


def _invoke_messages(prompt_json, model_id=MODEL_ID):
    if MOCK_LLM or not model_id:
        return SAFE_MOCK_RESPONSE

    user_text = json.dumps(prompt_json, ensure_ascii=False)
    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "system": SYSTEM_PROMPT,
            "max_tokens": 512,
            "temperature": 0.3,
            "messages": [
                {
                    "role": "user",
                    "content": [{"type": "text", "text": user_text}],
                }
            ],
        },
        ensure_ascii=False,
    )
    resp = _bedrock.invoke_model(
        modelId=model_id,
        body=body,
        contentType="application/json",
        accept="application/json",
    )
    payload = json.loads(resp["body"].read())

    content_blocks = payload.get("content", [])
    text = "".join(
        block.get("text", "")
        for block in content_blocks
        if isinstance(block, dict) and block.get("type") == "text"
    ).strip()
    if not text:
        _logger.warning("Bedrock response had no text content")
        put_metric("BedrockResponseInvalid", dimensions={"Reason": "empty_messages_content"})
        return {}

    parsed = _extract_json(text)
    if not parsed:
        _logger.warning("Bedrock response JSON parse failed (messages)")
        put_metric("BedrockResponseInvalid", dimensions={"Reason": "json_parse_messages"})
    return parsed


def _invoke_prompt(prompt_json, model_id=MODEL_ID):
    if MOCK_LLM or not model_id:
        return SAFE_MOCK_RESPONSE

    user_text = json.dumps(prompt_json, ensure_ascii=False)
    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"Human: {user_text}\n\nAssistant:"
    )
    body = json.dumps(
        {
            "prompt": prompt,
            "max_tokens_to_sample": 512,
            "temperature": 0.3,
            "stop_sequences": ["\n\nHuman:"],
        },
        ensure_ascii=False,
    )
    resp = _bedrock.invoke_model(
        modelId=model_id,
        body=body,
        contentType="application/json",
        accept="application/json",
    )
    payload = json.loads(resp["body"].read())
    text = (payload.get("completion") or "").strip()
    if not text:
        _logger.warning("Bedrock response had no completion text")
        put_metric("BedrockResponseInvalid", dimensions={"Reason": "empty_prompt_completion"})
        return {}
    parsed = _extract_json(text)
    if not parsed:
        _logger.warning("Bedrock response JSON parse failed (prompt)")
        put_metric("BedrockResponseInvalid", dimensions={"Reason": "json_parse_prompt"})
    return parsed


def _invoke_nova(prompt_json, model_id=MODEL_ID):
    if MOCK_LLM or not model_id:
        return SAFE_MOCK_RESPONSE

    user_text = json.dumps(prompt_json, ensure_ascii=False)
    body = json.dumps(
        {
            "system": [{"text": SYSTEM_PROMPT}],
            "messages": [
                {
                    "role": "user",
                    "content": [{"text": user_text}],
                }
            ],
            "inferenceConfig": {
                "maxTokens": 512,
                "temperature": 0.3,
            },
        },
        ensure_ascii=False,
    )
    resp = _bedrock.invoke_model(
        modelId=model_id,
        body=body,
        contentType="application/json",
        accept="application/json",
    )
    payload = json.loads(resp["body"].read())
    content_list = (
        payload.get("output", {})
        .get("message", {})
        .get("content", [])
    )
    text_block = next(
        (item for item in content_list if isinstance(item, dict) and "text" in item),
        None,
    )
    text = (text_block.get("text") if text_block else "").strip()
    if not text:
        _logger.warning("Bedrock response had no text content (nova)")
        put_metric("BedrockResponseInvalid", dimensions={"Reason": "empty_nova_content"})
        return {}
    parsed = _extract_json(text)
    if not parsed:
        _logger.warning("Bedrock response JSON parse failed (nova)")
        put_metric("BedrockResponseInvalid", dimensions={"Reason": "json_parse_nova"})
    return parsed


def invoke_chat(prompt_json):
    if MOCK_LLM or not MODEL_ID:
        return SAFE_MOCK_RESPONSE

    def invoke_with_model(model_id):
        if "nova" in model_id:
            return _invoke_nova(prompt_json, model_id=model_id)
        return _invoke_messages(prompt_json, model_id=model_id)

    if "nova" in MODEL_ID:
        return _invoke_nova(prompt_json, model_id=MODEL_ID)

    try:
        return _invoke_messages(prompt_json, model_id=MODEL_ID)
    except ClientError as exc:
        message = str(exc)
        _logger.error("Bedrock invoke_model error: %s", message)
        put_metric("BedrockInvokeError")
        if "messages: Field required" in message or "required key [prompt]" in message:
            return _invoke_prompt(prompt_json, model_id=MODEL_ID)
        if FALLBACK_MODEL_ID and FALLBACK_MODEL_ID != MODEL_ID:
            _logger.warning("Retrying Bedrock with fallback model: %s", FALLBACK_MODEL_ID)
            put_metric("BedrockFallbackModelUsed")
            return invoke_with_model(FALLBACK_MODEL_ID)
        raise
