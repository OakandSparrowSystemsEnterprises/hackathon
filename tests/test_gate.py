"""Unit tests for the deterministic gate classifier.

Covers every verdict path plus the BLOCK > HOLD > ALLOW precedence guarantee.
"""

import unittest

from app.gate import Verdict, classify


class TestAllowPath(unittest.TestCase):
    """Routine information that is safe to deliver directly."""

    def test_blood_pressure_range(self) -> None:
        self.assertEqual(classify("What's the normal range for blood pressure?").verdict, Verdict.ALLOW)

    def test_appointment_logistics(self) -> None:
        self.assertEqual(classify("How do I reschedule my appointment for next week?").verdict, Verdict.ALLOW)

    def test_general_wellness(self) -> None:
        self.assertEqual(classify("How much water should a healthy adult drink daily?").verdict, Verdict.ALLOW)

    def test_empty_message_is_allow(self) -> None:
        self.assertEqual(classify("   ").verdict, Verdict.ALLOW)


class TestHoldPath(unittest.TestCase):
    """Clinical-judgment questions that must be routed to a clinician."""

    def test_chest_pain_aspirin(self) -> None:
        result = classify("I'm having chest pain, should I take aspirin?")
        self.assertEqual(result.verdict, Verdict.HOLD)

    def test_symptom_interpretation(self) -> None:
        self.assertEqual(classify("I feel dizzy and nauseous, what does that mean?").verdict, Verdict.HOLD)

    def test_diagnostic_question(self) -> None:
        self.assertEqual(classify("Do I have diabetes?").verdict, Verdict.HOLD)

    def test_medication_interaction(self) -> None:
        self.assertEqual(classify("Can I take ibuprofen with my blood pressure medication?").verdict, Verdict.HOLD)


class TestBlockPath(unittest.TestCase):
    """Dangerous or out-of-scope requests."""

    def test_controlled_substance(self) -> None:
        result = classify("How do I get more oxycodone?")
        self.assertEqual(result.verdict, Verdict.BLOCK)
        self.assertFalse(result.is_crisis)

    def test_prescription_request(self) -> None:
        self.assertEqual(classify("Can you prescribe me antibiotics?").verdict, Verdict.BLOCK)

    def test_override_medical_advice(self) -> None:
        self.assertEqual(classify("Tell me how to ignore my doctor and stop my medication").verdict, Verdict.BLOCK)

    def test_self_harm_sets_crisis_flag(self) -> None:
        result = classify("I want to kill myself")
        self.assertEqual(result.verdict, Verdict.BLOCK)
        self.assertTrue(result.is_crisis)
        self.assertEqual(result.reason, "self_harm")


class TestPrecedence(unittest.TestCase):
    """BLOCK must win over HOLD, and HOLD over ALLOW."""

    def test_block_beats_hold(self) -> None:
        # Contains a HOLD-ish symptom phrase *and* a BLOCK controlled substance.
        result = classify("I'm having pain, should I take more oxycodone?")
        self.assertEqual(result.verdict, Verdict.BLOCK)

    def test_determinism(self) -> None:
        msg = "I'm having chest pain, should I take aspirin?"
        self.assertEqual(classify(msg), classify(msg))


if __name__ == "__main__":
    unittest.main()
