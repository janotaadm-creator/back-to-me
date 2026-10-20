#!/bin/bash
# test-webhook.sh — Verify Stripe webhook is working

if [ -z "$1" ]; then
  echo "❌ Usage: ./test-webhook.sh <your-railway-app-url>"
  echo "Example: ./test-webhook.sh https://back-to-me-abc123.railway.app"
  exit 1
fi

BACKEND_URL="$1"
WEBHOOK_SECRET="${2:-whsec_test_PLACEHOLDER}"

echo "🔌 Testing Stripe Webhook Integration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Backend URL: $BACKEND_URL"
echo "Webhook endpoint: $BACKEND_URL/api/stripe/webhook"
echo ""

# Test 1: Health check
echo "Test 1️⃣  Health Check"
echo "─────────────────────"
HEALTH=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health")
STATUS=$(echo "$HEALTH" | tail -1)
BODY=$(echo "$HEALTH" | head -1)

if [ "$STATUS" = "200" ]; then
  echo "✅ PASS: Health endpoint responding"
  echo "   Response: $BODY"
else
  echo "❌ FAIL: Health endpoint returned HTTP $STATUS"
  exit 1
fi
echo ""

# Test 2: Webhook endpoint exists
echo "Test 2️⃣  Webhook Endpoint Exists"
echo "─────────────────────────────────"
WEBHOOK_TEST=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}' \
  "$BACKEND_URL/api/stripe/webhook")
STATUS=$(echo "$WEBHOOK_TEST" | tail -1)

# Accept 400/401 (expected for test payload) as proof endpoint exists
if [[ "$STATUS" == "200" || "$STATUS" == "400" || "$STATUS" == "401" ]]; then
  echo "✅ PASS: Webhook endpoint accessible"
  echo "   Status: HTTP $STATUS (expected for unsigned payload)"
else
  echo "⚠️  WARNING: Webhook returned HTTP $STATUS"
fi
echo ""

# Test 3: CORS headers
echo "Test 3️⃣  CORS Configuration"
echo "────────────────────────────"
CORS=$(curl -s -I -X OPTIONS "$BACKEND_URL/api/cards")
if echo "$CORS" | grep -q "Access-Control"; then
  echo "✅ PASS: CORS headers present"
else
  echo "⚠️  WARNING: CORS headers not detected (may be normal)"
fi
echo ""

# Test 4: Sample authenticated request
echo "Test 4️⃣  API Ready (Sample Request)"
echo "────────────────────────────────────"
SAMPLE=$(curl -s -w "\n%{http_code}" -X GET "$BACKEND_URL/api/cards/today" \
  -H "Authorization: Bearer test_token_123")
BODY=$(echo "$SAMPLE" | head -1)
STATUS=$(echo "$SAMPLE" | tail -1)

if [[ "$STATUS" == "200" || "$STATUS" == "401" || "$STATUS" == "403" ]]; then
  echo "✅ PASS: API endpoints accessible"
  echo "   Status: HTTP $STATUS"
else
  echo "❌ FAIL: API returned HTTP $STATUS"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 NEXT STEPS:"
echo ""
echo "1. Verify in Stripe Dashboard:"
echo "   - Go to https://dashboard.stripe.com/test/webhooks"
echo "   - Create endpoint with URL: $BACKEND_URL/api/stripe/webhook"
echo "   - Copy Signing Secret → Set as STRIPE_WEBHOOK_SECRET in Railway"
echo ""
echo "2. Verify in Railway:"
echo "   - Set STRIPE_SECRET_KEY (sk_test_...)"
echo "   - Set STRIPE_WEBHOOK_SECRET (whsec_...)"
echo "   - Restart app"
echo ""
echo "3. Test payment flow:"
echo "   - POST /api/stripe/checkout → get session URL"
echo "   - Complete payment at Stripe Checkout"
echo "   - Webhook should trigger automatically"
echo ""
