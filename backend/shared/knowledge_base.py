import logging
import os

import boto3
from botocore.exceptions import ClientError

from .metrics import put_metric

_logger = logging.getLogger(__name__)
_logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

_agent_runtime = boto3.client("bedrock-agent-runtime")

KNOWLEDGE_BASE_ID = os.getenv("KNOWLEDGE_BASE_ID", "").strip()
MAX_RESULTS = int(os.getenv("KNOWLEDGE_BASE_MAX_RESULTS", "3"))
MIN_SCORE = float(os.getenv("KNOWLEDGE_BASE_MIN_SCORE", "0.35"))


def is_configured():
    return bool(KNOWLEDGE_BASE_ID)


def _content_text(content):
    if not isinstance(content, dict):
        return ""
    text = content.get("text")
    if text:
        return str(text).strip()
    byte_content = content.get("byteContent")
    if isinstance(byte_content, str):
        return byte_content.strip()
    return ""


def _source_uri(location):
    if not isinstance(location, dict):
        return ""
    for value in location.values():
        if not isinstance(value, dict):
            continue
        for key in ("uri", "s3Uri", "url"):
            if value.get(key):
                return str(value[key])
    return ""


def retrieve_context(query):
    if not is_configured():
        return {
            "configured": False,
            "used": False,
            "results": [],
            "skipped_reason": "knowledge_base_not_configured",
        }

    try:
        response = _agent_runtime.retrieve(
            knowledgeBaseId=KNOWLEDGE_BASE_ID,
            retrievalQuery={"text": query},
            retrievalConfiguration={
                "vectorSearchConfiguration": {
                    "numberOfResults": MAX_RESULTS,
                }
            },
        )
    except ClientError as exc:
        _logger.warning("Knowledge Base retrieve failed: %s", exc)
        put_metric("KnowledgeBaseRetrieveFailure", dimensions={"Reason": exc.response.get("Error", {}).get("Code")})
        return {
            "configured": True,
            "used": False,
            "results": [],
            "skipped_reason": "retrieve_failed",
        }
    except Exception as exc:
        _logger.warning("Knowledge Base retrieve failed: %s", exc)
        put_metric("KnowledgeBaseRetrieveFailure", dimensions={"Reason": "exception"})
        return {
            "configured": True,
            "used": False,
            "results": [],
            "skipped_reason": "retrieve_failed",
        }

    results = []
    for item in response.get("retrievalResults", []):
        score = float(item.get("score") or 0)
        if score < MIN_SCORE:
            continue
        text = _content_text(item.get("content"))
        if not text:
            continue
        results.append(
            {
                "text": text[:1200],
                "score": score,
                "source": _source_uri(item.get("location")),
            }
        )

    if results:
        put_metric("KnowledgeBaseRetrieveSuccess")
    else:
        put_metric("KnowledgeBaseRetrieveEmpty")

    return {
        "configured": True,
        "used": bool(results),
        "results": results,
        "skipped_reason": "no_relevant_results" if not results else "NONE",
    }
