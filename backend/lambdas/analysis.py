import json
import os
import boto3
from datetime import datetime, timedelta, timezone
from boto3.dynamodb.conditions import Key
from shared.utils import now_iso
from shared.ddb import sessions_table, turns_table, kdsq_responses_table, users_table
from shared.kdsq_scoring import compute_kdsq_stats, daily_concern_counts

_sns = boto3.client("sns")
SNS_TOPIC_ARN = os.getenv("SNS_TOPIC_ARN")
NOTIFY_SCORE_THRESHOLD = int(os.getenv("NOTIFY_SCORE_THRESHOLD", "40"))

FALLBACK_ANALYSIS = {
    "summary": "최근 대화에서 일상 이야기를 자연스럽게 이어가셨습니다.",
    "signals": {
        "orientation": "NONE",
        "memory": "NONE",
        "mood": "NONE",
        "social": "NONE",
        "daily": "NONE",
    },
    "score_total": 75,
    "status_emoji": "🙂",
    "notify": False,
}


def handler(event, _context):
    for record in event.get("Records", []):
        body = json.loads(record.get("body") or "{}")
        session_id = body.get("session_id")
        if not session_id:
            continue

        session_item = sessions_table.get_item(Key={"session_id": session_id}).get("Item") or {}
        user_id = session_item.get("user_id")
        turns = []
        if turns_table:
            turns_resp = turns_table.query(
                KeyConditionExpression=Key("session_id").eq(session_id),
                ScanIndexForward=True,
            )
            turns = turns_resp.get("Items", [])

        kdsq_responses = []
        if user_id and kdsq_responses_table:
            now = datetime.now(timezone.utc)
            start_ts = (now - timedelta(days=6)).isoformat()
            end_ts = now.isoformat()
            kdsq_resp = kdsq_responses_table.query(
                KeyConditionExpression=Key("user_id").eq(user_id) & Key("timestamp").between(start_ts, end_ts),
                ScanIndexForward=True,
            )
            kdsq_responses = kdsq_resp.get("Items", [])

        analysis = compute_kdsq_stats(kdsq_responses) if kdsq_responses else FALLBACK_ANALYSIS

        sessions_table.update_item(
            Key={"session_id": session_id},
            UpdateExpression=(
                "SET summary = :summary, score_total = :score, status_emoji = :emoji, "
                "end_ts = if_not_exists(end_ts, :end_ts), signals = :signals"
            ),
            ExpressionAttributeValues={
                ":summary": analysis.get("summary"),
                ":score": analysis.get("score_total"),
                ":emoji": analysis.get("status_emoji"),
                ":signals": analysis.get("signals"),
                ":end_ts": now_iso(),
            },
        )

        signals = analysis.get("signals") or {}
        has_concern = any(v == "concern" for v in signals.values())
        score_total = analysis.get("score_total", 0)
        score_total = analysis.get("score_total", 0)
        notify = score_total >= NOTIFY_SCORE_THRESHOLD
        alert_sent = session_item.get("alert_sent") is True
        guardian_topic_arn = None
        if users_table and user_id:
            user_item = users_table.get_item(Key={"user_id": user_id}).get("Item") or {}
            guardian_topic_arn = user_item.get("guardian_topic_arn")

        if notify and not alert_sent and guardian_topic_arn:
            _sns.publish(
                TopicArn=guardian_topic_arn,
                Subject="Elder Voice Companion: 변화 관찰 알림",
                Message="최근 하루 기준 KDSQ 우려 응답이 기준치를 넘어 변화 신호가 관찰되었습니다. 추가 확인을 권장드립니다.",
            )
            sessions_table.update_item(
                Key={"session_id": session_id},
                UpdateExpression="SET alert_sent = :sent, alert_sent_at = :ts",
                ExpressionAttributeValues={":sent": True, ":ts": now_iso()},
            )
