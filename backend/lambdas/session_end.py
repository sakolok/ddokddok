import json
import os
import boto3
from shared.response import json_response
from shared.utils import now_iso
from shared.ddb import sessions_table
from shared.auth import AuthError, require_session_access

_sqs = boto3.client("sqs")
QUEUE_URL = os.getenv("ANALYSIS_QUEUE_URL")


def handler(event, _context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return json_response(400, {"message": "invalid_json"})

    session_id = (body.get("session_id") or "").strip()
    if not session_id:
        return json_response(400, {"message": "missing_session_id"})

    session_item = sessions_table.get_item(Key={"session_id": session_id}).get("Item")
    if not session_item:
        return json_response(404, {"message": "not_found"})
    try:
        require_session_access(event, session_item)
    except AuthError:
        return json_response(403, {"message": "forbidden"})

    sessions_table.update_item(
        Key={"session_id": session_id},
        UpdateExpression="SET end_ts = :end_ts",
        ExpressionAttributeValues={":end_ts": now_iso()},
    )

    _sqs.send_message(QueueUrl=QUEUE_URL, MessageBody=json.dumps({"session_id": session_id}))

    return json_response(200, {"message": "enqueued"})
