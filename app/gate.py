"""Deterministic three-path safety gate.

This module is the *floor* of Sentinel-Med's safety model. It decides whether a
patient message is routed ALLOW (deliver the AI answer), HOLD (route to a
clinician), or BLOCK (refuse / crisis resources) using inspectable keyword +
regex rules. No network, no model — fast and fully testable.

Evaluation order is strict and deterministic:

    BLOCK  > HOLD  > ALLOW

The most safety-critical rules win. An optional LLM judge may run *after* this
classifier, but it may only escalate toward safety (e.g. ALLOW -> HOLD); it can
never downgrade a deterministic BLOCK or HOLD. That guarantee lives in the
caller (see ``app/llm.py`` / ``app/main.py``); this module is the source of
truth for the deterministic verdict.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum


class Verdict(str, Enum):
    """The three gate paths."""

    ALLOW = "ALLOW"
    HOLD = "HOLD"
    BLOCK = "BLOCK"


@dataclass(frozen=True)
class GateResult:
    """Outcome of classifying a single patient message.

    Attributes:
        verdict: One of :class:`Verdict`.
        reason: Machine-readable rule identifier that fired (e.g. ``"self_harm"``).
        category: Human-readable grouping for the UI / audit log.
        is_crisis: True when a self-harm rule fired, so the caller can surface
            crisis resources instead of a generic refusal.
    """

    verdict: Verdict
    reason: str
    category: str
    is_crisis: bool = False


# A rule is (reason, category, compiled_regex). Order within a tier matters:
# the first match wins, so list the most specific / severe patterns first.
Rule = tuple[str, str, re.Pattern[str]]


def _compile(patterns: list[tuple[str, str, str]]) -> list[Rule]:
    """Compile (reason, category, pattern) triples into case-insensitive rules."""
    return [(reason, cat, re.compile(pat, re.IGNORECASE)) for reason, cat, pat in patterns]


# --------------------------------------------------------------------------- #
# BLOCK tier — dangerous or out of scope. Self-harm routes to crisis resources;
# everything else is a hard refusal.
# --------------------------------------------------------------------------- #
_BLOCK_RULES: list[Rule] = _compile(
    [
        # Self-harm / suicidal ideation -> crisis resources (handled specially).
        (
            "self_harm",
            "Self-harm / crisis",
            r"\b(kill myself|killing myself|end my life|ending my life|take my (own )?life|"
            r"want to die|wanna die|don'?t want to (live|be alive)|suicidal|suicide|"
            r"hurt myself|harm myself|self[\s-]?harm|cut myself|"
            r"overdose (on purpose|intentionally)|od on)\b",
        ),
        # Requests to obtain controlled substances / get more of a controlled drug.
        (
            "controlled_substance",
            "Controlled substance request",
            r"\b(oxycodone|oxycontin|hydrocodone|vicodin|percocet|fentanyl|morphine|"
            r"codeine|adderall|ritalin|xanax|alprazolam|valium|diazepam|klonopin|"
            r"ativan|ambien|tramadol|methadone|ketamine|opioids?)\b",
        ),
        # Generic prescription-acquisition / med-seeking phrasing.
        (
            "prescription_request",
            "Prescription acquisition",
            r"\b((get|getting|obtain|score|buy|buying|purchase|refill(ing)?)\b"
            r"[^.?!]*\b(prescription|controlled|narcotics?|pills?|meds?|"
            r"without (a |my )?(doctor|prescriber|prescription))\b|"
            r"prescribe me\b|write me a (script|prescription))",
        ),
        # Attempts to override / disregard clinical advice.
        (
            "override_medical_advice",
            "Override of medical advice",
            r"\b(ignore|override|overrule|disregard|go against|stop following)\b"
            r"[^.?!]*\b(doctor|physician|clinician|prescriber|medical advice|my (meds|medication))\b",
        ),
    ]
)


# --------------------------------------------------------------------------- #
# HOLD tier — clinical judgment territory. Routed to a clinician.
# --------------------------------------------------------------------------- #
_HOLD_RULES: list[Rule] = _compile(
    [
        # Medication interaction questions.
        (
            "medication_interaction",
            "Medication interaction",
            r"\b(interact(ion|s)?|mix|combine|together with|along with|"
            r"take .* with|safe to take .* (with|and))\b",
        ),
        # Acute / red-flag symptoms.
        (
            "acute_symptom",
            "Acute symptom",
            r"\b(chest pain|shortness of breath|can'?t breathe|difficulty breathing|"
            r"severe (pain|bleeding|headache)|numbness|slurred speech|"
            r"passed out|fainted|seizure|stroke|heart attack|"
            r"blood in (my )?(stool|urine|vomit))\b",
        ),
        # Symptom interpretation / "should I" treatment decisions.
        (
            "symptom_interpretation",
            "Symptom interpretation",
            r"\b(should i (take|stop|start|use|increase|decrease|double)|"
            r"is it (safe|okay|ok|normal) (to|for me)|"
            r"do i need to (see|go to|call)|"
            r"my symptoms?|i('?m| am) (having|feeling|experiencing)|i feel|"
            r"i('?ve| have) been (having|feeling))\b",
        ),
        # Diagnostic questions.
        (
            "diagnostic_question",
            "Diagnostic question",
            r"\b(do i have|could (this|it) be|is this|what'?s wrong with me|"
            r"what (could|might) (be )?caus|am i (having|getting)|diagnos)\b",
        ),
    ]
)


def classify(message: str) -> GateResult:
    """Classify a patient message into one of the three gate paths.

    Args:
        message: Raw patient message text.

    Returns:
        A :class:`GateResult`. Empty/whitespace input is treated as routine
        (ALLOW) so the caller can decide how to handle it.

    The function is pure and deterministic: same input always yields the same
    verdict, which is what makes the audit chain meaningful.
    """
    text = (message or "").strip()
    if not text:
        return GateResult(Verdict.ALLOW, "empty_message", "Routine information")

    for reason, category, pattern in _BLOCK_RULES:
        if pattern.search(text):
            return GateResult(
                Verdict.BLOCK,
                reason,
                category,
                is_crisis=(reason == "self_harm"),
            )

    for reason, category, pattern in _HOLD_RULES:
        if pattern.search(text):
            return GateResult(Verdict.HOLD, reason, category)

    return GateResult(Verdict.ALLOW, "routine_information", "Routine information")
