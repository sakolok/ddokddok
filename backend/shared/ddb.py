import os
import boto3

_dynamodb = boto3.resource("dynamodb")

USERS_TABLE = os.getenv("USERS_TABLE")
SESSIONS_TABLE = os.getenv("SESSIONS_TABLE")
TURNS_TABLE = os.getenv("TURNS_TABLE")
KDSQ_RESPONSES_TABLE = os.getenv("KDSQ_RESPONSES_TABLE")

users_table = _dynamodb.Table(USERS_TABLE) if USERS_TABLE else None
sessions_table = _dynamodb.Table(SESSIONS_TABLE) if SESSIONS_TABLE else None
turns_table = _dynamodb.Table(TURNS_TABLE) if TURNS_TABLE else None
kdsq_responses_table = _dynamodb.Table(KDSQ_RESPONSES_TABLE) if KDSQ_RESPONSES_TABLE else None
