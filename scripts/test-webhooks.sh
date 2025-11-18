#!/bin/bash

# Test script for GHL Webhook Handlers
# Tests both Inbound and Outbound message webhooks with different scenarios

echo "🧪 Testing GHL Webhook Handlers"
echo "================================"
echo ""

BASE_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test webhook
test_webhook() {
  local name=$1
  local endpoint=$2
  local payload=$3
  local expected_source=$4

  echo -e "${BLUE}Testing: $name${NC}"
  echo "Endpoint: $endpoint"
  echo "Payload: $payload"

  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
    -H "Content-Type: application/json" \
    -d "$payload")

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✅ PASSED${NC} - HTTP $http_code"
    echo "Response: $body"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}❌ FAILED${NC} - HTTP $http_code"
    echo "Response: $body"
    FAILED=$((FAILED + 1))
  fi

  echo ""
  echo "---"
  echo ""
}

echo "Starting tests..."
echo ""

# ============================================================================
# TEST 1: Inbound Message (Contact → GHL)
# ============================================================================
test_webhook \
  "Inbound Message - Contact sends SMS" \
  "/api/ghl/webhooks/inbound-message" \
  '{
    "type": "SMS",
    "contactId": "test_contact_001",
    "locationId": "test_location_456",
    "messageId": "msg_inbound_001",
    "message": "Hello, I need help with my order #12345",
    "phone": "+1234567890",
    "conversationId": "conv_test_001"
  }' \
  "contact"

# ============================================================================
# TEST 2: Outbound Message - AI Agent (already in DB)
# ============================================================================
test_webhook \
  "Outbound Message - AI Agent Response" \
  "/api/ghl/webhooks/outbound-message" \
  '{
    "type": "SMS",
    "contactId": "test_contact_001",
    "locationId": "test_location_456",
    "messageId": "msg_ai_response_001",
    "message": "I can help you with order #12345. Let me look that up for you.",
    "phone": "+1234567890",
    "conversationId": "conv_test_001"
  }' \
  "ai_agent"

# ============================================================================
# TEST 3: Outbound Message - GHL User (manual)
# ============================================================================
test_webhook \
  "Outbound Message - GHL User Manual Reply" \
  "/api/ghl/webhooks/outbound-message" \
  '{
    "type": "SMS",
    "contactId": "test_contact_001",
    "locationId": "test_location_456",
    "messageId": "msg_manual_001",
    "userId": "user_jane_789",
    "message": "Hi there! I am personally looking into your order. Give me a moment.",
    "phone": "+1234567890",
    "conversationId": "conv_test_001"
  }' \
  "ghl_user"

# ============================================================================
# TEST 4: Outbound Message - GHL Automation
# ============================================================================
test_webhook \
  "Outbound Message - GHL Automation/Workflow" \
  "/api/ghl/webhooks/outbound-message" \
  '{
    "type": "SMS",
    "contactId": "test_contact_001",
    "locationId": "test_location_456",
    "messageId": "msg_automation_001",
    "message": "Thank you for your purchase! Your receipt is attached.",
    "phone": "+1234567890",
    "conversationId": "conv_test_001"
  }' \
  "ghl_automation"

# ============================================================================
# TEST 5: Inbound Message - Email
# ============================================================================
test_webhook \
  "Inbound Message - Contact sends Email" \
  "/api/ghl/webhooks/inbound-message" \
  '{
    "type": "Email",
    "contactId": "test_contact_002",
    "locationId": "test_location_456",
    "messageId": "msg_email_inbound_001",
    "emailFrom": {
      "email": "customer@example.com",
      "name": "John Customer"
    },
    "subject": "Question about my order",
    "html": "<p>I have a question about my recent order. Can you help?</p>",
    "conversationId": "conv_test_002"
  }' \
  "contact"

# ============================================================================
# TEST 6: Outbound Message - WhatsApp
# ============================================================================
test_webhook \
  "Outbound Message - WhatsApp (GHL User)" \
  "/api/ghl/webhooks/outbound-message" \
  '{
    "type": "WhatsApp",
    "contactId": "test_contact_003",
    "locationId": "test_location_456",
    "messageId": "msg_whatsapp_001",
    "userId": "user_john_456",
    "body": "Hi! I can help you with that. What is your order number?",
    "phone": "+1234567890",
    "conversationId": "conv_test_003"
  }' \
  "ghl_user"

echo ""
echo "================================"
echo "🏁 Test Results"
echo "================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi
