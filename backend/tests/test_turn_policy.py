import importlib
import sys
import types
import unittest
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


class FakeKey:
    def __init__(self, *_args, **_kwargs):
        pass

    def eq(self, *_args, **_kwargs):
        return self

    def between(self, *_args, **_kwargs):
        return self

    def __and__(self, _other):
        return self


def _install_module(name, **attrs):
    module = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(module, key, value)
    sys.modules[name] = module
    return module


def load_turn_module():
    for name in list(sys.modules):
        if name == "lambdas.turn" or name.startswith("lambdas.turn."):
            del sys.modules[name]

    _install_module("boto3")
    _install_module("boto3.dynamodb")
    _install_module("boto3.dynamodb.conditions", Key=FakeKey)
    _install_module(
        "shared.ddb",
        turns_table=None,
        sessions_table=None,
        kdsq_responses_table=None,
    )
    _install_module(
        "shared.bedrock",
        invoke_chat=lambda _prompt: {"say": "ok", "tags": {"kdsq_item_id": "NONE", "risk_hint": "NONE"}},
    )
    _install_module("shared.polly", synthesize_to_s3=lambda _text: {"url": "mock"})

    class AuthError(Exception):
        pass

    _install_module(
        "shared.auth",
        AuthError=AuthError,
        require_session_access=lambda *_args, **_kwargs: None,
        require_user_access=lambda *_args, **_kwargs: None,
    )
    _install_module("shared.metrics", put_metric=lambda *_args, **_kwargs: None)
    _install_module(
        "shared.knowledge_base",
        is_configured=lambda: True,
        retrieve_context=lambda _query: {"configured": True, "used": True, "results": [], "skipped_reason": "NONE"},
    )
    return importlib.import_module("lambdas.turn")


class TurnPolicyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.turn = load_turn_module()

    def test_unsupported_schedule_question_is_guarded_before_model(self):
        response = self.turn._unsupported_external_fact_response("내일 병원 예약이 몇 시인지 알려줄 수 있어?")
        self.assertIn("예약 시간", response)
        self.assertIn("확인할 수 없어요", response)

    def test_generic_appointment_question_does_not_trigger_kb(self):
        signals = self.turn._conversation_signals("내일 병원 예약이 몇 시인지 알려줄 수 있어?", [], None)
        should_use, reason = self.turn._should_use_knowledge_base("내일 병원 예약이 몇 시인지 알려줄 수 있어?", signals)
        self.assertFalse(should_use)
        self.assertEqual(reason, "not_information_question")

    def test_direct_kdsq_question_can_use_kb_after_family_concern(self):
        recent_history = [{"role": "user", "text": "아들이 며칠째 연락이 없어서 걱정돼."}]
        transcript = "KDSQ가 뭐야? 내가 치매라는 뜻이야?"
        signals = self.turn._conversation_signals(transcript, recent_history, None)
        should_use, reason = self.turn._should_use_knowledge_base(transcript, signals)
        self.assertTrue(should_use)
        self.assertEqual(reason, "information_question")

    def test_assistant_family_question_does_not_poison_neutral_chat(self):
        recent_history = [{"role": "assistant", "text": "요즘 가족분들과 연락하시는 건 잘 되나요?"}]
        signals = self.turn._conversation_signals("시장에 가려다가 비가 올까 봐 안 갔지.", recent_history, None)
        self.assertFalse(signals["family_contact_concern"])
        self.assertEqual(signals["deferred_reason"], "NONE")

    def test_memory_concern_allows_contextual_kdsq(self):
        signals = self.turn._conversation_signals("나는 가끔 물건 둔 곳을 잊어버려서 걱정이네.", [], None)
        self.assertIn("memory", signals["kdsq_context_types"])
        self.assertEqual(signals["deferred_reason"], "NONE")

    def test_contextual_kdsq_append_requires_visible_question(self):
        question = "최근에 물건을 어디에 두었는지 기억이 잘 안 날 때가 있으신가요?"
        say = self.turn._append_contextual_kdsq("그런 일이 있으면 신경 쓰이실 수 있어요.", question)
        self.assertIn(question, say)

    def test_closing_turn_is_handled_without_model_guessing(self):
        response, reason = self.turn._forced_policy_response("오늘 이야기는 여기까지 할까 싶네.")
        self.assertIn("여기까지", response)
        self.assertEqual(reason, "conversation_closing")

    def test_kb_response_trim_removes_unrelated_family_followup(self):
        say = (
            "KDSQ는 주관적 인지 변화 점검 질문입니다. "
            "치매를 확정하는 것이 아닙니다. "
            "반복되면 전문가와 상담하는 것이 좋아요. "
            "마지막으로 아들과 연락한 시간이 언제였나요?"
        )
        trimmed = self.turn._trim_knowledge_base_response(say, "KDSQ가 뭐야? 내가 치매라는 뜻이야?")
        self.assertIn("KDSQ는", trimmed)
        self.assertNotIn("아들과 연락", trimmed)


if __name__ == "__main__":
    unittest.main()
