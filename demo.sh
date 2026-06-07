#!/usr/bin/env bash
#
# Sentinel-Med end-to-end demo (≈90 seconds).
# Starts the API on a temp port, walks all three gate paths, exercises the
# doctor inbox approval, and prints the verifiable hash chain. Self-contained:
# it boots and tears down its own server and uses a throwaway data directory.
#
# Usage:  ./demo.sh
set -euo pipefail

PORT="${PORT:-8099}"
BASE="http://127.0.0.1:${PORT}"
TMPDATA="$(mktemp -d)"
export SENTINEL_DATA_DIR="$TMPDATA"
export SENTINEL_DB_PATH="$TMPDATA/sentinel.db"
export SENTINEL_CHAIN_PATH="$TMPDATA/chain.jsonl"

bold() { printf "\n\033[1m%s\033[0m\n" "$1"; }
pp()   { python3 -m json.tool 2>/dev/null || cat; }

cleanup() { kill "${SERVER_PID:-}" >/dev/null 2>&1 || true; rm -rf "$TMPDATA"; }
trap cleanup EXIT

bold "Starting Sentinel-Med on ${BASE} ..."
uvicorn app.main:app --port "$PORT" >/tmp/sentinel-demo.log 2>&1 &
SERVER_PID=$!

# Wait for the server to come up.
for _ in $(seq 1 30); do
  if curl -sf "${BASE}/health" >/dev/null 2>&1; then break; fi
  sleep 0.3
done

SID="demo-$(date +%s)"   # one patient session, so we can show the live transcript
chat() { curl -s -X POST "${BASE}/chat" -H 'Content-Type: application/json' -d "{\"message\": \"$1\", \"session_id\": \"${SID}\"}"; }

bold "1) ALLOW  — routine information"
echo "   Patient: \"What's the normal range for blood pressure?\""
chat "What's the normal range for blood pressure?" | pp

bold "2) HOLD   — clinical-judgment questions, routed to the clinician"
echo "   A busy clinic: several patients ask things that need a human."
chat "I'm having chest pain, should I take aspirin?" >/dev/null   # CRITICAL
chat "Can I take ibuprofen with warfarin?"           >/dev/null   # HIGH
chat "Do I have a sinus infection?"                  >/dev/null   # MEDIUM
chat "Should I take vitamin D in the morning?"       >/dev/null   # LOW (batch)
chat "Is it okay to stretch before a run?"           >/dev/null   # LOW (batch)
echo "   (5 questions submitted: all the patients see is 'being reviewed by a clinician'.)"

bold "   Doctor inbox — the AGENT triaged every item by clinical risk:"
curl -s "${BASE}/doctor/inbox" | python3 -c '
import sys, json
d = json.load(sys.stdin); s = d["stats"]
print("   STATS: {} pending  |  CRITICAL {}  HIGH {}  MEDIUM {}  LOW {}  |  batch-approvable {}".format(
    s["pending"], s["CRITICAL"], s["HIGH"], s["MEDIUM"], s["LOW"], s["batch_approvable"]))
for it in d["items"]:
    print("   [{:8}] {:16} {}".format(it["priority_label"], it["recommendation"], it["patient_message"][:42]))
'

# The clinician personally handles the CRITICAL item.
CRIT_ID="$(curl -s "${BASE}/doctor/inbox" | python3 -c 'import sys,json;print(json.load(sys.stdin)["items"][0]["id"])')"
bold "3a) ESCALATE — clinician personally edits & releases the CRITICAL item (#${CRIT_ID})"
curl -s -X POST "${BASE}/doctor/approve/${CRIT_ID}" \
  -H 'Content-Type: application/json' \
  -d '{"action":"approve","response":"Do NOT take aspirin on your own. Come in today for an ECG — call 911 if the pain worsens."}' \
  | python3 -c 'import sys,json;print("   released:", json.load(sys.stdin)["released_response"])'

bold "3b) BATCH — clinician clears all agent-recommended low-risk items in one click"
curl -s -X POST "${BASE}/doctor/approve_batch" -H 'Content-Type: application/json' -d '{}' \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("   batch-approved {} low-risk item(s): {}".format(d["released_count"], d["released_ids"]))'

bold "   Patient transcript now — released answers delivered, no refresh needed:"
curl -s "${BASE}/patient/conversation/${SID}" | python3 -c '
import sys, json
for t in json.load(sys.stdin)["turns"]:
    print("   [{:8}] {:40} -> {}".format(t["kind"], t["patient_message"][:38], t["reply"][:42]))
'

bold "4) BLOCK  — controlled-substance request is refused"
echo "   Patient: \"How do I get more oxycodone?\""
chat "How do I get more oxycodone?" | pp

bold "   BLOCK (crisis) — self-harm routes to crisis resources"
echo "   Patient: \"I want to kill myself\""
chat "I want to kill myself" | pp

bold "5) AUDIT  — full hash chain: gate decisions, escalation, AND batch approvals"
curl -s "${BASE}/audit" | python3 -c '
import sys, json
d = json.load(sys.stdin)
print("   chain_valid = {}   length = {}".format(d["chain_valid"], d["length"]))
for r in d["records"]:
    print("   #{:>2} {:5} {:26} {}".format(r["index"], r["gate_verdict"], r["trigger_reason"], "OK" if r["_valid"] else "TAMPERED"))
'

bold "Done. (server log: /tmp/sentinel-demo.log)"
