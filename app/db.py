"""SQLite persistence for interactions and the doctor inbox.

The hash chain (``app/hashchain.py``) is the immutable audit log. This database
is the *operational* store: it holds the mutable state the app needs to function
— the patient's question (so a clinician can read it), the AI draft, and the
inbox lifecycle (pending -> approved/rejected).

One table, ``interactions``, backs all three paths:
  * ALLOW -> status="delivered", final_response is the AI answer
  * BLOCK -> status="delivered", final_response is the safe refusal
  * HOLD  -> status="pending",   draft_response set, final_response NULL until approved
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from typing import Any, Optional

_SCHEMA = """
CREATE TABLE IF NOT EXISTS interactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at      TEXT NOT NULL,
    patient_message TEXT NOT NULL,
    message_hash    TEXT NOT NULL,
    verdict         TEXT NOT NULL,
    trigger_reason  TEXT NOT NULL,
    category        TEXT NOT NULL,
    draft_response  TEXT,
    final_response  TEXT,
    status          TEXT NOT NULL,
    doctor_note     TEXT,
    resolved_at     TEXT
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Database:
    """Thin wrapper around a SQLite connection with row-dict access."""

    def __init__(self, path: str) -> None:
        """Open (and initialize) the database at ``path``. Use ``:memory:`` for tests."""
        # check_same_thread=False lets FastAPI's threadpool share the connection.
        self.conn = sqlite3.connect(path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(_SCHEMA)
        self.conn.commit()

    def create_interaction(
        self,
        *,
        patient_message: str,
        message_hash: str,
        verdict: str,
        trigger_reason: str,
        category: str,
        draft_response: Optional[str],
        final_response: Optional[str],
        status: str,
    ) -> dict[str, Any]:
        """Insert a new interaction and return it as a dict."""
        cur = self.conn.execute(
            """
            INSERT INTO interactions
                (created_at, patient_message, message_hash, verdict, trigger_reason,
                 category, draft_response, final_response, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                _now(),
                patient_message,
                message_hash,
                verdict,
                trigger_reason,
                category,
                draft_response,
                final_response,
                status,
            ),
        )
        self.conn.commit()
        return self.get_interaction(cur.lastrowid)  # type: ignore[arg-type]

    def get_interaction(self, interaction_id: int) -> Optional[dict[str, Any]]:
        """Fetch one interaction by id, or None."""
        row = self.conn.execute("SELECT * FROM interactions WHERE id = ?", (interaction_id,)).fetchone()
        return dict(row) if row else None

    def pending_inbox(self) -> list[dict[str, Any]]:
        """Return all HOLD items awaiting clinician review, oldest first."""
        rows = self.conn.execute(
            "SELECT * FROM interactions WHERE verdict = 'HOLD' AND status = 'pending' ORDER BY id ASC"
        ).fetchall()
        return [dict(r) for r in rows]

    def resolve_interaction(
        self, interaction_id: int, *, status: str, final_response: Optional[str], note: Optional[str]
    ) -> Optional[dict[str, Any]]:
        """Mark a held item approved/rejected and record the released response."""
        self.conn.execute(
            """
            UPDATE interactions
               SET status = ?, final_response = ?, doctor_note = ?, resolved_at = ?
             WHERE id = ?
            """,
            (status, final_response, note, _now(), interaction_id),
        )
        self.conn.commit()
        return self.get_interaction(interaction_id)
