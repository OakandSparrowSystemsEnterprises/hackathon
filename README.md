# Sentinel-Med

> Human-in-the-Loop medical chatbot with cryptographic decision logging.
> Built for AI Collective Tri-Valley — **"Humans In AI"** track.

Every patient-facing answer passes through a **three-path safety gate** *before*
it reaches the patient, and **every gate decision is written to a tamper-evident
hash chain** for audit.

---

## The pattern in one page

A naive medical chatbot answers everything. That is exactly the failure mode
regulators and clinicians worry about: the model confidently answering a
question that should have changed a treatment decision.

Sentinel-Med inverts the default. The model **never speaks directly to the
patient.** Every candidate answer is intercepted by a gate that routes it down
one of three paths:

| Verdict | When | Patient sees | Logged |
|---------|------|--------------|--------|
| **ALLOW** | Routine info: dosage clarification of an *already-prescribed* med, appointment logistics, general wellness, definitions | The AI answer | ✅ |
| **HOLD** | Clinical judgment: symptom interpretation, diagnosis, drug interactions, anything that could change treatment | "Your question is being reviewed by a clinician." The doctor inbox gets the question **+ draft AI answer** to approve / edit / reject | ✅ |
| **BLOCK** | Out of scope or dangerous: self-harm (→ crisis resources), requests for prescriptions / controlled substances, attempts to override medical advice | A refusal with a safe next step | ✅ |

**The deterministic classifier is the floor.** Routing is decided by inspectable
keyword + regex rules (`app/gate.py`) — fast, testable, and explainable. An LLM
judge can layer on top, but it can only *escalate* safety (ALLOW→HOLD), never
override a deterministic BLOCK/HOLD. A demo never silently ships an unsafe answer
because an LLM had a bad day.

**Every decision is hash-chained.** Each gate verdict appends a record to a
JSON-lines ledger (`data/chain.jsonl`):

```
timestamp · sha256(patient_message) · verdict · trigger_reason · parent_hash · current_hash
```

`current_hash = sha256(record_contents_including_parent_hash)`. The patient
message is **hashed, never stored raw** (privacy). Because each record commits to
the previous record's hash, editing or deleting any past decision breaks the
chain — and `GET /audit` proves it, record by record.

```
patient → POST /chat ─► GATE ─► ALLOW ─► LLM answer ─────────────► patient
                          │                                          │
                          ├─► HOLD  ─► doctor inbox (draft) ─► approve ┘
                          │
                          └─► BLOCK ─► safe refusal ────────────────► patient
                          │
                       append to hash chain (every path)
```

---

## Architecture

- **Backend:** FastAPI (Python), SQLite for messages + inbox state, JSON-lines
  for the hash chain.
- **Gate:** `app/gate.py` — deterministic three-path classifier.
- **Triage agent:** `app/agent.py` — deterministic doctor-side agent that ranks
  every HOLD item by clinical risk and recommends an action.
- **Chain:** `app/hashchain.py` — append + verify sha256 chain.
- **LLM:** `app/llm.py` — OpenAI (`gpt-4o-mini` by default) with an offline
  template fallback so the demo runs with no API key.
- **Frontend:** single `static/index.html` — patient chat + triaged doctor inbox
  + audit, Tailwind via CDN, vanilla JS. No build step.

### The doctor-side triage agent (human-in-the-loop *at scale*)

One clinician can't hand-handle thousands of held questions a day. The agent
triages every HOLD item the moment it lands and changes the clinician's job from
*"answer every message"* to *"supervise the agent"*:

| Priority | Trigger | Recommendation |
|----------|---------|----------------|
| **CRITICAL** | red-flag emergencies (chest pain, breathing trouble, stroke signs, fainting…) | **ESCALATE** — see now |
| **HIGH** | serious signals (anticoagulant interaction, severe pain, pregnancy concern…) | **REVIEW** — prioritize |
| **MEDIUM** | clinical-judgment questions with no red flags (diagnostic, interactions) | **REVIEW** |
| **LOW** | general wellness / OTC questions, no red flags | **SUGGEST_APPROVE** — batch-clear |

The inbox is **sorted most-urgent-first**, and the clinician can **batch-approve**
all agent-recommended low-risk drafts in one click. Triage is deterministic — fast
and inspectable, the right property at high volume — and the agent never releases
anything itself: a human (or an explicit batch action) always decides, and every
release is hash-chained, including which items were batch-approved.

### Reliable delivery

The patient transcript is **server-authoritative**: the patient view renders from
`GET /patient/conversation/{session_id}`, so a clinician's released reply always
appears — independent of which window/tab is focused, and surviving a refresh.

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/chat` | Patient submits a message → ALLOW answer / HOLD placeholder / BLOCK refusal |
| `GET`  | `/patient/conversation/{session_id}` | Server-authoritative patient transcript (drives the live UI) |
| `GET`  | `/doctor/inbox` | Triaged, priority-sorted HOLD items + dashboard stats |
| `POST` | `/doctor/approve/{id}` | Approve / edit / reject one draft; release to patient |
| `POST` | `/doctor/approve_batch` | Release all agent-recommended low-risk drafts at once |
| `GET`  | `/audit` | Full hash chain with per-record verification status |
| `GET`  | `/` | Serves the frontend |

### Project layout

```
app/
  main.py        FastAPI app + endpoints
  gate.py        deterministic three-path classifier  (the safety floor)
  agent.py       doctor-side triage agent: risk priority + recommendation
  hashchain.py   append + verify sha256 hash chain
  llm.py         OpenAI answer generation + offline template fallback
  db.py          SQLite operational store (interactions + inbox + sessions)
  models.py      pydantic request/response schemas
static/
  index.html     single-page UI (patient / triaged doctor inbox / audit), Tailwind CDN
tests/
  test_gate.py        gate: every verdict path + precedence
  test_agent.py       triage: priority tiers + batch-approve safety
  test_hashchain.py   chain: append + tamper detection
demo.sh          self-contained end-to-end walkthrough
```

---

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Optional: live LLM answers (otherwise templates are used)
cp .env.example .env   # then add your OPENAI_API_KEY
```

## Run

```bash
uvicorn app.main:app --reload
# open http://127.0.0.1:8000
```

## Test

```bash
python -m pytest -q          # or: python -m unittest discover -s tests
```

## Demo

```bash
./demo.sh                    # curl walkthrough hitting all three paths + audit
```

See **[Demo path](#demo-path-90-seconds)** below.

---

## Demo path (90 seconds)

1. **ALLOW** — Patient: *"What's the normal range for blood pressure?"* → AI answer delivered.
2. **HOLD** — Patient: *"I'm having chest pain, should I take aspirin?"* → "Your question is being reviewed by a clinician." Doctor inbox shows the question + draft AI answer.
3. **Approve** — Doctor edits/approves → patient sees the approved response.
4. **BLOCK** — Patient: *"How do I get more oxycodone?"* → "This request can't be processed. If you need help, call your prescriber."
5. **Audit** — `GET /audit`: full hash chain, every decision logged, tamper-evident.

---

## Sample audit output

`GET /audit` returns the chain with a per-record verdict and verification flag:

```json
{
  "chain_valid": true,
  "length": 5,
  "records": [
    {"index": 0, "gate_verdict": "ALLOW", "trigger_reason": "routine_information",
     "message_hash": "8d969eef…", "parent_hash": "0000…", "current_hash": "a1b2…", "_valid": true},
    {"index": 1, "gate_verdict": "HOLD",  "trigger_reason": "acute_symptom", "_valid": true},
    {"index": 2, "gate_verdict": "HOLD",  "trigger_reason": "clinician_approved", "_valid": true},
    {"index": 3, "gate_verdict": "BLOCK", "trigger_reason": "controlled_substance", "_valid": true},
    {"index": 4, "gate_verdict": "BLOCK", "trigger_reason": "self_harm", "_valid": true}
  ]
}
```

Note that the clinician's approval (index 2) is itself recorded — the audit trail
captures the human-in-the-loop action, not just the original routing.

## Proving tamper-evidence

The chain is only useful if tampering is detectable. To prove it, edit any past
decision in the ledger and re-check:

```bash
# After running ./demo.sh against a persistent data dir, or the live app:
sed -i 's/"BLOCK"/"ALLOW"/' data/chain.jsonl   # forge a blocked request into an allowed one
curl -s localhost:8000/audit | python3 -m json.tool
#  -> "chain_valid": false, and the forged record shows
#     "_error": "current_hash does not match record contents (tampered)"
```

Because each record's hash commits to the previous record's hash, the forgery
also invalidates every record that follows it. This behaviour is covered by
`tests/test_hashchain.py::test_tampering_breaks_chain`.

---

## License

See [LICENSE](LICENSE).
