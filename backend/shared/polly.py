import os
import boto3
import uuid
import logging

_s3 = boto3.client("s3")
_polly = boto3.client("polly")
BUCKET = os.getenv("POLLY_BUCKET")
_logger = logging.getLogger(__name__)
_logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

def synthesize_to_s3(text, voice_id="Jihye"):
    if not BUCKET:
        _logger.error("POLLY_BUCKET is not configured")
        return None
    try:
        key = f"polly/{uuid.uuid4().hex}.mp3"
        resp = _polly.synthesize_speech(
            Text=text,
            OutputFormat="mp3",
            VoiceId=voice_id,
            Engine="neural",
        )
        _s3.put_object(
            Bucket=BUCKET,
            Key=key,
            Body=resp["AudioStream"].read(),
            ContentType="audio/mpeg",
        )

        presigned = _s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET, "Key": key},
            ExpiresIn=3600,
        )
        return {"s3_key": key, "url": presigned}
    except Exception as exc:
        _logger.exception("Polly synthesize failed: %s", exc)
        return None
