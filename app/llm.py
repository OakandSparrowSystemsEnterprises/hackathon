"""Answer generation: OpenAI when configured, deterministic templates otherwise.

The LLM only ever produces *candidate* text. It runs after the deterministic
gate (see ``app/gate.py``) and never decides routing — so a model outage or a
bad completion can never ship an unsafe answer past the gate.

If ``OPENAI_API_KEY`` is unset (or the ``openai`` package is unavailable), this
module falls back to keyword-matched templates so the demo always runs.
"""

from __future__ import annotations

import os

MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

_PATIENT_SYSTEM = (
    "You are a careful medical information assistant for a patient portal. "
    "Provide brief, factual, general health information only. Do not diagnose, "
    "do not recommend changing any treatment, and remind the patient to consult "
    "their clinician for personal medical decisions. Keep it to 2-4 sentences."
)

_REVIEW_SYSTEM = (
    "You are drafting a response for a CLINICIAN to review before it reaches a "
    "patient. The patient's question involves clinical judgment. Draft a careful, "
    "factual answer the clinician can approve or edit. Note any red flags or "
    "information you would want the clinician to confirm. Keep it to 3-5 sentences."
)


def _fallback(message: str, *, for_review: bool) -> str:
    """Keyword-matched canned responses used when OpenAI is unavailable."""
    m = message.lower()
    if "blood pressure" in m:
        base = (
            "A normal resting blood pressure for most adults is around 120/80 mmHg. "
            "Readings of 130/80 mmHg or higher are generally considered elevated. "
            "Individual targets vary, so check with your clinician about your own goal."
        )
    elif "chest pain" in m or "aspirin" in m:
        base = (
            "Chest pain can have many causes, some serious. Aspirin is sometimes used "
            "during a suspected heart attack, but whether it is appropriate depends on "
            "the patient's history and current medications. This should be confirmed by "
            "a clinician; if symptoms are severe or sudden, emergency care is warranted."
        )
    elif "water" in m or "drink" in m:
        base = (
            "A common general guideline is about 2 to 3 liters of fluids per day for "
            "healthy adults, adjusted for activity, climate, and medical conditions. "
            "Ask your clinician if you have heart or kidney conditions that affect fluid intake."
        )
    elif "appointment" in m or "reschedule" in m:
        base = (
            "You can reschedule through the patient portal's Appointments tab or by "
            "calling the clinic front desk during business hours."
        )
    else:
        base = (
            "Here is some general health information. For anything specific to your "
            "situation, please consult your clinician."
        )
    if for_review:
        base += " [Clinician: please confirm appropriateness for this patient before release.]"
    return base


def generate(message: str, *, for_review: bool = False) -> str:
    """Generate a candidate answer.

    Args:
        message: The patient's message.
        for_review: When True, draft text intended for a clinician to approve
            (HOLD path); otherwise a patient-facing answer (ALLOW path).

    Returns:
        Generated text, falling back to a template if OpenAI is unavailable.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return _fallback(message, for_review=for_review)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        system = _REVIEW_SYSTEM if for_review else _PATIENT_SYSTEM
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": message},
            ],
            temperature=0.2,
            max_tokens=300,
        )
        content = (resp.choices[0].message.content or "").strip()
        return content or _fallback(message, for_review=for_review)
    except Exception:
        # Any API/SDK failure degrades gracefully to the offline template.
        return _fallback(message, for_review=for_review)
