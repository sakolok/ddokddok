import os
import boto3
import uuid
import logging
from shared.metrics import put_metric

_s3 = boto3.client("s3")
_polly = boto3.client("polly")
BUCKET = os.getenv("POLLY_BUCKET")
DEFAULT_VOICE_ID = os.getenv("POLLY_VOICE_ID", "Seoyeon")
DEFAULT_ENGINE = os.getenv("POLLY_ENGINE", "generative")
FALLBACK_ENGINES = [engine.strip() for engine in os.getenv("POLLY_FALLBACK_ENGINES", "neural,standard").split(",") if engine.strip()]
_logger = logging.getLogger(__name__)
_logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

def synthesize_to_s3(text, voice_id=None):
    if not BUCKET:
        _logger.error("POLLY_BUCKET is not configured")
        put_metric("PollySynthesisFailure", dimensions={"Reason": "missing_bucket"})
        return None
    try:
        voice_id = voice_id or DEFAULT_VOICE_ID
        key = f"polly/{uuid.uuid4().hex}.mp3"
        engines = [DEFAULT_ENGINE] + [engine for engine in FALLBACK_ENGINES if engine != DEFAULT_ENGINE]
        last_error = None
        resp = None
        used_engine = DEFAULT_ENGINE
        for engine in engines:
            try:
                resp = _polly.synthesize_speech(
                    Text=text,
                    OutputFormat="mp3",
                    VoiceId=voice_id,
                    Engine=engine,
                )
                used_engine = engine
                break
            except Exception as exc:
                last_error = exc
                _logger.warning("Polly synthesize failed with engine %s: %s", engine, exc)
                put_metric("PollySynthesisFailure", dimensions={"Engine": engine})
        if resp is None:
            raise last_error or RuntimeError("polly_synthesize_failed")

        if used_engine != DEFAULT_ENGINE:
            put_metric("PollyFallbackEngine", dimensions={"Engine": used_engine})

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
        put_metric("PollySynthesisFailure", dimensions={"Reason": "all_engines_failed"})
        return None
