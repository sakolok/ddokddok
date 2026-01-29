import json
import os
import boto3
from boto3.dynamodb.conditions import Key
from shared.response import json_response
from shared.utils import now_iso, new_id

_cognito = boto3.client("cognito-idp")
_dynamodb = boto3.resource("dynamodb")

USER_POOL_ID = os.getenv("USER_POOL_ID")
USER_POOL_CLIENT_ID = os.getenv("USER_POOL_CLIENT_ID")
USERS_TABLE = os.getenv("USERS_TABLE")
SESSIONS_TABLE = os.getenv("SESSIONS_TABLE")


def handler(event, _context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return json_response(400, {"message": "invalid_json"})

    username = (body.get("username") or "").strip()
    password = (body.get("password") or "").strip()

    if not username or not password:
        return json_response(400, {"message": "missing_required_fields"})

    def _do_auth():
        return _cognito.admin_initiate_auth(
            UserPoolId=USER_POOL_ID,
            ClientId=USER_POOL_CLIENT_ID,
            AuthFlow="ADMIN_USER_PASSWORD_AUTH",
            AuthParameters={"USERNAME": username, "PASSWORD": password},
        )

    try:
        auth = _do_auth()
    except _cognito.exceptions.UserNotConfirmedException:
        _cognito.admin_confirm_sign_up(UserPoolId=USER_POOL_ID, Username=username)
        auth = _do_auth()
    except _cognito.exceptions.NotAuthorizedException:
        return json_response(401, {"message": "invalid_credentials"})

    result = {
        "role": "senior",
        "access_token": auth["AuthenticationResult"]["AccessToken"],
        "id_token": auth["AuthenticationResult"]["IdToken"],
        "refresh_token": auth["AuthenticationResult"].get("RefreshToken"),
        "expires_in": auth["AuthenticationResult"]["ExpiresIn"],
    }

    # Find user_id by cognito_username
    table = _dynamodb.Table(USERS_TABLE)
    resp = table.query(
        IndexName="cognito_username_index",
        KeyConditionExpression=Key("cognito_username").eq(username),
    )
    items = resp.get("Items", [])
    if items:
        item = items[0]
        result["user_id"] = item.get("user_id")
        result["display_name"] = item.get("display_name")
        result["guardian_email"] = item.get("guardian_email")
        result["gender"] = item.get("gender")
    else:
        guardian_email = None
        display_name = username
        try:
            user = _cognito.admin_get_user(UserPoolId=USER_POOL_ID, Username=username)
            attrs = {a["Name"]: a["Value"] for a in user.get("UserAttributes", [])}
            guardian_email = attrs.get("custom:guardian_email") or attrs.get("email")
            display_name = attrs.get("name") or display_name
        except _cognito.exceptions.UserNotFoundException:
            pass

        user_id = username
        if SESSIONS_TABLE:
            sessions_table = _dynamodb.Table(SESSIONS_TABLE)
            sess_resp = sessions_table.query(
                IndexName="user_id_index",
                KeyConditionExpression=Key("user_id").eq(username),
                Limit=1,
            )
            if sess_resp.get("Count", 0) == 0:
                user_id = new_id("user")

        table.put_item(
            Item={
                "user_id": user_id,
                "display_name": display_name,
                "guardian_email": guardian_email,
                "created_at": now_iso(),
                "cognito_username": username,
                "role": "senior",
            }
        )
        result["user_id"] = user_id
        result["display_name"] = display_name
        result["guardian_email"] = guardian_email

    return json_response(200, result)
