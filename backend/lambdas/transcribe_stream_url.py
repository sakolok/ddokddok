import json
import logging
import os
import uuid
from urllib.parse import urlencode

import boto3
from botocore.auth import SigV4QueryAuth
from botocore.awsrequest import AWSRequest

from shared.auth import AuthError, require_user_access
from shared.metrics import put_metric
from shared.response import json_response

_logger = logging.getLogger(__name__)
_logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

REGION = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION", "ap-northeast-2")
LANGUAGE_CODE = os.getenv("TRANSCRIBE_LANGUAGE_CODE", "ko-KR")
SAMPLE_RATE = int(os.getenv("TRANSCRIBE_STREAM_SAMPLE_RATE", "16000"))
EXPIRES_IN = int(os.getenv("TRANSCRIBE_STREAM_URL_EXPIRES", "300"))
MEDIA_ENCODING = "pcm"

_session = boto3.Session()


def _build_stream_url():
    query = urlencode(
        {
            "language-code": LANGUAGE_CODE,
            "media-encoding": MEDIA_ENCODING,
            "sample-rate": str(SAMPLE_RATE),
            "session-id": str(uuid.uuid4()),
            "enable-partial-results-stabilization": "true",
            "partial-results-stability": "medium",
        }
    )
    endpoint = (
        f"https://transcribestreaming.{REGION}.amazonaws.com:8443"
        f"/stream-transcription-websocket?{query}"
    )
    credentials = _session.get_credentials()
    if not credentials:
        raise RuntimeError("missing_aws_credentials")

    request = AWSRequest(method="GET", url=endpoint)
    SigV4QueryAuth(credentials.get_frozen_credentials(), "transcribe", REGION, expires=EXPIRES_IN).add_auth(request)
    return request.url.replace("https://", "wss://", 1)


def handler(event, _context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return json_response(400, {"message": "invalid_json"})

    user_id = (body.get("user_id") or "").strip()
    if not user_id:
        return json_response(400, {"message": "missing_required_fields"})

    try:
        require_user_access(event, user_id)
    except AuthError:
        return json_response(403, {"message": "forbidden"})

    try:
        url = _build_stream_url()
        put_metric("TranscribeStreamUrlIssued")
        return json_response(
            200,
            {
                "url": url,
                "language_code": LANGUAGE_CODE,
                "media_encoding": MEDIA_ENCODING,
                "sample_rate": SAMPLE_RATE,
                "expires_in": EXPIRES_IN,
            },
        )
    except Exception as exc:
        _logger.exception("Failed to create Transcribe streaming URL: %s", exc)
        put_metric("TranscribeFailure", dimensions={"Reason": "stream_url"})
        return json_response(500, {"message": "transcribe_stream_url_error"})
