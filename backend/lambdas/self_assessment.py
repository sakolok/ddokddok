import json
import os
from datetime import date, datetime, timedelta, timezone
import boto3
from boto3.dynamodb.conditions import Key
from shared.response import json_response
from shared.ddb import users_table
from shared.utils import ttl_epoch
from shared.auth import AuthError, require_user_access

_dynamodb = boto3.resource("dynamodb")
_sns = boto3.client("sns")

TABLE_NAME = os.getenv("SELF_ASSESSMENTS_TABLE")
THRESHOLD = int(os.getenv("SELF_ASSESSMENT_NOTIFY_THRESHOLD", "6"))

table = _dynamodb.Table(TABLE_NAME) if TABLE_NAME else None


def _today_utc_date():
    return datetime.now(timezone.utc).date()


def _parse_date(value):
    if not value:
        return _today_utc_date()
    return datetime.strptime(value, "%Y-%m-%d").date()


def _score_from_answers(answers):
    # answers: list of booleans or 0/1
    score = 0
    for a in answers:
        if isinstance(a, bool):
            score += 1 if a else 0
        elif isinstance(a, (int, float)):
            score += 1 if int(a) == 1 else 0
        elif isinstance(a, str):
            score += 1 if a.strip().lower() in {"1", "true", "yes", "y"} else 0
    return score


def handler(event, _context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return json_response(400, {"message": "invalid_json"})

    user_id = (body.get("user_id") or "").strip()
    answers = body.get("answers")
    assessment_date = body.get("assessment_date")

    if not user_id or answers is None:
        return json_response(400, {"message": "missing_required_fields"})
    try:
        require_user_access(event, user_id)
    except AuthError:
        return json_response(403, {"message": "forbidden"})
    if not isinstance(answers, list) or len(answers) != 15:
        return json_response(400, {"message": "answers_must_be_15"})

    d = _parse_date(assessment_date)
    d_str = d.strftime("%Y-%m-%d")

    score = _score_from_answers(answers)

    table.put_item(
        Item={
            "user_id": user_id,
            "assessment_date": d_str,
            "score": score,
            "answers": answers,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": ttl_epoch(365),
        }
    )

    # 7-day average (exclude days without entries)
    start = (d - timedelta(days=6)).strftime("%Y-%m-%d")
    end = d_str
    resp = table.query(
        KeyConditionExpression=Key("user_id").eq(user_id)
        & Key("assessment_date").between(start, end)
    )
    items = resp.get("Items", [])
    if items:
        avg = sum(int(i.get("score", 0)) for i in items) / len(items)
    else:
        avg = score

    notified = False
    guardian_topic_arn = None
    if users_table and user_id:
        user_item = users_table.get_item(Key={"user_id": user_id}).get("Item") or {}
        guardian_topic_arn = user_item.get("guardian_topic_arn")

    if avg >= THRESHOLD and guardian_topic_arn:
        _sns.publish(
            TopicArn=guardian_topic_arn,
            Subject="Elder Voice Companion: 자가문진 변화 관찰 알림",
            Message="최근 1주일 자가문진 평균 점수가 기준치를 넘어 변화가 관찰되었습니다. 추가 확인을 권장드립니다.",
        )
        notified = True

    return json_response(
        200,
        {
            "user_id": user_id,
            "assessment_date": d_str,
            "score": score,
            "avg_7d": avg,
            "notified": notified,
        },
    )
