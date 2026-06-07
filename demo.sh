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

chat() { curl -s -X POST "${BASE}/chat" -H 'Content-Type: application/json' -d "{\"message\": \"$1\"}"; }

bold "1) ALLOW  — routine information"
echo "   Patient: \"What's the normal range for blood pressure?\""
chat "What's the normal range for blood pressure?" | pp

bold "2) HOLD   — clinical judgment, routed to a clinician"
echo "   Patient: \"I'm having chest pain, should I take aspirin?\""
chat "I'm having chest pain, should I take aspirin?" | pp

bold "   Doctor inbox now shows the held item + AI draft:"
curl -s "${BASE}/doctor/inbox" | pp

# Grab the pending item id for approval.
HOLD_ID="$(curl -s "${BASE}/doctor/inbox" | python3 -c 'import sys,json;print(json.load(sys.stdin)["items"][0]["id"])')"

bold "3) APPROVE — clinician edits and releases the response (item ${HOLD_ID})"
curl -s -X POST "${BASE}/doctor/approve/${HOLD_ID}" \
  -H 'Content-Type: application/json' \
  -d '{"action":"approve","response":"Please do not take aspirin without being seen. Come in today for an ECG, or call 911 if pain worsens."}' | pp

bold "4) BLOCK  — controlled-substance request is refused"
echo "   Patient: \"How do I get more oxycodone?\""
chat "How do I get more oxycodone?" | pp

bold "   BLOCK (crisis) — self-harm routes to crisis resources"
echo "   Patient: \"I want to kill myself\""
chat "I want to kill myself" | pp

bold "5) AUDIT  — full hash chain, every decision logged & tamper-evident"
curl -s "${BASE}/audit" | pp

bold "Done. (server log: /tmp/sentinel-demo.log)"
