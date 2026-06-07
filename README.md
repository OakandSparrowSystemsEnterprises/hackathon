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
- **Chain:** `app/hashchain.py` — append + verify sha256 chain.
- **LLM:** `app/llm.py` — OpenAI (`gpt-4o-mini` by default) with an offline
  template fallback so the demo runs with no API key.
- **Frontend:** single `static/index.html` — patient chat + doctor inbox,
  Tailwind via CDN, vanilla JS. No build step.

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/chat` | Patient submits a message → ALLOW answer / HOLD placeholder / BLOCK refusal |
| `GET`  | `/doctor/inbox` | Pending HOLD items (question + draft answer) |
| `POST` | `/doctor/approve/{id}` | Approve or edit a draft; release to patient |
| `GET`  | `/audit` | Full hash chain with per-record verification status |
| `GET`  | `/` | Serves the frontend |

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

## License

See [LICENSE](LICENSE).
