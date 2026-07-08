import base64
import binascii
import json
import logging
import os
import time
import uuid
from urllib.parse import unquote, urlparse

import boto3
from botocore.exceptions import ClientError

from shared.auth import AuthError, require_user_access
from shared.metrics import put_metric
from shared.response import json_response

_s3 = boto3.client("s3")
_transcribe = boto3.client("transcribe")
_logger = logging.getLogger(__name__)
_logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

BUCKET = os.getenv("POLLY_BUCKET")
LANGUAGE_CODE = os.getenv("TRANSCRIBE_LANGUAGE_CODE", "ko-KR")
MAX_AUDIO_BYTES = int(os.getenv("TRANSCRIBE_MAX_AUDIO_BYTES", str(6 * 1024 * 1024)))
POLL_SECONDS = int(os.getenv("TRANSCRIBE_POLL_SECONDS", "22"))

SUPPORTED_MEDIA = {
    "audio/webm": "webm",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
}


def _media_format(content_type):
    normalized = (content_type or "audio/webm").split(";", 1)[0].lower().strip()
    return SUPPORTED_MEDIA.get(normalized), normalized


def _decode_audio(audio_base64):
    payload = (audio_base64 or "").strip()
    if not payload:
        raise ValueError("missing_audio")
    if "," in payload:
        payload = payload.split(",", 1)[1]
    try:
        return base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("invalid_audio_base64") from exc


def _read_transcript_from_s3(output_key, job):
    candidate_keys = [output_key]
    transcript_uri = (((job or {}).get("Transcript") or {}).get("TranscriptFileUri") or "")
    if transcript_uri:
        parsed = urlparse(transcript_uri)
        path = unquote(parsed.path.lstrip("/"))
        if path.startswith(f"{BUCKET}/"):
            path = path[len(BUCKET) + 1:]
        if path and path not in candidate_keys:
            candidate_keys.append(path)

    last_error = None
    for key in candidate_keys:
        try:
            obj = _s3.get_object(Bucket=BUCKET, Key=key)
            doc = json.loads(obj["Body"].read().decode("utf-8"))
            transcripts = ((doc.get("results") or {}).get("transcripts") or [])
            if transcripts:
                return (transcripts[0].get("transcript") or "").strip()
            return ""
        except ClientError as exc:
            last_error = exc
            continue
    if last_error:
        raise last_error
    return ""


def handler(event, _context):
    if not BUCKET:
        put_metric("TranscribeFailure", dimensions={"Reason": "missing_bucket"})
        return json_response(500, {"message": "transcribe_bucket_not_configured"})

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return json_response(400, {"message": "invalid_json"})

    user_id = (body.get("user_id") or "").strip()
    session_id = (body.get("session_id") or "").strip()
    content_type = (body.get("content_type") or "audio/webm").strip()
    media_format, normalized_content_type = _media_format(content_type)

    if not user_id or not body.get("audio_base64"):
        return json_response(400, {"message": "missing_required_fields"})
    if not media_format:
        return json_response(415, {"message": "unsupported_audio_type"})

    try:
        require_user_access(event, user_id)
    except AuthError:
        return json_response(403, {"message": "forbidden"})

    try:
        audio_bytes = _decode_audio(body.get("audio_base64"))
    except ValueError as exc:
        return json_response(400, {"message": str(exc)})

    if not audio_bytes:
        return json_response(400, {"message": "empty_audio"})
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        return json_response(413, {"message": "audio_too_large"})

    job_name = f"elder-voice-{uuid.uuid4().hex}"
    suffix = media_format
    input_key = f"transcribe-input/{user_id}/{job_name}.{suffix}"
    output_key = f"transcribe-output/{job_name}.json"

    try:
        metadata = {"user_id": user_id}
        if session_id:
            metadata["session_id"] = session_id

        _s3.put_object(
            Bucket=BUCKET,
            Key=input_key,
            Body=audio_bytes,
            ContentType=normalized_content_type,
            Metadata=metadata,
        )
        _transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            LanguageCode=LANGUAGE_CODE,
            MediaFormat=media_format,
            Media={"MediaFileUri": f"s3://{BUCKET}/{input_key}"},
            OutputBucketName=BUCKET,
            OutputKey=output_key,
        )

        deadline = time.time() + POLL_SECONDS
        last_job = None
        while time.time() < deadline:
            last_job = _transcribe.get_transcription_job(TranscriptionJobName=job_name)["TranscriptionJob"]
            status = last_job.get("TranscriptionJobStatus")
            if status == "COMPLETED":
                transcript = _read_transcript_from_s3(output_key, last_job)
                put_metric("TranscribeSuccess")
                return json_response(
                    200,
                    {
                        "transcript": transcript,
                        "job_name": job_name,
                        "language_code": LANGUAGE_CODE,
                    },
                )
            if status == "FAILED":
                reason = (last_job.get("FailureReason") or "failed")[:80]
                _logger.warning("Transcribe job failed: %s", reason)
                put_metric("TranscribeFailure", dimensions={"Reason": "job_failed"})
                return json_response(502, {"message": "transcribe_failed", "reason": reason})
            time.sleep(1)

        _logger.warning("Transcribe job timed out before API response: %s", job_name)
        put_metric("TranscribeFailure", dimensions={"Reason": "poll_timeout"})
        return json_response(504, {"message": "transcribe_timeout", "job_name": job_name})
    except Exception as exc:
        _logger.exception("Transcribe request failed: %s", exc)
        put_metric("TranscribeFailure", dimensions={"Reason": "exception"})
        return json_response(500, {"message": "transcribe_error"})
