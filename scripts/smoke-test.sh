#!/usr/bin/env bash
# Quick smoke test against a running ResQ API (local or deployed).
# Usage: ./scripts/smoke-test.sh http://localhost:8080

set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
DISTRICT="district-a"
CONTACT="smoke-$(date +%s)@example.com"

echo "==> Health"
curl -sf "$BASE_URL/health" | grep -q '"status":"ok"'

echo "==> Register admin"
curl -sf -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Smoke Admin\",\"contact\":\"$CONTACT\",\"password\":\"password123\",\"role\":\"admin\",\"districtID\":\"$DISTRICT\"}" \
  | grep -q '"userID"'

echo "==> Login"
TOKEN=$(curl -sf -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"contact\":\"$CONTACT\",\"password\":\"password123\"}" \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

if [ -z "$TOKEN" ]; then
  echo "login failed: no token"
  exit 1
fi

echo "==> Report incident"
curl -sf -X POST "$BASE_URL/incident/report" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"severity":3,"location":"Test Road","description":"Smoke test incident"}' \
  | grep -q '"incidentID"'

echo "==> List incidents"
curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/incident/$DISTRICT" | grep -q '\['

echo "==> Register resource"
curl -sf -X POST "$BASE_URL/resource/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"relief_camp","capacity":50}' \
  | grep -q '"resourceID"'

echo "==> SMS ingest"
curl -sf -X POST "$BASE_URL/sms/ingest" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"+15551234567\",\"message\":\"Smoke SMS report\",\"districtID\":\"$DISTRICT\",\"severity\":2}" \
  | grep -q '"incidentID"'

echo ""
echo "All smoke tests passed for $BASE_URL"
