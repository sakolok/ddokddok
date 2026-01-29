import json
import boto3
from shared.response import json_response
from shared.utils import now_iso, new_id
from shared.ddb import users_table, sessions_table


def handler(event, _context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return json_response(400, {"message": "invalid_json"})

    display_name = (body.get("display_name") or "").strip()
    guardian_email = (body.get("guardian_email") or "").strip()
    consent = body.get("consent")
    user_id = (body.get("user_id") or "").strip()

    if consent is not True:
        return json_response(400, {"message": "missing_required_fields"})

    created_at = now_iso()
    session_id = new_id("session")

    if not user_id:
        if not display_name or not guardian_email:
            return json_response(400, {"message": "missing_required_fields"})
        user_id = new_id("user")
        users_table.put_item(
            Item={
                "user_id": user_id,
                "display_name": display_name,
                "guardian_email": guardian_email,
                "created_at": created_at,
            }
        )

    sessions_table.put_item(
        Item={
            "session_id": session_id,
            "user_id": user_id,
            "start_ts": created_at,
            "end_ts": None,
            "score_total": None,
            "status_emoji": None,
            "summary": None,
            "kdsq_injected_count_by_type": {},
        }
    )

    return json_response(200, {"user_id": user_id, "session_id": session_id})
