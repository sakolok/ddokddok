#!/usr/bin/env python3
import argparse
from typing import Dict, Any

import boto3
from botocore.exceptions import ClientError


def _normalize_topic_name(user_id: str) -> str:
    base = f"elder-voice-companion-guardian-{user_id}"
    return base[:256]


def _scan_users(table):
    items = []
    resp = table.scan()
    items.extend(resp.get("Items", []))
    while "LastEvaluatedKey" in resp:
        resp = table.scan(ExclusiveStartKey=resp["LastEvaluatedKey"])
        items.extend(resp.get("Items", []))
    return items


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", required=True)
    parser.add_argument("--users-table", required=True)
    parser.add_argument("--unsubscribe-topic-arn")
    parser.add_argument("--unsubscribe-email", default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    dynamodb = boto3.resource("dynamodb", region_name=args.region)
    sns = boto3.client("sns", region_name=args.region)
    table = dynamodb.Table(args.users_table)

    users = _scan_users(table)
    print(f"Found {len(users)} users")

    for u in users:
        user_id = u.get("user_id")
        guardian_email = u.get("guardian_email")
        guardian_topic_arn = u.get("guardian_topic_arn")

        if not user_id or not guardian_email:
            continue
        if guardian_topic_arn:
            continue

        topic_name = _normalize_topic_name(user_id)
        print(f"Creating topic for {user_id} -> {guardian_email} ({topic_name})")

        if args.dry_run:
            continue

        try:
            topic_arn = sns.create_topic(Name=topic_name).get("TopicArn")
            sns.subscribe(
                TopicArn=topic_arn,
                Protocol="email",
                Endpoint=guardian_email,
            )
            table.update_item(
                Key={"user_id": user_id},
                UpdateExpression="SET guardian_topic_arn = :t",
                ExpressionAttributeValues={":t": topic_arn},
            )
            print(f"  Updated guardian_topic_arn: {topic_arn}")
        except ClientError as exc:
            print(f"  ERROR for {user_id}: {exc}")

    if args.unsubscribe_topic_arn:
        print(f"Unsubscribing from global topic: {args.unsubscribe_topic_arn}")
        paginator = sns.get_paginator("list_subscriptions_by_topic")
        for page in paginator.paginate(TopicArn=args.unsubscribe_topic_arn):
            for sub in page.get("Subscriptions", []):
                endpoint = sub.get("Endpoint")
                sub_arn = sub.get("SubscriptionArn")
                if args.unsubscribe_email and endpoint != args.unsubscribe_email:
                    continue
                if sub_arn in (None, "PendingConfirmation", "Deleted"):
                    continue
                print(f"  Unsubscribe {endpoint} ({sub_arn})")
                if not args.dry_run:
                    try:
                        sns.unsubscribe(SubscriptionArn=sub_arn)
                    except ClientError as exc:
                        print(f"    ERROR: {exc}")


if __name__ == "__main__":
    main()
