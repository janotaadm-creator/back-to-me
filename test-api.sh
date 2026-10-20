#!/bin/bash

# Back to Me API — Test Script
# Use this to test the API with curl

API_URL="http://localhost:3001"
USER_EMAIL="test@backto.me"
USER_PASSWORD="Test123!@#"
TOKEN=""

echo "🚀 Back to Me API Test Suite"
echo "================================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health check
echo -e "\n${YELLOW}1. Health Check${NC}"
curl -X GET "$API_URL/health" \
  -H "Content-Type: application/json" | jq .

# Test 2: Signup
echo -e "\n${YELLOW}2. Signup (new user)${NC}"
SIGNUP_RESPONSE=$(curl -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}")

echo "$SIGNUP_RESPONSE" | jq .

# Extract token from signup response
TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.token')
echo -e "${GREEN}Token: $TOKEN${NC}"

# Test 3: Login
echo -e "\n${YELLOW}3. Login${NC}"
LOGIN_RESPONSE=$(curl -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}")

echo "$LOGIN_RESPONSE" | jq .

# Extract token from login response
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
echo -e "${GREEN}Token: $TOKEN${NC}"

# Test 4: Get cards for today
echo -e "\n${YELLOW}4. Get Cards for Today${NC}"
curl -X GET "$API_URL/api/cards/today" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .

# Test 5: Get cards history
echo -e "\n${YELLOW}5. Get Cards History${NC}"
curl -X GET "$API_URL/api/cards/history" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq . | head -50

# Test 6: Get progress
echo -e "\n${YELLOW}6. Get Progress${NC}"
curl -X GET "$API_URL/api/progress" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .

# Test 7: Mark card as complete
echo -e "\n${YELLOW}7. Mark Card as Complete${NC}"
curl -X POST "$API_URL/api/actions/mark-complete" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"card_id":1}' | jq .

# Test 8: Get progress again (should show 1 completed)
echo -e "\n${YELLOW}8. Get Progress (after completion)${NC}"
curl -X GET "$API_URL/api/progress" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .

# Test 9: Stripe checkout (should fail without real Stripe key, but validates endpoint)
echo -e "\n${YELLOW}9. Stripe Checkout (Pro tier)${NC}"
curl -X POST "$API_URL/api/stripe/checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tier":"Pro"}' | jq .

# Test 10: Community feed (Basico tier shouldn't access)
echo -e "\n${YELLOW}10. Community Feed (should fail for Basico)${NC}"
curl -X GET "$API_URL/api/community" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .

echo -e "\n${GREEN}✓ Tests completed${NC}"
