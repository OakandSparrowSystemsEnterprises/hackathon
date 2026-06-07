"""Pydantic request/response schemas for the Sentinel-Med API."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """A patient message submitted to the chatbot."""

    message: str = Field(..., min_length=1, description="The patient's message.")
    session_id: str = Field(
        "", description="Opaque per-browser session id so the patient can poll for released replies."
    )


class ChatResponse(BaseModel):
    """The gated reply returned to the patient."""

    interaction_id: int
    verdict: Literal["ALLOW", "HOLD", "BLOCK"]
    status: str = Field(..., description="delivered | pending")
    reply: str = Field(..., description="Patient-facing text.")
    category: str
    trigger_reason: str
    is_crisis: bool = False


class ApproveRequest(BaseModel):
    """A doctor's decision on a held item."""

    action: Literal["approve", "reject"] = "approve"
    response: Optional[str] = Field(
        None, description="Edited response to release. If omitted on approve, the AI draft is used."
    )
    note: Optional[str] = Field(None, description="Optional internal clinician note.")


class BatchApproveRequest(BaseModel):
    """A clinician's request to release a set of agent-recommended drafts at once."""

    ids: Optional[list[int]] = Field(
        None,
        description="Specific interaction ids to approve. If omitted, all currently "
        "agent-recommended (SUGGEST_APPROVE) pending items are released.",
    )


class LoginRequest(BaseModel):
    """Demo login credentials."""

    username: str
    password: str
