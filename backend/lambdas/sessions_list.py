import os
import boto3
from boto3.dynamodb.conditions import Key
from shared.response import json_response
from shared.auth import AuthError, require_user_access

_dynamodb = boto3.resource("dynamodb")
SESSIONS_TABLE = os.getenv("SESSIONS_TABLE")


def handler(event, _context):
    user_id = (event.get("queryStringParameters") or {}).get("user_id")
    if not user_id:
        return json_response(400, {"message": "missing_user_id"})
    try:
        require_user_access(event, user_id)
    except AuthError:
        return json_response(403, {"message": "forbidden"})

    table = _dynamodb.Table(SESSIONS_TABLE)
    resp = table.query(
        IndexName="user_id_index",
        KeyConditionExpression=Key("user_id").eq(user_id),
        ScanIndexForward=False,
    )

    return json_response(200, {"items": resp.get("Items", [])})
