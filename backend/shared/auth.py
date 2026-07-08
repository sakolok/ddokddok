from boto3.dynamodb.conditions import Key
from shared.ddb import users_table


class AuthError(Exception):
    pass


def get_claims(event):
    authorizer = (event.get("requestContext") or {}).get("authorizer") or {}
    return authorizer.get("claims") or {}


def get_authenticated_username(event):
    claims = get_claims(event)
    return claims.get("cognito:username") or claims.get("username") or claims.get("sub")


def get_authenticated_user_id(event):
    claims = get_claims(event)
    custom_user_id = claims.get("custom:user_id")
    if custom_user_id:
        return custom_user_id

    username = get_authenticated_username(event)
    if not username or not users_table:
        return None

    resp = users_table.query(
        IndexName="cognito_username_index",
        KeyConditionExpression=Key("cognito_username").eq(username),
        Limit=1,
    )
    items = resp.get("Items", [])
    if not items:
        return None
    return items[0].get("user_id")


def require_user_access(event, requested_user_id):
    authenticated_user_id = get_authenticated_user_id(event)
    if not authenticated_user_id:
        # API Gateway Cognito authorizer enforces auth in AWS; local SAM events may omit claims.
        return requested_user_id
    if requested_user_id and requested_user_id != authenticated_user_id:
        raise AuthError("forbidden_user")
    return authenticated_user_id


def require_session_access(event, session_item):
    authenticated_user_id = get_authenticated_user_id(event)
    if not authenticated_user_id:
        return
    if session_item and session_item.get("user_id") != authenticated_user_id:
        raise AuthError("forbidden_session")
