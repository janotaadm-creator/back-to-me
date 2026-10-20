#!/bin/bash

# Back to Me API — Ready-to-Use Curl Commands
# Copy & paste these into your terminal

API="http://localhost:3001"

echo "Back to Me API — Curl Command Reference"
echo "========================================"
echo ""
echo "Prerequisites:"
echo "  npm start   (start server first)"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "1️⃣  SIGNUP (Get JWT Token)"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "curl -X POST $API/auth/signup \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"user@example.com\",\"password\":\"password123\"}'"
echo ""
echo "Expected response:"
echo '{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {"id": 1, "email": "user@example.com", "tier": "Basico"}
}'
echo ""
echo "💡 Save the token from response for next requests:"
echo "   TOKEN=\"eyJhbGciOiJIUzI1NiIs...\""
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "2️⃣  LOGIN (Alternative to Signup)"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "curl -X POST $API/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"user@example.com\",\"password\":\"password123\"}'"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "3️⃣  GET CARDS FOR TODAY (3 cards)"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo 'TOKEN="your-jwt-token-here"'
echo ""
echo "curl -X GET $API/api/cards/today \\"
echo "  -H \"Authorization: Bearer \$TOKEN\""
echo ""
echo "Expected response:"
echo '{
  "date": "2026-10-20",
  "tier": "Basico",
  "cards": [
    {
      "id": 1,
      "card_id": 1,
      "motivacao": "Você é invisível porque escolheu silêncio...",
      "reflexao": "Qual verdade sua você escondeu...",
      "acao": "Diga uma coisa verdadeira pra alguém que você ama...",
      "tier": "Básico"
    },
    ...
  ]
}'
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "4️⃣  GET ALL CARDS + HISTORY (90 cards)"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "curl -X GET $API/api/cards/history \\"
echo "  -H \"Authorization: Bearer \$TOKEN\""
echo ""
echo "Shows all cards with completion status (completed: true/false)"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "5️⃣  MARK CARD AS COMPLETE"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "curl -X POST $API/api/actions/mark-complete \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"card_id\": 1}'"
echo ""
echo "Expected response:"
echo '{
  "success": true,
  "completion": {
    "id": 1,
    "completed_at": "2026-10-20T14:30:00.000Z"
  }
}'
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "6️⃣  GET PROGRESS (% complete, streak, remaining)"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "curl -X GET $API/api/progress \\"
echo "  -H \"Authorization: Bearer \$TOKEN\""
echo ""
echo "Expected response:"
echo '{
  "totalCards": 90,
  "completedCards": 1,
  "completionPercentage": 1,
  "currentStreak": 1,
  "daysRemaining": 89
}'
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "7️⃣  GET COMMUNITY FEED (Pro/Premium only)"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "curl -X GET $API/api/community \\"
echo "  -H \"Authorization: Bearer \$TOKEN\""
echo ""
echo "⚠️  Only works for Pro/Premium tier users"
echo "Expected response:"
echo '{
  "feed": [
    {
      "userId": 2,
      "userEmail": "otherguy",
      "cardId": 5,
      "actionRealizada": "Escrevi uma frase que nunca falei em voz alta",
      "timestamp": "2026-10-20T14:30:00.000Z",
      "userTier": "Pro"
    }
  ]
}'
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "8️⃣  STRIPE CHECKOUT (Create Payment Session)"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "curl -X POST $API/api/stripe/checkout \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"tier\": \"Pro\"}'"
echo ""
echo "Tier options: 'Pro' or 'Premium'"
echo ""
echo "Expected response (with real Stripe keys):"
echo '{
  "url": "https://checkout.stripe.com/pay/cs_...",
  "sessionId": "cs_..."
}'
echo ""
echo "⚠️  Requires real STRIPE_SECRET_KEY in .env"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "9️⃣  HEALTH CHECK (Server status)"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "curl -X GET $API/health"
echo ""
echo "Expected response:"
echo '{
  "status": "ok",
  "timestamp": "2026-10-20T20:00:00.000Z"
}'
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "📋 FULL TEST FLOW"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "# Step 1: Signup and save token"
echo "curl -s -X POST $API/auth/signup \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"test\$(date +%s)@backto.me\",\"password\":\"test123\"}' | jq -r '.token' > token.txt"
echo ""
echo "# Step 2: Load token"
echo "TOKEN=\$(cat token.txt)"
echo ""
echo "# Step 3: Get cards"
echo "curl -s -X GET $API/api/cards/today -H \"Authorization: Bearer \$TOKEN\" | jq ."
echo ""
echo "# Step 4: Mark first card complete"
echo "curl -s -X POST $API/api/actions/mark-complete \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"card_id\": 1}' | jq ."
echo ""
echo "# Step 5: Check progress"
echo "curl -s -X GET $API/api/progress -H \"Authorization: Bearer \$TOKEN\" | jq ."
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "🔧 ENVIRONMENT SETUP"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Before running tests, make sure:"
echo ""
echo "1. PostgreSQL is running:"
echo "   docker run -d -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:15"
echo ""
echo "2. Create database:"
echo "   createdb -U postgres back_to_me"
echo ""
echo "3. Update .env with your credentials"
echo ""
echo "4. Start server:"
echo "   npm start"
echo ""
echo "5. Test endpoints (use curl commands above)"
echo ""
