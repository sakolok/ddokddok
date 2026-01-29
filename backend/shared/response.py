import json
from decimal import Decimal

def json_response(status_code, body):
    def _default(o):
        if isinstance(o, Decimal):
            # Preserve int vs float when possible
            return int(o) if o % 1 == 0 else float(o)
        raise TypeError(f"Object of type {o.__class__.__name__} is not JSON serializable")

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, ensure_ascii=False, default=_default),
    }
