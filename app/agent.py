"""Doctor-side triage agent.

A single clinician may face thousands of HOLD items a day. Hand-handling each one
doesn't scale, so this agent triages every held item the moment it lands:

  * assigns a clinical **priority** (CRITICAL / HIGH / MEDIUM / LOW),
  * makes a **recommendation** (ESCALATE / REVIEW / SUGGEST_APPROVE),
  * extracts the **urgency signals** that drove the call, and
  * carries the AI **draft** for the clinician to approve, edit, or reject.

This keeps the human in the loop while changing their job from "answer every
message" to "supervise the agent": jump on the critical few, batch-clear the safe
many. Like the gate (``app/gate.py``), triage is **deterministic** — fast,
inspectable, and identical every run — which is exactly what you want when the
volume is high and the stakes are clinical. The agent never releases anything on
its own; it only ranks and recommends. A human (or an explicit batch action)
always makes the release decision, and every release is hash-chained.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import IntEnum


class Priority(IntEnum):
    """Clinical priority. Lower value sorts first (most urgent on top)."""

    CRITICAL = 0
    HIGH = 1
    MEDIUM = 2
    LOW = 3

    @property
    def label(self) -> str:
        return self.name


# Recommendation strings the UI keys off of.
ESCALATE = "ESCALATE"            # urgent: a clinician should see this now
REVIEW = "REVIEW"               # needs a human read before release
SUGGEST_APPROVE = "SUGGEST_APPROVE"  # low-risk; safe to batch-approve the draft


@dataclass
class Triage:
    """The agent's assessment of one held item."""

    priority: Priority
    recommendation: str
    confidence: float
    rationale: str
    urgency_signals: list[str] = field(default_factory=list)


def _compile(pairs: list[tuple[str, str]]) -> list[tuple[str, re.Pattern[str]]]:
    return [(label, re.compile(pat, re.IGNORECASE)) for label, pat in pairs]


# CRITICAL: potential emergencies. A clinician should look immediately.
_CRITICAL_SIGNALS = _compile(
    [
        ("chest pain", r"\bchest (pain|pressure|tightness)\b"),
        ("breathing difficulty", r"\b(shortness of breath|can'?t breathe|difficulty breathing|gasping)\b"),
        ("stroke signs", r"\b(slurred|slurring|face (is )?(droop|drooping)|drooping|sudden numbness|numbness on one side|weak(ness)? on one side|paralys|can'?t move (my|one))\b"),
        ("loss of consciousness", r"\b(passed out|fainted|unconscious|blacked out|unresponsive)\b"),
        ("seizure", r"\bseizure|convulsion\b"),
        ("severe bleeding", r"\b(severe bleeding|bleeding (a lot|heavily)|won'?t stop bleeding|blood in (my )?(stool|urine|vomit))\b"),
        ("anaphylaxis", r"\b(throat (closing|swelling)|trouble swallowing|tongue swelling|anaphylaxis)\b"),
        ("thunderclap headache", r"\b(worst headache|sudden severe headache)\b"),
        ("cardiac/stroke event", r"\b(heart attack|stroke)\b"),
    ]
)

# LOW-RISK topics: general wellness / lifestyle / routine OTC. With no red-flag
# signals, the agent is comfortable recommending the draft for batch approval.
_LOW_RISK_TOPICS = _compile(
    [
        ("wellness / lifestyle", r"\b(vitamin|supplement|multivitamin|probiotic|stretch|stretching|"
         r"warm[\s-]?up|exercise|workout|jog|running|walk|steps|sleep|nap|hydrat|water intake|"
         r"diet|nutrition|healthy eating|sunscreen|posture|meditat|caffeine|"
         r"acetaminophen|tylenol|ibuprofen|advil)\b"),
    ]
)

# Gate reasons that always need a human read, even on a low-risk-sounding topic.
_ALWAYS_REVIEW = {"medication_interaction", "diagnostic_question"}

# HIGH: serious but not obviously an emergency.
_HIGH_SIGNALS = _compile(
    [
        ("high fever", r"\b(high fever|fever (of )?(10[2-9]|1[1-9]\d)|104)\b"),
        ("severe pain", r"\b(severe|excruciating|unbearable) (pain|cramp)\b"),
        ("persistent vomiting", r"\b(can'?t keep (anything|fluids) down|vomiting for|keep throwing up)\b"),
        ("dehydration", r"\bdehydrat(ed|ion)\b"),
        ("anticoagulant interaction", r"\b(warfarin|coumadin|blood thinner|eliquis|xarelto|insulin)\b"),
        ("pregnancy concern", r"\b(pregnan|trimester|miscarriage)\b"),
    ]
)


def triage(patient_message: str, *, gate_reason: str = "") -> Triage:
    """Assess a held patient message and return a :class:`Triage`.

    Args:
        patient_message: The raw patient message (already routed HOLD by the gate).
        gate_reason: The gate rule that fired, used to refine MEDIUM vs LOW.

    Returns:
        A deterministic triage assessment.
    """
    text = patient_message or ""

    critical = [label for label, pat in _CRITICAL_SIGNALS if pat.search(text)]
    if critical:
        return Triage(
            priority=Priority.CRITICAL,
            recommendation=ESCALATE,
            confidence=0.98,
            rationale="Possible emergency — " + ", ".join(critical) + ". Review immediately.",
            urgency_signals=critical,
        )

    high = [label for label, pat in _HIGH_SIGNALS if pat.search(text)]
    if high:
        return Triage(
            priority=Priority.HIGH,
            recommendation=REVIEW,
            confidence=0.9,
            rationale="Serious signal(s): " + ", ".join(high) + ". Prioritize for review.",
            urgency_signals=high,
        )

    # No red flags. Low-risk wellness/OTC topics are safe to batch-approve; genuine
    # diagnostic or interaction questions always get a human read.
    low_risk = [label for label, pat in _LOW_RISK_TOPICS if pat.search(text)]
    if low_risk and gate_reason not in _ALWAYS_REVIEW:
        return Triage(
            priority=Priority.LOW,
            recommendation=SUGGEST_APPROVE,
            confidence=0.82,
            rationale="General wellness/OTC question, no red flags. AI draft appears appropriate — safe to batch-approve.",
            urgency_signals=[],
        )

    # Everything else: a clinical-judgment question that needs a human read.
    return Triage(
        priority=Priority.MEDIUM,
        recommendation=REVIEW,
        confidence=0.8,
        rationale="Clinical-judgment question with no red-flag signals. Standard review.",
        urgency_signals=[],
    )
