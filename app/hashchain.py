"""Tamper-evident hash chain for gate decisions.

Each gate verdict is appended as one record to a JSON-lines ledger. A record
commits to the hash of the record before it, so editing or deleting any past
record breaks every hash that follows — which :func:`HashChain.verify` detects.

Record schema (one JSON object per line)::

    {
      "index":         int,            # 0-based position in the chain
      "timestamp":     str,            # ISO 8601, UTC
      "message_hash":  str,            # sha256 of the raw patient message (privacy)
      "gate_verdict":  str,            # ALLOW | HOLD | BLOCK
      "trigger_reason":str,            # which rule fired
      "parent_hash":   str,            # previous record's current_hash
      "current_hash":  str            # sha256 over the fields above
    }

The patient message itself is never written to disk — only its sha256 — so the
audit trail proves *that* a decision was made about a message without exposing
the message content.
"""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

GENESIS_HASH = "0" * 64

# Fields that are hashed to produce ``current_hash`` (order is fixed and the
# JSON is canonical, so the digest is reproducible).
_HASHED_FIELDS = ("index", "timestamp", "message_hash", "gate_verdict", "trigger_reason", "parent_hash")


def hash_message(message: str) -> str:
    """Return the sha256 hex digest of a patient message (raw text is never stored)."""
    return hashlib.sha256((message or "").encode("utf-8")).hexdigest()


def _digest(record: dict[str, Any]) -> str:
    """Compute the current_hash for a record from its hashed fields.

    Uses canonical JSON (sorted keys, no whitespace) so the digest is stable
    across processes and Python versions.
    """
    payload = {k: record[k] for k in _HASHED_FIELDS}
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


@dataclass
class VerificationResult:
    """Outcome of verifying the whole chain."""

    valid: bool
    length: int
    records: list[dict[str, Any]]  # each record annotated with "_valid" and optional "_error"


class HashChain:
    """Append-only sha256 hash chain backed by a JSON-lines file."""

    def __init__(self, path: str) -> None:
        """Create a chain bound to ``path`` (created on first append if absent)."""
        self.path = path
        parent = os.path.dirname(path)
        if parent:
            os.makedirs(parent, exist_ok=True)

    def records(self) -> list[dict[str, Any]]:
        """Read and return all records in order. Empty list if the file is absent."""
        if not os.path.exists(self.path):
            return []
        out: list[dict[str, Any]] = []
        with open(self.path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    out.append(json.loads(line))
        return out

    def _last_hash(self) -> str:
        """Return the current_hash of the last record, or GENESIS if empty."""
        recs = self.records()
        return recs[-1]["current_hash"] if recs else GENESIS_HASH

    def append(self, *, message_hash: str, gate_verdict: str, trigger_reason: str) -> dict[str, Any]:
        """Append a new gate decision and return the completed record.

        Args:
            message_hash: sha256 of the patient message (use :func:`hash_message`).
            gate_verdict: ALLOW | HOLD | BLOCK.
            trigger_reason: Identifier of the rule that fired.

        Returns:
            The full record dict, including its computed ``current_hash``.
        """
        existing = self.records()
        record: dict[str, Any] = {
            "index": len(existing),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message_hash": message_hash,
            "gate_verdict": gate_verdict,
            "trigger_reason": trigger_reason,
            "parent_hash": existing[-1]["current_hash"] if existing else GENESIS_HASH,
        }
        record["current_hash"] = _digest(record)
        with open(self.path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(record) + "\n")
        return record

    def verify(self) -> VerificationResult:
        """Recompute and re-link every record to detect tampering.

        Each record is checked two ways: its ``current_hash`` must equal the
        digest recomputed from its fields, and its ``parent_hash`` must equal the
        previous record's ``current_hash``. The chain is valid only if every
        record passes both checks.
        """
        recs = self.records()
        prev_hash = GENESIS_HASH
        all_valid = True

        for i, rec in enumerate(recs):
            errors: list[str] = []

            if rec.get("index") != i:
                errors.append(f"index mismatch: expected {i}, got {rec.get('index')}")
            if rec.get("parent_hash") != prev_hash:
                errors.append("parent_hash does not match previous record")
            try:
                expected = _digest(rec)
            except KeyError as exc:  # missing hashed field
                expected = None
                errors.append(f"missing field {exc}")
            if expected is not None and rec.get("current_hash") != expected:
                errors.append("current_hash does not match record contents (tampered)")

            rec["_valid"] = not errors
            if errors:
                rec["_error"] = "; ".join(errors)
                all_valid = False

            prev_hash = rec.get("current_hash", GENESIS_HASH)

        return VerificationResult(valid=all_valid, length=len(recs), records=recs)
