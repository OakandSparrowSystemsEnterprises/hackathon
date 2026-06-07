"""Answer generation: MiniMax when configured, deterministic templates otherwise.

The LLM only ever produces *candidate* text. It runs after the deterministic
gate (see ``app/gate.py``) and never decides routing -- so a model outage or a
bad completion can never ship an unsafe answer past the gate.

If ``MINIMAX_API_KEY`` is unset (or the ``openai`` package is unavailable),
this module falls back to keyword-matched templates so the demo always runs.
"""

from __future__ import annotations

import os

MINIMAX_BASE_URL = "https://api.minimax.io/v1"
MODEL = os.environ.get("MINIMAX_MODEL", "MiniMax-Text-01")

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


# Ordered (keywords, answer) templates. The first entry whose *any* keyword is a
# substring of the lowercased message wins, so list more specific topics first.
# These keep the demo fully functional with no API key — and give plausible
# answers to off-script questions a judge might try.
_TEMPLATES: list[tuple[tuple[str, ...], str]] = [
    (
        ("chest pain", "aspirin"),
        "Chest pain can have many causes, some serious. Aspirin is sometimes used during a "
        "suspected heart attack, but whether it's appropriate depends on the patient's history "
        "and current medications. This should be confirmed by a clinician; if symptoms are severe "
        "or sudden, emergency care is warranted.",
    ),
    (
        ("blood pressure", "hypertension", "bp reading"),
        "A normal resting blood pressure for most adults is around 120/80 mmHg. Readings of "
        "130/80 mmHg or higher are generally considered elevated. Individual targets vary, so "
        "check with your clinician about your own goal.",
    ),
    (
        ("heart rate", "pulse", "bpm", "heartbeat"),
        "A normal resting heart rate for most adults is about 60 to 100 beats per minute. Athletes "
        "and very fit people are often lower. Persistently high, low, or irregular readings are "
        "worth discussing with your clinician.",
    ),
    (
        ("temperature", "fever", "how hot"),
        "Normal body temperature is around 98.6°F (37°C), though it varies through the day. A "
        "temperature of 100.4°F (38°C) or higher is generally considered a fever. Seek care for a "
        "high or persistent fever, or any fever in a very young infant.",
    ),
    (
        ("blood sugar", "glucose", "a1c", "hba1c"),
        "For someone without diabetes, a normal fasting blood glucose is roughly 70 to 99 mg/dL, "
        "and an A1c below 5.7% is considered normal. Personal targets differ, especially if you "
        "have diabetes, so confirm your goals with your clinician.",
    ),
    (
        ("cholesterol", "ldl", "hdl", "triglyceride"),
        "General targets for many adults are a total cholesterol under 200 mg/dL and LDL under "
        "100 mg/dL, with higher HDL being favorable. Your personal target depends on your overall "
        "cardiovascular risk — your clinician can set the right goal for you.",
    ),
    (
        ("bmi", "body mass index", "healthy weight", "overweight"),
        "Body mass index (BMI) between 18.5 and 24.9 is generally classified as a healthy weight "
        "for adults. BMI is a rough screening tool and doesn't capture everything, so use it as a "
        "starting point for a conversation with your clinician.",
    ),
    (
        ("water", "hydrate", "hydration", "how much should i drink", "fluids"),
        "A common general guideline is about 2 to 3 liters of fluids per day for healthy adults, "
        "adjusted for activity, climate, and medical conditions. Ask your clinician if you have "
        "heart or kidney conditions that affect how much fluid you should take in.",
    ),
    (
        ("sleep", "how many hours", "insomnia"),
        "Most adults do best with about 7 to 9 hours of sleep per night. Consistent timing, a dark "
        "cool room, and limiting screens before bed help. Talk to your clinician if you regularly "
        "can't fall or stay asleep.",
    ),
    (
        ("exercise", "workout", "steps", "physical activity"),
        "A widely used guideline is about 150 minutes of moderate aerobic activity per week, plus "
        "muscle-strengthening on two days. If you've been inactive or have a heart or joint "
        "condition, check with your clinician before ramping up.",
    ),
    (
        ("ibuprofen", "advil", "tylenol", "acetaminophen", "naproxen", "over the counter", "otc"),
        "For over-the-counter pain relievers, follow the dosing on the package label and don't "
        "exceed the daily maximum. These can interact with other conditions and medications, so "
        "confirm with your clinician or pharmacist if you take other drugs or have liver, kidney, "
        "or stomach issues.",
    ),
    (
        ("headache", "migraine"),
        "Occasional headaches are common and often related to stress, dehydration, eyestrain, or "
        "lack of sleep. Seek prompt care for a sudden 'worst-ever' headache, one with fever and a "
        "stiff neck, or any headache with weakness, confusion, or vision changes.",
    ),
    (
        ("dizzy", "dizziness", "lightheaded", "vertigo"),
        "Dizziness can come from dehydration, standing up too quickly, inner-ear issues, or "
        "medication effects, among others. Because it has many causes, a clinician should help "
        "interpret it — seek urgent care if it comes with chest pain, fainting, or slurred speech.",
    ),
    (
        ("nausea", "vomit", "throwing up"),
        "Short-lived nausea is often due to a viral illness or something you ate; small sips of "
        "fluid and bland foods can help. Seek care for severe or persistent vomiting, signs of "
        "dehydration, or vomiting with severe abdominal pain.",
    ),
    (
        ("rash", "itch", "hives", "skin"),
        "Many rashes are mild and self-limited, but some signal an allergic reaction or infection. "
        "Seek urgent care if a rash comes with trouble breathing, facial swelling, or a rapidly "
        "spreading painful area. Otherwise, a clinician can help identify the cause.",
    ),
    (
        ("diabetes",),
        "Diabetes is a condition where blood sugar runs too high, either because the body makes too "
        "little insulin or doesn't use it well. Management typically combines diet, activity, "
        "monitoring, and sometimes medication. Your clinician can tailor a plan to you.",
    ),
    (
        ("covid", "flu shot", "vaccine", "vaccination", "immunization"),
        "Routine vaccinations, including seasonal flu and COVID-19 boosters, are recommended for "
        "most people, with timing based on age and health history. Your clinic can tell you which "
        "are due for you and schedule them.",
    ),
    (
        ("diet", "nutrition", "lose weight", "eat healthy"),
        "A generally healthy pattern emphasizes vegetables, fruit, whole grains, lean protein, and "
        "limited added sugar and ultra-processed foods. Sustainable changes beat crash diets. For a "
        "plan tailored to your health conditions, ask your clinician or a dietitian.",
    ),
    (
        ("smoking", "quit smoking", "vaping", "nicotine"),
        "Quitting tobacco is one of the highest-impact things you can do for your health, and "
        "support roughly doubles your odds of success. Counseling and approved cessation aids help "
        "— your clinician can set you up, and 1-800-QUIT-NOW is a free resource.",
    ),
    (
        ("appointment", "reschedule", "cancel", "booking", "schedule a visit"),
        "You can book, reschedule, or cancel through the patient portal's Appointments tab, or by "
        "calling the clinic front desk during business hours.",
    ),
    (
        ("refill", "pharmacy", "portal", "pick up", "results"),
        "Routine refills and test results are available through the patient portal, and your "
        "pharmacy can confirm pickup times. For anything urgent, call the clinic directly.",
    ),
]

_GENERIC = (
    "Here's some general health information. For anything specific to your situation — your "
    "history, your medications, or symptoms you're experiencing — please consult your clinician, "
    "who can give you advice tailored to you."
)


def _fallback(message: str, *, for_review: bool) -> str:
    """Keyword-matched canned response, used when OpenAI is unavailable.

    Args:
        message: The patient's message.
        for_review: When True, appends a clinician confirmation note (HOLD drafts).
    """
    m = (message or "").lower()
    base = next((answer for keywords, answer in _TEMPLATES if any(k in m for k in keywords)), _GENERIC)
    if for_review:
        base += " [Clinician: please confirm appropriateness for this patient before release.]"
    return base


def generate(message: str, *, for_review: bool = False) -> str:
    """Generate a candidate answer using MiniMax.

    Args:
        message: The patient's message.
        for_review: When True, draft text intended for a clinician to approve
            (HOLD path); otherwise a patient-facing answer (ALLOW path).

    Returns:
        Generated text, falling back to a template if MiniMax is unavailable.
    """
    api_key = os.environ.get("MINIMAX_API_KEY")
    if not api_key:
        return _fallback(message, for_review=for_review)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key, base_url=MINIMAX_BASE_URL)
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
        return _fallback(message, for_review=for_review)
