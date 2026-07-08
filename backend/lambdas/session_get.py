import os
import boto3
from boto3.dynamodb.conditions import Key
from shared.response import json_response
from shared.auth import AuthError, require_session_access

_dynamodb = boto3.resource("dynamodb")
SESSIONS_TABLE = os.getenv("SESSIONS_TABLE")
TURNS_TABLE = os.getenv("TURNS_TABLE")


def handler(event, _context):
    path = event.get("pathParameters") or {}
    session_id = path.get("session_id")
    if not session_id:
        return json_response(400, {"message": "missing_session_id"})

    sessions_table = _dynamodb.Table(SESSIONS_TABLE)
    turns_table = _dynamodb.Table(TURNS_TABLE)

    sess = sessions_table.get_item(Key={"session_id": session_id}).get("Item")
    if not sess:
        return json_response(404, {"message": "not_found"})
    try:
        require_session_access(event, sess)
    except AuthError:
        return json_response(403, {"message": "forbidden"})

    turns_resp = turns_table.query(
        KeyConditionExpression=Key("session_id").eq(session_id),
        ScanIndexForward=True,
    )

    return json_response(200, {"session": sess, "turns": turns_resp.get("Items", [])})
