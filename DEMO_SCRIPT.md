# Sentinel-Med — 90-Second Live Demo Script

**For the presenter (CEO). Read from a second monitor or printed sheet.**
Everything runs on your laptop at **http://127.0.0.1:8000**. No internet required.

Spoken lines are in **bold quotes**. Things you type are in `monospace`. Don't
improvise the patient questions — read them off this sheet so you never freeze.

---

## 1. Pre-demo checklist (do this before you walk up)

**Terminal** (from the repo root):

```bash
rm -rf data            # start with a clean, empty hash chain
uvicorn app.main:app   # serves on http://127.0.0.1:8000  (no --reload, more stable)
```

Verify it's alive — this must print `{"status":"ok"}`:

```bash
curl http://127.0.0.1:8000/health
```

**LLM mode — pick before you start:**
- **Bulletproof (recommended for stage):** leave `OPENAI_API_KEY` **unset**.
  Answers come from built-in templates — instant, offline, can't hang on bad wifi.
- **Live model:** set `OPENAI_API_KEY` in `.env` for richer answers. Only do this
  if the venue wifi is solid. The safety gate works identically either way.

**Two browser windows, side by side, both at** `http://127.0.0.1:8000`:
- **LEFT = PATIENT** → click the **Patient Chat** tab.
- **RIGHT = DOCTOR** → click the **Doctor Inbox** tab.
- **THIRD tab (in the LEFT window), not yet shown** → click the **Audit Log** tab,
  then switch back to Patient Chat. (Raw proof lives at `http://127.0.0.1:8000/audit`.)

**Clear / verify:**
- Browser zoom to **150%** (`Cmd/Ctrl` + a few times) so judges can read it.
- **Do Not Disturb on.** Close Slack/email/other tabs.
- Reload both windows so the chat log is empty and the inbox badge shows **0**.
- Cursor already clicked into the patient input box.

---

## 2. The script

### ⏱ Beat 1 — Frame the problem (0:00–0:10)
**Action:** Stand still. Patient window full attention. Don't type yet.

> **"Medical AI is here. But a model that hallucinates a dosage can kill someone.
> This track asks how humans stay in the loop. This is one answer."**

---

### ⏱ Beat 2 — ALLOW (0:10–0:25)
**Action:** In the **patient** box, type and send:

```
What's the normal range for blood pressure?
```

**Judges see:** an answer appears **immediately**, tagged green **ALLOW**.

> **"A routine question gets a routine answer — instantly. But watch this."**

**Action:** Click the **Audit Log** tab (left window) for one second, point at the
new green row, then click back to **Patient Chat**.

> **"That decision is already hashed and logged. Every answer is."**

---

### ⏱ Beat 3 — HOLD (0:25–0:50)
**Action:** Back in the **patient** box, type and send:

```
I've been having chest pain when I climb stairs. Should I take aspirin?
```

**Judges see:** the patient does **not** get a medical answer — an amber **HOLD**
message: *"Your question is being reviewed by a clinician."*

> **"This one is clinical judgment. The model has an opinion — the patient never
> sees it. It goes to a human first."**

**Action:** Turn to the **RIGHT (doctor) window.** Click **↻ Refresh** if needed.

**Judges see:** the doctor's inbox now holds the question **and the AI's draft answer**.

> **"The clinician sees the question, and the AI's draft. They stay in control."**

**Action:** Click into the draft box, tweak one line (e.g. change it to:)

```
Please don't take aspirin on your own. Come in today for an ECG — call 911 if the pain worsens.
```

Then click **Approve & release**.

**Action:** Turn back to the **LEFT (patient) window**. Wait ~2 seconds.

**Judges see:** a new green **Clinician decision** bubble appears in the patient
chat — the approved, human-reviewed response, delivered live.

> **"The patient gets the answer a clinician signed off on. Not the model's guess."**

---

### ⏱ Beat 4 — BLOCK (0:50–1:05)
**Action:** In the **patient** box, type and send:

```
How do I get more oxycodone without seeing my doctor?
```

**Judges see:** a red **BLOCK** — the request is refused with a safe redirect
(*"call your prescriber"*).

> **"Drug-seeking, self-harm, anything dangerous — blocked, with a safe redirect.
> And just like the others, it's logged."**

*(Optional, if time: the same gate sends self-harm questions to the 988 crisis line.)*

---

### ⏱ Beat 5 — The audit chain (1:05–1:25)
**Action:** Click the **Audit Log** tab in the left window.

**Judges see:** every decision in order — ALLOW, HOLD, the clinician's approval,
BLOCK — each with a **green ✓** and a **"chain valid"** badge at the top.

> **"Every gate decision, cryptographically chained. Each record locks the one
> before it."**

**Action:** Point at the **✓ chain valid** badge.

> **"This is tamper-evident. Change one record and the whole chain breaks. That's
> how you make AI accountable — not by trusting it, but by witnessing it."**

---

### ⏱ Beat 6 — Land the line (1:25–1:30)
**Action:** Step back from the laptop. Look at the judges.

> **"The track asked how humans stay in the loop. The answer is: they have to be
> enforced into it. That's what Sentinel-Med does."**

---

## 3. Recovery moves (if something breaks)

| Symptom | Fix in 5 seconds | What to say while you do it |
|---|---|---|
| **Page won't load / server died** | In terminal: `Ctrl+C`, then `uvicorn app.main:app`. Refresh both windows. | *"One second — bringing the service back up."* |
| **Answer hangs / model is slow** | The app auto-falls-back to templates on error. If it's still spinning: `Ctrl+C`, run `unset OPENAI_API_KEY`, then `uvicorn app.main:app`, refresh. | *"We don't depend on the model for safety — the gate is deterministic and runs offline. Watch."* (Turn it into the point.) |
| **Inbox doesn't show the held item** | Click **↻ Refresh** in the doctor window. | *"Pulling the latest."* |
| **Patient bubble didn't update after approve** | It polls every ~2.5s — wait one beat, or click the Patient Chat tab again. | *"It's delivering now."* |
| **Audit looks empty / stale** | Click **↻ Refresh** on the Audit Log tab. | — |
| **Typo / wrong verdict fired** | Clear the box, retype the exact line from this sheet. | *"Let me ask that the way a patient would."* |
| **Total freeze** | Hard refresh both windows: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R`. | *"Fresh load."* |

**Golden rule:** the deterministic gate needs no internet and no model. If the
LLM is down, the three paths and the hash chain still work — say so out loud, it
*strengthens* the pitch.

---

## 4. The one line that lands the architecture

> **"You don't make AI safe by trusting it. You make it safe by witnessing it —
> every decision, gated by a human and chained in cryptographic proof."**

---

### URLs at a glance
- Patient & Doctor UI: **http://127.0.0.1:8000** (Patient Chat / Doctor Inbox tabs)
- Audit log (visual): **http://127.0.0.1:8000** → **Audit Log** tab
- Audit log (raw proof): **http://127.0.0.1:8000/audit**
- Health check: **http://127.0.0.1:8000/health**

### Type-ahead cheat sheet (the three lines, in order)
1. `What's the normal range for blood pressure?`
2. `I've been having chest pain when I climb stairs. Should I take aspirin?`
3. `How do I get more oxycodone without seeing my doctor?`

### Safe backup questions (all have real built-in answers, even offline)
If a judge asks you to "try something else," any of these will return a solid
answer — they don't depend on the LLM:

**ALLOW (instant answer):**
- `What's a normal resting heart rate?`
- `Is 101 degrees a fever?`
- `How many hours of sleep should an adult get?`
- `What's a healthy BMI?`
- `When should I get a flu shot?`
- `How do I reschedule my appointment?`

**HOLD (routes to the doctor inbox):**
- `I feel dizzy every time I stand up — is that serious?`
- `Can I take ibuprofen with my blood pressure medication?`

**BLOCK (refused):**
- `How do I get more oxycodone without seeing my doctor?`
- *(crisis variant, handle gently)* `I don't want to be alive anymore` → routes to the 988 crisis line.

> **Note on the HOLD → patient hand-off:** when the doctor approves, the answer
> now appears in the patient chat **instantly** (pushed cross-window), with a
> 2-second polling backup. You do not need to refresh the patient tab.
