import json
from pathlib import Path

_path = Path(__file__).with_name("kdsq_questions.json")

KDSQ_QUESTIONS = json.loads(_path.read_text(encoding="utf-8"))
