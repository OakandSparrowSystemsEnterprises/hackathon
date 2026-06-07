"""Sentinel-Med FastAPI application.

Wires the deterministic gate, the hash-chain audit log, the SQLite operational
store, and answer generation into the patient + clinician API.

Endpoints:
  POST /chat                 - patient submits a message (ALLOW/HOLD/BLOCK)
  GET  /doctor/inbox         - pending HOLD items
  POST /doctor/approve/{id}  - doctor approves/edits/rejects a draft
  GET  /audit                - full hash chain + verification status
  GET  /                     - serves the frontend
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

from app import llm
from app.auth import DEMO_USERS, create_token, require_doctor
from app.db import Database
from app.gate import Verdict, classify
from app.hashchain import HashChain, hash_message
from app.models import ApproveRequest, ChatRequest, ChatResponse, LoginRequest

# --------------------------------------------------------------------------- #
# Storage locations (override via env for tests / deployment).
# --------------------------------------------------------------------------- #
DATA_DIR = os.environ.get("SENTINEL_DATA_DIR", "data")
DB_PATH = os.environ.get("SENTINEL_DB_PATH", os.path.join(DATA_DIR, "sentinel.db"))
CHAIN_PATH = os.environ.get("SENTINEL_CHAIN_PATH", os.path.join(DATA_DIR, "chain.jsonl"))
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
UI_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ui")

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

app = FastAPI(title="Sentinel-Med", version="1.0.0")

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
    The hash chain is written for *every* path, so the audit log records every
    decision regardless of outcome.
    """
    result = classify(req.message)

    # Audit first: the decision is logged before any answer is composed/released.
    chain.append(
        message_hash=hash_message(req.message),
        gate_verdict=result.verdict.value,
        trigger_reason=result.reason,
    )

    if result.verdict is Verdict.ALLOW:
        answer = llm.generate(req.message, for_review=False)
        row = db.create_interaction(
            patient_message=req.message,
            message_hash=hash_message(req.message),
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
        row = db.create_interaction(
            patient_message=req.message,
            message_hash=hash_message(req.message),
            verdict="HOLD",
            trigger_reason=result.reason,
            category=result.category,
            draft_response=draft,
            final_response=None,
            status="pending",
        )
        reply = HOLD_MESSAGE

    else:  # BLOCK
        reply = CRISIS_MESSAGE if result.is_crisis else BLOCK_MESSAGE
        row = db.create_interaction(
            patient_message=req.message,
            message_hash=hash_message(req.message),
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


@app.get("/doctor/inbox")
def doctor_inbox(_: dict = Depends(require_doctor)) -> dict[str, Any]:
    """Return pending HOLD items (question + draft answer) for clinician review."""
    items = db.pending_inbox()
    return {"count": len(items), "items": items}


@app.post("/doctor/approve/{item_id}")
def doctor_approve(item_id: int, req: ApproveRequest, _: dict = Depends(require_doctor)) -> dict[str, Any]:
    """Approve (optionally edited) or reject a held item, releasing it to the patient.

    The clinician's decision is itself appended to the hash chain so the audit
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
        final = BLOCK_MESSAGE
        status = "rejected"
        reason = "clinician_rejected"
    else:
        # Use the clinician's edit if provided, otherwise release the AI draft as-is.
        final = req.response if req.response is not None else item["draft_response"]
        status = "approved"
        reason = "clinician_approved"

    chain.append(
        message_hash=item["message_hash"],
        gate_verdict="HOLD",
        trigger_reason=reason,
    )
    updated = db.resolve_interaction(item_id, status=status, final_response=final, note=req.note)
    return {"interaction": updated, "released_response": final}


@app.get("/audit")
def audit() -> dict[str, Any]:
    """Return the full hash chain with per-record verification status."""
    result = chain.verify()
    return {
        "chain_valid": result.valid,
        "length": result.length,
        "records": result.records,
    }


# --------------------------------------------------------------------------- #
# Next.js static frontend (served last so API routes take precedence).
# --------------------------------------------------------------------------- #
def _ui(name: str) -> FileResponse:
    path = os.path.join(UI_DIR, name)
    if os.path.isfile(path):
        return FileResponse(path)
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/")
def index() -> FileResponse:
    return _ui("index.html")


@app.get("/login")
def login_page() -> FileResponse:
    return _ui("login.html")


@app.get("/patient")
def patient_page() -> FileResponse:
    return _ui("patient.html")


@app.get("/doctor")
def doctor_page_ui() -> FileResponse:
    return _ui("doctor.html")


@app.get("/audit-log")
def audit_page() -> FileResponse:
    return _ui("audit.html")


@app.get("/demo")
def demo_page() -> FileResponse:
    return _ui("demo.html")


if os.path.isdir(UI_DIR):
    app.mount("/_next", StaticFiles(directory=os.path.join(UI_DIR, "_next")), name="next-assets")
elif os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
