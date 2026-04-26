#!/usr/bin/env bash
# Slot A endpoint smoke test.
#
# Usage:
#   pnpm smoke                                    # localhost:3000
#   BASE_URL=https://your-deploy.vercel.app pnpm smoke
#   bash scripts/smoke.sh                         # same as pnpm smoke
#
# Covers: /api/warm, /api/merchant/pulse, /api/context/state, /api/merchant/stats,
# plus negative validation paths. Does NOT cover redemption — that requires an
# offer to exist, which comes from slot B's /api/offer/generate.

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
DIM=$'\033[2m'
NC=$'\033[0m'

pass() { echo "  ${GREEN}✓${NC} $1"; }
fail() { echo "  ${RED}✗${NC} $1"; exit 1; }
info() { echo "  ${DIM}$1${NC}"; }

echo "Smoking: $BASE_URL"
echo ""

# ─── 1. warm: cache + weather + events + demand ────────────────────────────
echo "1. /api/warm — pre-warm Stuttgart"
WARM=$(curl -sf "$BASE_URL/api/warm?cityKey=stuttgart") \
  || fail "warm endpoint unreachable"
[[ "$(echo "$WARM" | jq -r '.ok')" == "true" ]] \
  || fail "warm not-ok: $WARM"

info "weather: $(echo "$WARM" | jq -r '.weather.sample // .weather.error')"
info "events:  $(echo "$WARM" | jq -r '.events.sample  // .events.error')"
info "demand:  $(echo "$WARM" | jq -r '.demand.sample  // .demand.error')"
pass "completed in $(echo "$WARM" | jq -r '.totalMs')ms"
echo ""

# ─── 2. pulse → context → trigger ──────────────────────────────────────────
echo "2. Pulse persists merchant→consumer + trigger fires"
curl -sf -X POST "$BASE_URL/api/merchant/pulse" \
  -H 'Content-Type: application/json' \
  -d '{"merchantId":"m_cafe_mueller","kind":"fresh_batch","label":"smoke","ttlMinutes":5}' \
  -o /dev/null || fail "pulse POST failed"
pass "pulse posted"

sleep 1

CTX=$(curl -sf -X POST "$BASE_URL/api/context/state" \
  -H 'Content-Type: application/json' \
  -d '{"userId":"smoke","lat":48.7762,"lng":9.1822,"cityKey":"stuttgart","intentHint":"warm_drink_seeking","behavioral":"stationary"}')

PULSE=$(echo "$CTX" | jq -r '.context.merchantPulse[0].label // "none"')
[[ "$PULSE" == "smoke" ]] || fail "pulse not visible to consumer (got: $PULSE)"
pass "pulse visible to consumer: $PULSE"

TRIGGER=$(echo "$CTX" | jq -r '.trigger.ruleId // "none"')
if [[ "$TRIGGER" != "none" ]]; then
  pass "trigger fired: $TRIGGER"
else
  info "no trigger fired (may be normal — depends on time/day/weather)"
fi

info "weather: $(echo "$CTX" | jq -r '"\(.context.weather.tempC)°C \(.context.weather.condition)"')"
info "events:  $(echo "$CTX" | jq -r '.context.events | length') nearby"
info "zones:   $(echo "$CTX" | jq -r '.context.location.inZones | join(",")')"
echo ""

# ─── 3. validation paths return 400 not 500 ────────────────────────────────
echo "3. Validation paths"
check_status() {
  local method=$1 path=$2 expected=$3 body=${4:-}
  local opts=(-s -o /dev/null -w '%{http_code}' -X "$method" "$BASE_URL$path")
  if [[ -n "$body" ]]; then
    opts+=(-H 'Content-Type: application/json' -d "$body")
  fi
  local got
  got=$(curl "${opts[@]}")
  [[ "$got" == "$expected" ]] \
    && pass "$method $path → $got" \
    || fail "$method $path should $expected, got $got"
}

check_status POST /api/merchant/pulse 400 '{}'
check_status POST /api/redeem/validate 400 '{}'
check_status GET  /api/merchant/stats 400
check_status POST /api/offer/action 400 '{}'
echo ""

# ─── 4. merchant stats ─────────────────────────────────────────────────────
echo "4. /api/merchant/stats — aggregate counters"
STATS=$(curl -sf "$BASE_URL/api/merchant/stats?merchantId=m_cafe_mueller")
pass "$(echo "$STATS" | jq -r '"generated=\(.generated) accepted=\(.accepted) dismissed=\(.dismissed) redeemed=\(.redeemed) recent=\(.recentOffers | length)"')"
echo ""

echo "${GREEN}✓ All smokes passed${NC} against $BASE_URL"
