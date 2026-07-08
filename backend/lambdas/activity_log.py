import json
import os
from datetime import datetime, timezone
import boto3
from shared.response import json_response
from shared.utils import ttl_epoch
from shared.auth import AuthError, require_user_access

_dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.getenv("ACTIVITY_TABLE")
table = _dynamodb.Table(TABLE_NAME) if TABLE_NAME else None


def handler(event, _context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return json_response(400, {"message": "invalid_json"})

    user_id = (body.get("user_id") or "").strip()
    activity_type = (body.get("type") or "").strip()
    start_ts = (body.get("start_ts") or "").strip()
    end_ts = (body.get("end_ts") or "").strip()
    duration_min = body.get("duration_min")
    game_type = body.get("game_type")
    score = body.get("score")

    if not user_id or activity_type not in {"chat", "game"}:
        return json_response(400, {"message": "missing_required_fields"})
    try:
        require_user_access(event, user_id)
    except AuthError:
        return json_response(403, {"message": "forbidden"})

    if not end_ts:
        end_ts = datetime.now(timezone.utc).isoformat()

    item = {
        "user_id": user_id,
        "timestamp": end_ts,
        "type": activity_type,
        "start_ts": start_ts,
        "end_ts": end_ts,
        "expires_at": ttl_epoch(365),
    }
    if duration_min is not None:
        item["duration_min"] = int(duration_min)
    if game_type:
        item["game_type"] = game_type
    if score is not None:
        item["score"] = score

    table.put_item(Item=item)

    return json_response(200, {"ok": True})
