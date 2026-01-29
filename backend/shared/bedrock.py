import json
import os
import logging
import boto3
from botocore.exceptions import ClientError
from .utils import env_bool

_bedrock = boto3.client("bedrock-runtime")
MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "")
MOCK_LLM = env_bool("MOCK_LLM", default=True)
_logger = logging.getLogger(__name__)
_logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

SAFE_MOCK_RESPONSE = {
    "say": "오늘 하루는 어떠셨어요? 요즘 즐겨 듣는 노래가 있으신가요?",
    "tags": {
        "kdsq_item_id": "NONE",
        "risk_hint": "NONE",
    },
}

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


def _invoke_messages(prompt_json):
    if MOCK_LLM or not MODEL_ID:
        return SAFE_MOCK_RESPONSE

    system = (
        "You are a helpful assistant. Respond with JSON only, matching the given schema. "
        "Do not include markdown or extra text."
    )
    user_text = json.dumps(prompt_json, ensure_ascii=False)
    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "system": system,
            "max_tokens": 512,
            "temperature": 0.4,
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
        modelId=MODEL_ID,
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
        return {}

    parsed = _extract_json(text)
    if not parsed:
        _logger.warning("Bedrock response JSON parse failed (messages)")
    return parsed


def _invoke_prompt(prompt_json):
    if MOCK_LLM or not MODEL_ID:
        return SAFE_MOCK_RESPONSE

    user_text = json.dumps(prompt_json, ensure_ascii=False)
    prompt = (
        "You are a helpful assistant. Respond with JSON only, matching the given schema. "
        "Do not include markdown or extra text.\n\n"
        f"Human: {user_text}\n\nAssistant:"
    )
    body = json.dumps(
        {
            "prompt": prompt,
            "max_tokens_to_sample": 512,
            "temperature": 0.4,
            "stop_sequences": ["\n\nHuman:"],
        },
        ensure_ascii=False,
    )
    resp = _bedrock.invoke_model(
        modelId=MODEL_ID,
        body=body,
        contentType="application/json",
        accept="application/json",
    )
    payload = json.loads(resp["body"].read())
    text = (payload.get("completion") or "").strip()
    if not text:
        _logger.warning("Bedrock response had no completion text")
        return {}
    parsed = _extract_json(text)
    if not parsed:
        _logger.warning("Bedrock response JSON parse failed (prompt)")
    return parsed


def _invoke_nova(prompt_json):
    if MOCK_LLM or not MODEL_ID:
        return SAFE_MOCK_RESPONSE

    system_text = (
        "You are a helpful assistant. Respond with JSON only, matching the given schema. "
        "Do not include markdown or extra text."
    )
    user_text = json.dumps(prompt_json, ensure_ascii=False)
    body = json.dumps(
        {
            "system": [{"text": system_text}],
            "messages": [
                {
                    "role": "user",
                    "content": [{"text": user_text}],
                }
            ],
            "inferenceConfig": {
                "maxTokens": 512,
                "temperature": 0.4,
            },
        },
        ensure_ascii=False,
    )
    resp = _bedrock.invoke_model(
        modelId=MODEL_ID,
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
        return {}
    parsed = _extract_json(text)
    if not parsed:
        _logger.warning("Bedrock response JSON parse failed (nova)")
    return parsed


def invoke_chat(prompt_json):
    if MOCK_LLM or not MODEL_ID:
        return SAFE_MOCK_RESPONSE

    if "nova" in MODEL_ID:
        return _invoke_nova(prompt_json)

    try:
        return _invoke_messages(prompt_json)
    except ClientError as exc:
        message = str(exc)
        _logger.error("Bedrock invoke_model error: %s", message)
        if "messages: Field required" in message or "required key [prompt]" in message:
            return _invoke_prompt(prompt_json)
        raise
