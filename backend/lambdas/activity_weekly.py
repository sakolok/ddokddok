import json
import os
from datetime import datetime, timedelta, timezone, date
import boto3
from boto3.dynamodb.conditions import Key
from shared.response import json_response
from shared.bedrock import invoke_chat
from shared.kdsq_scoring import compute_kdsq_stats
from shared.auth import AuthError, require_user_access
from shared.metrics import put_metric

_dynamodb = boto3.resource("dynamodb")
ACTIVITY_TABLE = os.getenv("ACTIVITY_TABLE")
SELF_ASSESSMENTS_TABLE = os.getenv("SELF_ASSESSMENTS_TABLE")
KDSQ_RESPONSES_TABLE = os.getenv("KDSQ_RESPONSES_TABLE")
PROMPT_VERSION = os.getenv("PROMPT_VERSION", "elder-companion-v1")

activity_table = _dynamodb.Table(ACTIVITY_TABLE) if ACTIVITY_TABLE else None
self_table = _dynamodb.Table(SELF_ASSESSMENTS_TABLE) if SELF_ASSESSMENTS_TABLE else None
kdsq_table = _dynamodb.Table(KDSQ_RESPONSES_TABLE) if KDSQ_RESPONSES_TABLE else None


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _date_str(d: date) -> str:
    return d.strftime("%Y-%m-%d")


def handler(event, _context):
    params = event.get("queryStringParameters") or {}
    user_id = (params.get("user_id") or "").strip()
    if not user_id:
        return json_response(400, {"message": "missing_user_id"})
    try:
        require_user_access(event, user_id)
    except AuthError:
        return json_response(403, {"message": "forbidden"})

    now = datetime.now(timezone.utc)
    start_day = (now - timedelta(days=6)).date()
    start_ts = _iso(datetime.combine(start_day, datetime.min.time(), tzinfo=timezone.utc))
    end_ts = _iso(now)

    # Activity logs (chat/game)
    resp = activity_table.query(
        KeyConditionExpression=Key("user_id").eq(user_id) & Key("timestamp").between(start_ts, end_ts)
    )
    activities = resp.get("Items", [])

    total_chat_sessions = sum(1 for a in activities if a.get("type") == "chat")
    total_game_sessions = sum(1 for a in activities if a.get("type") == "game")
    total_time_min = sum(int(a.get("duration_min", 0)) for a in activities)
    avg_daily_time_min = round(total_time_min / 7) if total_time_min else 0

    # Game stats
    game_stats = {}
    for a in activities:
        if a.get("type") != "game":
            continue
        g = a.get("game_type") or "unknown"
        game_stats.setdefault(g, {"played": 0, "scores": []})
        game_stats[g]["played"] += 1
        if a.get("score") is not None:
            game_stats[g]["scores"].append(float(a.get("score")))

    game_stats_out = {}
    for g, v in game_stats.items():
        scores = v["scores"]
        game_stats_out[g] = {
            "played": v["played"],
            "avgScore": round(sum(scores) / len(scores), 1) if scores else 0,
            "bestScore": max(scores) if scores else 0,
        }

    # Self-assessment (daily scores)
    self_resp = self_table.query(
        KeyConditionExpression=Key("user_id").eq(user_id) & Key("assessment_date").between(_date_str(start_day), _date_str(now.date()))
    )
    assessments = {i["assessment_date"]: int(i.get("score", 0)) for i in self_resp.get("Items", [])}
    latest_assessment = None
    if assessments:
        latest_date = sorted(assessments.keys())[-1]
        latest_assessment = {"date": latest_date, "score": assessments[latest_date]}

    # KDSQ responses (last 7 days)
    kdsq_responses = []
    if kdsq_table:
        kdsq_resp = kdsq_table.query(
            KeyConditionExpression=Key("user_id").eq(user_id) & Key("timestamp").between(start_ts, end_ts),
            ScanIndexForward=True,
        )
        kdsq_responses = kdsq_resp.get("Items", [])

    # Daily activities
    daily = []
    for i in range(6, -1, -1):
        d = (now - timedelta(days=i)).date()
        d_str = _date_str(d)
        day_acts = [a for a in activities if (a.get("timestamp") or "").startswith(d_str)]
        daily.append({
            "date": d_str,
            "chatSessions": sum(1 for a in day_acts if a.get("type") == "chat"),
            "gamesSessions": sum(1 for a in day_acts if a.get("type") == "game"),
            "totalTime": sum(int(a.get("duration_min", 0)) for a in day_acts),
            "diagnosisScore": assessments.get(d_str),
        })

    # Bedrock summary
    summary = "최근 7일간 활동 데이터가 충분하지 않아 참고용 요약만 제공합니다."
    prompt = {
        "prompt_version": PROMPT_VERSION,
        "task": "weekly_activity_summary",
        "stats": {
            "total_time_min": total_time_min,
            "avg_daily_time_min": avg_daily_time_min,
            "total_chat_sessions": total_chat_sessions,
            "total_game_sessions": total_game_sessions,
        },
        "constraints": {
            "language": "ko",
            "tone": "polite_korean",
            "no_diagnosis": True,
            "screening_only": True,
            "response_format": "json",
        },
        "response_schema": {"summary": "string"},
    }
    try:
        resp = invoke_chat(prompt)
        if isinstance(resp, dict) and resp.get("summary"):
            summary = resp["summary"]
    except Exception:
        put_metric("WeeklySummaryFallback", dimensions={"Reason": "bedrock_exception"})
        pass

    # KDSQ weekly analysis (rule-based)
    kdsq_summary = None
    kdsq_signals = None
    kdsq_score_total = None
    kdsq_status_emoji = None
    kdsq_notify = None
    kdsq_concern_examples = None
    if kdsq_responses:
        kdsq_stats = compute_kdsq_stats(kdsq_responses)
        kdsq_summary = kdsq_stats.get("summary")
        kdsq_signals = kdsq_stats.get("signals")
        kdsq_score_total = kdsq_stats.get("score_total")
        kdsq_status_emoji = kdsq_stats.get("status_emoji")
        kdsq_concern_examples = kdsq_stats.get("concern_examples")

    return json_response(200, {
        "summary": summary,
        "prompt_version": PROMPT_VERSION,
        "total_chat_sessions": total_chat_sessions,
        "total_game_sessions": total_game_sessions,
        "total_time_min": total_time_min,
        "avg_daily_time_min": avg_daily_time_min,
        "game_stats": game_stats_out,
        "daily_activities": daily,
        "latest_diagnosis": latest_assessment,
        "kdsq_summary": kdsq_summary,
        "kdsq_signals": kdsq_signals,
        "kdsq_score_total": kdsq_score_total,
        "kdsq_status_emoji": kdsq_status_emoji,
        "kdsq_notify": kdsq_notify,
        "kdsq_responses_count": len(kdsq_responses),
        "kdsq_concern_examples": kdsq_concern_examples,
        "kdsq_responses": kdsq_responses,
    })
