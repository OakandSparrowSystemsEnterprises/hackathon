"""Sentinel-Med FastAPI application.

Wires the deterministic gate, the doctor-side triage agent, the hash-chain audit
log, the SQLite operational store, and answer generation into the patient +
clinician API.

Endpoints:
  POST /chat                       - patient submits a message (ALLOW/HOLD/BLOCK)
  GET  /patient/conversation/{sid} - server-authoritative patient transcript
  GET  /interaction/{id}           - single interaction state (lightweight poll)
  GET  /doctor/inbox               - triaged, priority-sorted HOLD items + stats
  POST /doctor/approve/{id}        - clinician approves/edits/rejects one item
  POST /doctor/approve_batch       - release all agent-recommended low-risk drafts
  GET  /audit                      - full hash chain + verification status
  GET  /                           - serves the frontend
"""

from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app import agent, llm
from app.auth import DEMO_USERS, create_token, require_doctor
from app.db import Database
from app.gate import Verdict, classify
from app.hashchain import HashChain, hash_message
from app.models import ApproveRequest, BatchApproveRequest, ChatRequest, ChatResponse, LoginRequest

# --------------------------------------------------------------------------- #
# Storage locations (override via env for tests / deployment).
# --------------------------------------------------------------------------- #
DATA_DIR = os.environ.get("SENTINEL_DATA_DIR", "data")
DB_PATH = os.environ.get("SENTINEL_DB_PATH", os.path.join(DATA_DIR, "sentinel.db"))
CHAIN_PATH = os.environ.get("SENTINEL_CHAIN_PATH", os.path.join(DATA_DIR, "chain.jsonl"))
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")

os.makedirs(DATA_DIR, exist_ok=True)

# --------------------------------------------------------------------------- #
# Patient-facing messages for non-ALLOW paths.
# --------------------------------------------------------------------------- #
HOLD_MESSAGE = "Your question is being reviewed by a clinician. You'll receive a response shortly."
BLOCK_MESSAGE = "This request can't be processed. If you need help, please call your prescriber."
CRISIS_MESSAGE = (
    "It sounds like you may be going through a very difficult time, and you deserve support right now. "
    "If you are in immediate danger, call 911. You can reach the 988 Suicide & Crisis Lifeline any time "
    "by calling or texting 988 (US), or visit https://988lifeline.org. You are not alone."
)

app = FastAPI(title="Sentinel-Med", version="2.0.0")

_allowed_origins = [o for o in [
    "http://localhost:3000",
    os.environ.get("FRONTEND_URL", ""),
] if o]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
db = Database(DB_PATH)
chain = HashChain(CHAIN_PATH)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}


@app.post("/auth/login")
def login(req: LoginRequest) -> dict[str, str]:
    """Authenticate with demo credentials and return a JWT."""
    user = DEMO_USERS.get(req.username)
    if user is None or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(req.username, user["role"])
    return {"token": token, "role": user["role"]}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    """Run a patient message through the gate and return a gated reply.

    Flow: classify -> append the verdict to the hash chain -> branch on verdict.
    HOLD items are additionally triaged by the doctor-side agent so they arrive in
    the inbox already prioritized. The hash chain is written for *every* path.
    """
    result = classify(req.message)
    msg_hash = hash_message(req.message)

    # Audit first: the decision is logged before any answer is composed/released.
    chain.append(message_hash=msg_hash, gate_verdict=result.verdict.value, trigger_reason=result.reason)

    if result.verdict is Verdict.ALLOW:
        answer = llm.generate(req.message, for_review=False)
        row = db.create_interaction(
            session_id=req.session_id,
            patient_message=req.message,
            message_hash=msg_hash,
            verdict="ALLOW",
            trigger_reason=result.reason,
            category=result.category,
            draft_response=answer,
            final_response=answer,
            status="delivered",
        )
        reply = answer

    elif result.verdict is Verdict.HOLD:
        draft = llm.generate(req.message, for_review=True)
        t = agent.triage(req.message, gate_reason=result.reason)
        row = db.create_interaction(
            session_id=req.session_id,
            patient_message=req.message,
            message_hash=msg_hash,
            verdict="HOLD",
            trigger_reason=result.reason,
            category=result.category,
            draft_response=draft,
            final_response=None,
            status="pending",
            priority=int(t.priority),
            priority_label=t.priority.label,
            recommendation=t.recommendation,
            triage_rationale=t.rationale,
            urgency_signals=", ".join(t.urgency_signals),
            triage_confidence=t.confidence,
        )
        reply = HOLD_MESSAGE

    else:  # BLOCK
        reply = CRISIS_MESSAGE if result.is_crisis else BLOCK_MESSAGE
        row = db.create_interaction(
            session_id=req.session_id,
            patient_message=req.message,
            message_hash=msg_hash,
            verdict="BLOCK",
            trigger_reason=result.reason,
            category=result.category,
            draft_response=reply,
            final_response=reply,
            status="delivered",
        )

    return ChatResponse(
        interaction_id=row["id"],
        verdict=result.verdict.value,
        status=row["status"],
        reply=reply,
        category=result.category,
        trigger_reason=result.reason,
        is_crisis=result.is_crisis,
    )


def _patient_visible_reply(item: dict[str, Any]) -> dict[str, Any]:
    """Project an interaction into what the patient should see right now."""
    verdict = item["verdict"]
    status = item["status"]
    if verdict == "HOLD" and status == "pending":
        reply, kind = HOLD_MESSAGE, "pending"
    elif verdict == "HOLD" and status == "approved":
        reply, kind = item["final_response"], "approved"
    elif verdict == "HOLD" and status == "rejected":
        reply, kind = item["final_response"], "rejected"
    else:  # ALLOW / BLOCK already delivered
        reply, kind = item["final_response"], verdict.lower()
    return {
        "id": item["id"],
        "patient_message": item["patient_message"],
        "verdict": verdict,
        "status": status,
        "kind": kind,
        "reply": reply,
    }


@app.get("/patient/conversation/{session_id}")
def patient_conversation(session_id: str) -> dict[str, Any]:
    """Return the full patient transcript for a session (server-authoritative).

    The patient UI polls this and re-renders, so a clinician's released reply
    always appears regardless of which window/tab is focused or page refreshes.
    """
    turns = [_patient_visible_reply(it) for it in db.conversation(session_id)]
    return {"session_id": session_id, "turns": turns}


@app.get("/interaction/{item_id}")
def get_interaction(item_id: int) -> dict[str, Any]:
    """Return the current state of one interaction (lightweight patient poll)."""
    item = db.get_interaction(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return {
        "id": item["id"],
        "verdict": item["verdict"],
        "status": item["status"],
        "final_response": item["final_response"],
    }


@app.get("/doctor/inbox")
def doctor_inbox(_: dict = Depends(require_doctor)) -> dict[str, Any]:
    """Return triaged, priority-sorted HOLD items plus dashboard stats."""
    items = db.pending_inbox()
    return {"count": len(items), "stats": db.inbox_stats(), "items": items}


def _release(item: dict[str, Any], *, status: str, final: str, reason: str, note: str | None, released_by: str) -> dict[str, Any]:
    """Chain the human/agent decision and update the operational store."""
    chain.append(message_hash=item["message_hash"], gate_verdict="HOLD", trigger_reason=reason)
    return db.resolve_interaction(item["id"], status=status, final_response=final, note=note, released_by=released_by)  # type: ignore[return-value]


@app.post("/doctor/approve/{item_id}")
def doctor_approve(item_id: int, req: ApproveRequest, _: dict = Depends(require_doctor)) -> dict[str, Any]:
    """Approve (optionally edited) or reject one held item, releasing it to the patient.

    The clinician's decision is itself appended to the hash chain, so the audit
    trail captures the human-in-the-loop action, not just the original routing.
    """
    item = db.get_interaction(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Interaction not found")
    if item["verdict"] != "HOLD":
        raise HTTPException(status_code=400, detail="Only HOLD items can be reviewed")
    if item["status"] != "pending":
        raise HTTPException(status_code=409, detail=f"Item already {item['status']}")

    if req.action == "reject":
        updated = _release(item, status="rejected", final=BLOCK_MESSAGE, reason="clinician_rejected", note=req.note, released_by="clinician")
        return {"interaction": updated, "released_response": BLOCK_MESSAGE}

    final = req.response if req.response is not None else item["draft_response"]
    updated = _release(item, status="approved", final=final, reason="clinician_approved", note=req.note, released_by="clinician")
    return {"interaction": updated, "released_response": final}


@app.post("/doctor/approve_batch")
def doctor_approve_batch(req: BatchApproveRequest, _: dict = Depends(require_doctor)) -> dict[str, Any]:
    """Release a set of agent-recommended drafts in one supervised action.

    This is how a clinician keeps up with thousands of items a day: the agent has
    already triaged and pre-drafted the low-risk items, and the clinician clears
    them in a single click. Each release is still individually hash-chained, so
    the audit trail records exactly what was batch-approved and when.
    """
    ids = req.ids if req.ids is not None else db.batch_approvable_ids()
    released: list[int] = []
    for item_id in ids:
        item = db.get_interaction(item_id)
        if item is None or item["verdict"] != "HOLD" or item["status"] != "pending":
            continue
        _release(
            item,
            status="approved",
            final=item["draft_response"],
            reason="agent_batch_approved",
            note="Batch-approved on agent recommendation",
            released_by="clinician_batch",
        )
        released.append(item_id)
    return {"released_count": len(released), "released_ids": released}


@app.get("/audit")
def audit() -> dict[str, Any]:
    """Return the full hash chain with per-record verification status."""
    result = chain.verify()
    return {"chain_valid": result.valid, "length": result.length, "records": result.records}


# --------------------------------------------------------------------------- #
# Frontend (served last so API routes take precedence).
# --------------------------------------------------------------------------- #
@app.get("/")
def index() -> FileResponse:
    """Serve the single-page patient + doctor UI."""
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
