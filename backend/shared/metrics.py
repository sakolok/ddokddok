import os
import logging
import boto3

_cloudwatch = boto3.client("cloudwatch")
NAMESPACE = os.getenv("METRICS_NAMESPACE", "ElderVoiceCompanion")
STAGE = os.getenv("STAGE", "dev")
_logger = logging.getLogger(__name__)


def put_metric(name, value=1, unit="Count", dimensions=None):
    metric_dimensions = [{"Name": "Stage", "Value": STAGE}]
    for key, val in (dimensions or {}).items():
        if val is not None:
            metric_dimensions.append({"Name": str(key), "Value": str(val)})
    metric_data = [
        {
            "MetricName": name,
            "Value": value,
            "Unit": unit,
            "Dimensions": [{"Name": "Stage", "Value": STAGE}],
        }
    ]
    if len(metric_dimensions) > 1:
        metric_data.append(
            {
                "MetricName": name,
                "Value": value,
                "Unit": unit,
                "Dimensions": metric_dimensions,
            }
        )
    try:
        _cloudwatch.put_metric_data(
            Namespace=NAMESPACE,
            MetricData=metric_data,
        )
    except Exception as exc:
        _logger.warning("CloudWatch metric put failed: %s", exc)
