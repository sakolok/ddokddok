import json
import os
import boto3
from shared.response import json_response
from shared.utils import now_iso, new_id, hash_pin
from shared.ddb import users_table

_cognito = boto3.client("cognito-idp")
_sns = boto3.client("sns")

USER_POOL_ID = os.getenv("USER_POOL_ID")
SNS_TOPIC_ARN = os.getenv("SNS_TOPIC_ARN")


def handler(event, _context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return json_response(400, {"message": "invalid_json"})

    username = (body.get("username") or "").strip()
    password = (body.get("password") or "").strip()
    display_name = (body.get("display_name") or "").strip()
    guardian_email = (body.get("guardian_email") or "").strip()
    gender = (body.get("gender") or "").strip()
    pin = (body.get("pin") or "").strip()

    if not username or not password or not guardian_email or not pin:
        return json_response(400, {"message": "missing_required_fields"})
    if len(pin) != 4 or not pin.isdigit():
        return json_response(400, {"message": "pin_must_be_4_digits"})

    created_at = now_iso()
    user_id = new_id("user")
    attrs = [
        {"Name": "custom:role", "Value": "senior"},
        {"Name": "custom:guardian_email", "Value": guardian_email},
        {"Name": "email", "Value": guardian_email},
    ]

    try:
        _cognito.admin_create_user(
            UserPoolId=USER_POOL_ID,
            Username=username,
            UserAttributes=attrs,
            MessageAction="SUPPRESS",
        )
        _cognito.admin_set_user_password(
            UserPoolId=USER_POOL_ID,
            Username=username,
            Password=password,
            Permanent=True,
        )
        try:
            _cognito.admin_confirm_sign_up(
                UserPoolId=USER_POOL_ID,
                Username=username,
            )
        except _cognito.exceptions.NotAuthorizedException:
            # Already confirmed; continue
            pass
    except _cognito.exceptions.UsernameExistsException:
        return json_response(409, {"message": "user_exists"})
    except _cognito.exceptions.InvalidPasswordException:
        return json_response(400, {"message": "password_too_short"})

    pin_salt, pin_hash = hash_pin(pin)
    guardian_topic_arn = None
    try:
        topic_name = f"elder-voice-companion-guardian-{user_id}"
        guardian_topic_arn = _sns.create_topic(Name=topic_name).get("TopicArn")
        if guardian_topic_arn and guardian_email:
            _sns.subscribe(TopicArn=guardian_topic_arn, Protocol="email", Endpoint=guardian_email)
    except Exception:
        guardian_topic_arn = None

    users_table.put_item(
        Item={
            "user_id": user_id,
            "display_name": display_name or username,
            "guardian_email": guardian_email,
            "gender": gender,
            "created_at": created_at,
            "cognito_username": username,
            "role": "senior",
            "guardian_pin_salt": pin_salt,
            "guardian_pin_hash": pin_hash,
            "guardian_topic_arn": guardian_topic_arn,
        }
    )

    # Legacy global topic subscription (deprecated)
    if SNS_TOPIC_ARN and guardian_email:
        _sns.subscribe(TopicArn=SNS_TOPIC_ARN, Protocol="email", Endpoint=guardian_email)

    return json_response(200, {"user_id": user_id, "role": "senior"})
