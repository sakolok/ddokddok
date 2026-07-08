import json
from shared.response import json_response
from shared.ddb import users_table
from shared.utils import verify_pin
from shared.auth import AuthError, require_user_access


def handler(event, _context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return json_response(400, {"message": "invalid_json"})

    user_id = (body.get("user_id") or "").strip()
    pin = (body.get("pin") or "").strip()

    if not user_id or not pin:
        return json_response(400, {"message": "missing_required_fields"})
    try:
        require_user_access(event, user_id)
    except AuthError:
        return json_response(403, {"message": "forbidden"})
    if len(pin) != 4 or not pin.isdigit():
        return json_response(400, {"message": "pin_must_be_4_digits"})

    resp = users_table.get_item(Key={"user_id": user_id})
    item = resp.get("Item")
    if not item:
        return json_response(404, {"message": "not_found"})

    salt = item.get("guardian_pin_salt")
    digest = item.get("guardian_pin_hash")
    if not salt or not digest:
        return json_response(400, {"message": "pin_not_set"})

    if not verify_pin(pin, salt, digest):
        return json_response(401, {"message": "invalid_pin"})

    return json_response(200, {"ok": True})
