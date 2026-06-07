"""Unit tests for the doctor-side triage agent."""

import unittest

from app.agent import ESCALATE, REVIEW, SUGGEST_APPROVE, Priority, triage


class TestCritical(unittest.TestCase):
    """Red-flag emergencies must be CRITICAL and escalated."""

    def test_chest_pain(self) -> None:
        t = triage("I'm having chest pain and it radiates to my arm", gate_reason="acute_symptom")
        self.assertEqual(t.priority, Priority.CRITICAL)
        self.assertEqual(t.recommendation, ESCALATE)
        self.assertIn("chest pain", t.urgency_signals)

    def test_breathing(self) -> None:
        self.assertEqual(triage("I can't breathe").priority, Priority.CRITICAL)

    def test_stroke_signs(self) -> None:
        self.assertEqual(triage("my speech is slurred and my face is drooping").priority, Priority.CRITICAL)


class TestHigh(unittest.TestCase):
    def test_anticoagulant_interaction(self) -> None:
        t = triage("Can I take ibuprofen with warfarin?", gate_reason="medication_interaction")
        self.assertEqual(t.priority, Priority.HIGH)
        self.assertEqual(t.recommendation, REVIEW)

    def test_severe_pain(self) -> None:
        self.assertEqual(triage("I have severe pain in my abdomen").priority, Priority.HIGH)


class TestMedium(unittest.TestCase):
    def test_plain_symptom_question(self) -> None:
        t = triage("Do I have a sinus infection?", gate_reason="diagnostic_question")
        self.assertEqual(t.priority, Priority.MEDIUM)
        self.assertEqual(t.recommendation, REVIEW)


class TestLow(unittest.TestCase):
    def test_wellness_question_is_batch_approvable(self) -> None:
        t = triage("Should I take vitamin D in the morning?", gate_reason="symptom_interpretation")
        self.assertEqual(t.priority, Priority.LOW)
        self.assertEqual(t.recommendation, SUGGEST_APPROVE)

    def test_diagnostic_topic_still_reviewed_even_if_low_risk_words(self) -> None:
        # "do I have a vitamin deficiency" mentions a low-risk word but is diagnostic.
        t = triage("Do I have a vitamin deficiency?", gate_reason="diagnostic_question")
        self.assertEqual(t.priority, Priority.MEDIUM)
        self.assertEqual(t.recommendation, REVIEW)


class TestSortable(unittest.TestCase):
    def test_priority_orders_critical_first(self) -> None:
        self.assertLess(int(Priority.CRITICAL), int(Priority.HIGH))
        self.assertLess(int(Priority.HIGH), int(Priority.MEDIUM))
        self.assertLess(int(Priority.MEDIUM), int(Priority.LOW))


if __name__ == "__main__":
    unittest.main()
