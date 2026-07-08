import os
import uuid
from datetime import datetime, timedelta, timezone
import hashlib

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def ttl_epoch(days):
    return int((datetime.now(timezone.utc) + timedelta(days=days)).timestamp())

def new_id(prefix):
    return f"{prefix}_{uuid.uuid4().hex}"

def env_bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "y"}


def hash_pin(pin, salt=None):
    if salt is None:
        salt = os.urandom(16).hex()
    digest = hashlib.sha256(f"{salt}:{pin}".encode("utf-8")).hexdigest()
    return salt, digest


def verify_pin(pin, salt, digest):
    _, check = hash_pin(pin, salt=salt)
    return check == digest
