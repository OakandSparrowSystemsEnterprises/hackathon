"""SQLite persistence for interactions, the doctor inbox, and patient sessions.

The hash chain (``app/hashchain.py``) is the immutable audit log. This database
is the *operational* store: the patient's question, the AI draft, the agent's
triage, the inbox lifecycle, and the per-session conversation the patient view
reconciles against.

One table, ``interactions``, backs all three paths:
  * ALLOW -> status="delivered", final_response is the AI answer
  * BLOCK -> status="delivered", final_response is the safe refusal
  * HOLD  -> status="pending",   draft_response + triage set, final_response NULL
             until a clinician (or an explicit batch action) releases it
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from typing import Any, Optional

# Priority is stored as the IntEnum value (0=CRITICAL .. 3=LOW) so SQL can sort it.
_SCHEMA = """
CREATE TABLE IF NOT EXISTS interactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at      TEXT NOT NULL,
    session_id      TEXT NOT NULL DEFAULT '',
    patient_message TEXT NOT NULL,
    message_hash    TEXT NOT NULL,
    verdict         TEXT NOT NULL,
    trigger_reason  TEXT NOT NULL,
    category        TEXT NOT NULL,
    draft_response  TEXT,
    final_response  TEXT,
    status          TEXT NOT NULL,
    -- doctor-side triage agent fields (HOLD only)
    priority        INTEGER,
    priority_label  TEXT,
    recommendation  TEXT,
    triage_rationale TEXT,
    urgency_signals TEXT,
    triage_confidence REAL,
    -- clinician resolution
    doctor_note     TEXT,
    released_by     TEXT,
    resolved_at     TEXT
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Database:
    """Thin wrapper around a SQLite connection with row-dict access."""

    def __init__(self, path: str) -> None:
        """Open (and initialize) the database at ``path``. Use ``:memory:`` for tests."""
        self.conn = sqlite3.connect(path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(_SCHEMA)
        self.conn.commit()

    def create_interaction(
        self,
        *,
        session_id: str,
        patient_message: str,
        message_hash: str,
        verdict: str,
        trigger_reason: str,
        category: str,
        draft_response: Optional[str],
        final_response: Optional[str],
        status: str,
        priority: Optional[int] = None,
        priority_label: Optional[str] = None,
        recommendation: Optional[str] = None,
        triage_rationale: Optional[str] = None,
        urgency_signals: Optional[str] = None,
        triage_confidence: Optional[float] = None,
    ) -> dict[str, Any]:
        """Insert a new interaction and return it as a dict."""
        cur = self.conn.execute(
            """
            INSERT INTO interactions
                (created_at, session_id, patient_message, message_hash, verdict,
                 trigger_reason, category, draft_response, final_response, status,
                 priority, priority_label, recommendation, triage_rationale,
                 urgency_signals, triage_confidence)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                _now(),
                session_id,
                patient_message,
                message_hash,
                verdict,
                trigger_reason,
                category,
                draft_response,
                final_response,
                status,
                priority,
                priority_label,
                recommendation,
                triage_rationale,
                urgency_signals,
                triage_confidence,
            ),
        )
        self.conn.commit()
        return self.get_interaction(cur.lastrowid)  # type: ignore[arg-type]

    def get_interaction(self, interaction_id: int) -> Optional[dict[str, Any]]:
        """Fetch one interaction by id, or None."""
        row = self.conn.execute("SELECT * FROM interactions WHERE id = ?", (interaction_id,)).fetchone()
        return dict(row) if row else None

    def pending_inbox(self) -> list[dict[str, Any]]:
        """Return HOLD items awaiting review, most clinically urgent first.

        Ordered by triage priority (CRITICAL -> LOW), then oldest-first within a
        priority so nothing starves.
        """
        rows = self.conn.execute(
            """
            SELECT * FROM interactions
             WHERE verdict = 'HOLD' AND status = 'pending'
             ORDER BY COALESCE(priority, 99) ASC, id ASC
            """
        ).fetchall()
        return [dict(r) for r in rows]

    def inbox_stats(self) -> dict[str, int]:
        """Counts the doctor dashboard needs: total pending + breakdown by priority."""
        rows = self.conn.execute(
            """
            SELECT priority_label AS label, COUNT(*) AS n
              FROM interactions
             WHERE verdict = 'HOLD' AND status = 'pending'
             GROUP BY priority_label
            """
        ).fetchall()
        stats = {"pending": 0, "CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "batch_approvable": 0}
        for r in rows:
            label = r["label"] or "LOW"
            stats[label] = stats.get(label, 0) + r["n"]
            stats["pending"] += r["n"]
        # How many the agent considers safe to batch-approve right now.
        row = self.conn.execute(
            "SELECT COUNT(*) AS n FROM interactions WHERE verdict='HOLD' AND status='pending' AND recommendation='SUGGEST_APPROVE'"
        ).fetchone()
        stats["batch_approvable"] = row["n"]
        return stats

    def batch_approvable_ids(self) -> list[int]:
        """IDs of pending HOLD items the agent recommends auto-approving."""
        rows = self.conn.execute(
            "SELECT id FROM interactions WHERE verdict='HOLD' AND status='pending' AND recommendation='SUGGEST_APPROVE' ORDER BY id ASC"
        ).fetchall()
        return [r["id"] for r in rows]

    def conversation(self, session_id: str) -> list[dict[str, Any]]:
        """Return all interactions for a patient session, oldest first.

        This is the server-authoritative source the patient view renders from, so
        a clinician's released response always appears — no client-side state, no
        dependence on which tab/window is focused.
        """
        rows = self.conn.execute(
            "SELECT * FROM interactions WHERE session_id = ? ORDER BY id ASC", (session_id,)
        ).fetchall()
        return [dict(r) for r in rows]

    def resolve_interaction(
        self,
        interaction_id: int,
        *,
        status: str,
        final_response: Optional[str],
        note: Optional[str],
        released_by: str = "clinician",
    ) -> Optional[dict[str, Any]]:
        """Mark a held item approved/rejected and record the released response."""
        self.conn.execute(
            """
            UPDATE interactions
               SET status = ?, final_response = ?, doctor_note = ?, released_by = ?, resolved_at = ?
             WHERE id = ?
            """,
            (status, final_response, note, released_by, _now(), interaction_id),
        )
        self.conn.commit()
        return self.get_interaction(interaction_id)
