import json
from shared.response import json_response
from shared.utils import now_iso, new_id, ttl_epoch
from shared.ddb import users_table, sessions_table
from shared.auth import AuthError, get_authenticated_user_id, require_user_access
from shared.polly import synthesize_to_s3


def handler(event, _context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return json_response(400, {"message": "invalid_json"})

    display_name = (body.get("display_name") or "").strip()
    guardian_email = (body.get("guardian_email") or "").strip()
    consent = body.get("consent")
    user_id = (body.get("user_id") or "").strip()
    welcome_text = (body.get("welcome_text") or "").strip()

    if consent is not True:
        return json_response(400, {"message": "missing_required_fields"})

    authenticated_user_id = get_authenticated_user_id(event)
    if user_id:
        try:
            require_user_access(event, user_id)
        except AuthError:
            return json_response(403, {"message": "forbidden"})
    elif authenticated_user_id:
        user_id = authenticated_user_id

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
                "expires_at": ttl_epoch(365),
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
            "expires_at": ttl_epoch(365),
        }
    )

    if not welcome_text:
        name = display_name or "사용자"
        welcome_text = f"안녕하세요 {name}님! 오늘 기분은 어떠신가요? 편하게 이야기해주세요."

    audio = synthesize_to_s3(welcome_text)

    return json_response(
        200,
        {
            "user_id": user_id,
            "session_id": session_id,
            "welcome_text": welcome_text,
            "audio": audio,
        },
    )
