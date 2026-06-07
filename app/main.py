"""Sentinel-Med FastAPI application (scaffold).

Endpoints are stubbed here and fleshed out in later milestones:
  POST /chat                 - patient submits a message
  GET  /doctor/inbox         - pending HOLD items
  POST /doctor/approve/{id}  - doctor approves/edits a draft
  GET  /audit                - full hash chain + verification status
  GET  /                     - serves the frontend
"""

from __future__ import annotations

from fastapi import FastAPI

app = FastAPI(title="Sentinel-Med", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}


@app.post("/chat")
def chat() -> dict[str, str]:
    """Patient submits a message. (stub)"""
    return {"detail": "not implemented"}


@app.get("/doctor/inbox")
def doctor_inbox() -> dict[str, str]:
    """Pending HOLD items awaiting clinician review. (stub)"""
    return {"detail": "not implemented"}


@app.post("/doctor/approve/{item_id}")
def doctor_approve(item_id: int) -> dict[str, str]:
    """Doctor approves or edits a held draft. (stub)"""
    return {"detail": "not implemented"}


@app.get("/audit")
def audit() -> dict[str, str]:
    """Full hash chain with per-record verification status. (stub)"""
    return {"detail": "not implemented"}
