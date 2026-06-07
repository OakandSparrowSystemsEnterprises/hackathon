"""Unit tests for the tamper-evident hash chain."""

import json
import os
import tempfile
import unittest

from app.hashchain import GENESIS_HASH, HashChain, hash_message


class TestHashChain(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.tmp.name, "chain.jsonl")
        self.chain = HashChain(self.path)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_message_is_hashed_not_stored_raw(self) -> None:
        secret = "I'm having chest pain"
        rec = self.chain.append(
            message_hash=hash_message(secret), gate_verdict="HOLD", trigger_reason="acute_symptom"
        )
        self.assertNotIn(secret, json.dumps(rec))
        self.assertEqual(rec["message_hash"], hash_message(secret))

    def test_genesis_parent_hash(self) -> None:
        rec = self.chain.append(message_hash=hash_message("hi"), gate_verdict="ALLOW", trigger_reason="routine")
        self.assertEqual(rec["parent_hash"], GENESIS_HASH)
        self.assertEqual(rec["index"], 0)

    def test_records_link_together(self) -> None:
        r0 = self.chain.append(message_hash=hash_message("a"), gate_verdict="ALLOW", trigger_reason="routine")
        r1 = self.chain.append(message_hash=hash_message("b"), gate_verdict="HOLD", trigger_reason="acute_symptom")
        self.assertEqual(r1["parent_hash"], r0["current_hash"])
        self.assertEqual(r1["index"], 1)

    def test_valid_chain_verifies(self) -> None:
        for i in range(5):
            self.chain.append(message_hash=hash_message(str(i)), gate_verdict="ALLOW", trigger_reason="routine")
        result = self.chain.verify()
        self.assertTrue(result.valid)
        self.assertEqual(result.length, 5)
        self.assertTrue(all(r["_valid"] for r in result.records))

    def test_tampering_breaks_chain(self) -> None:
        self.chain.append(message_hash=hash_message("a"), gate_verdict="ALLOW", trigger_reason="routine")
        self.chain.append(message_hash=hash_message("b"), gate_verdict="HOLD", trigger_reason="acute_symptom")
        self.chain.append(message_hash=hash_message("c"), gate_verdict="BLOCK", trigger_reason="self_harm")

        # Tamper: flip a verdict on the middle record directly in the file.
        recs = self.chain.records()
        recs[1]["gate_verdict"] = "ALLOW"
        with open(self.path, "w", encoding="utf-8") as fh:
            for r in recs:
                fh.write(json.dumps(r) + "\n")

        result = self.chain.verify()
        self.assertFalse(result.valid)
        self.assertFalse(result.records[1]["_valid"])
        self.assertIn("tampered", result.records[1]["_error"])

    def test_empty_chain_is_valid(self) -> None:
        result = self.chain.verify()
        self.assertTrue(result.valid)
        self.assertEqual(result.length, 0)

    def test_persistence_across_instances(self) -> None:
        self.chain.append(message_hash=hash_message("a"), gate_verdict="ALLOW", trigger_reason="routine")
        reopened = HashChain(self.path)
        self.assertEqual(len(reopened.records()), 1)
        self.assertTrue(reopened.verify().valid)


if __name__ == "__main__":
    unittest.main()
