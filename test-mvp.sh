#!/bin/bash
# Integration test script for HollyShip MVP
# Tests the complete flow from shipment creation to tracking updates

set -e  # Exit on error

API_BASE="http://localhost:8080"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== HollyShip MVP Integration Test ===${NC}\n"

# Test 1: Health check
echo -e "${BLUE}Test 1: Health Check${NC}"
HEALTH=$(curl -s "$API_BASE/health")
if echo "$HEALTH" | jq -e '.ok == true' > /dev/null; then
  echo -e "${GREEN}✓ Health check passed${NC}\n"
else
  echo -e "${RED}✗ Health check failed${NC}"
  exit 1
fi

# Test 2: Create shipment
echo -e "${BLUE}Test 2: Create Shipment${NC}"
SHIPMENT=$(curl -s -X POST "$API_BASE/v1/shipments/resolve" \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNumber": "1Z999AA10123456999",
    "hintCarrier": "UPS",
    "label": "Integration Test Package",
    "destination": "Seattle, WA"
  }')

SHIPMENT_ID=$(echo "$SHIPMENT" | jq -r '.id')
if [ "$SHIPMENT_ID" != "null" ] && [ -n "$SHIPMENT_ID" ]; then
  echo -e "${GREEN}✓ Shipment created: $SHIPMENT_ID${NC}\n"
else
  echo -e "${RED}✗ Shipment creation failed${NC}"
  exit 1
fi

# Test 3: Get shipment details
echo -e "${BLUE}Test 3: Get Shipment Details${NC}"
DETAILS=$(curl -s "$API_BASE/v1/shipments/$SHIPMENT_ID")
STATUS=$(echo "$DETAILS" | jq -r '.status')
if [ "$STATUS" = "CREATED" ]; then
  echo -e "${GREEN}✓ Shipment retrieved with status: $STATUS${NC}\n"
else
  echo -e "${RED}✗ Failed to retrieve shipment${NC}"
  exit 1
fi

# Test 4: Create user and simulate status update
echo -e "${BLUE}Test 4: User Registration and Status Update${NC}"
USER=$(curl -s -X POST "$API_BASE/v1/auth/email/start" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@hollyship.dev"}')

CODE=$(echo "$USER" | jq -r '.code')
echo "  Email code: $CODE"

AUTH=$(curl -s -X POST "$API_BASE/v1/auth/email/verify" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test@hollyship.dev\", \"code\": \"$CODE\"}")

USER_ID=$(echo "$AUTH" | jq -r '.userId')
TOKEN=$(echo "$AUTH" | jq -r '.token')

if [ "$USER_ID" != "null" ] && [ -n "$USER_ID" ]; then
  echo -e "${GREEN}✓ User registered: $USER_ID${NC}\n"
else
  echo -e "${RED}✗ User registration failed${NC}"
  exit 1
fi

# Test 5: Simulate status transition to IN_TRANSIT
echo -e "${BLUE}Test 5: Status Transition to IN_TRANSIT${NC}"
TRANSIT=$(curl -s -X POST "$API_BASE/v1/shipments/$SHIPMENT_ID/simulate-status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"status\": \"IN_TRANSIT\", \"userId\": \"$USER_ID\"}")

if echo "$TRANSIT" | jq -e '.ok == true' > /dev/null; then
  echo -e "${GREEN}✓ Status updated to IN_TRANSIT${NC}\n"
else
  echo -e "${RED}✗ Status update failed${NC}"
  exit 1
fi

# Test 6: Check loyalty points (should have +25 for IN_TRANSIT)
echo -e "${BLUE}Test 6: Check Loyalty Points${NC}"
LOYALTY=$(curl -s "$API_BASE/v1/users/$USER_ID/loyalty")
POINTS=$(echo "$LOYALTY" | jq -r '.points')
TIER=$(echo "$LOYALTY" | jq -r '.tier')

if [ "$POINTS" = "25" ]; then
  echo -e "${GREEN}✓ Loyalty points awarded: $POINTS (Tier: $TIER)${NC}\n"
else
  echo -e "${RED}✗ Expected 25 points, got $POINTS${NC}"
  exit 1
fi

# Test 7: Simulate DELIVERED status
echo -e "${BLUE}Test 7: Status Transition to DELIVERED${NC}"
DELIVERED=$(curl -s -X POST "$API_BASE/v1/shipments/$SHIPMENT_ID/simulate-status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"status\": \"DELIVERED\", \"userId\": \"$USER_ID\"}")

if echo "$DELIVERED" | jq -e '.ok == true' > /dev/null; then
  echo -e "${GREEN}✓ Status updated to DELIVERED${NC}\n"
else
  echo -e "${RED}✗ Status update failed${NC}"
  exit 1
fi

# Test 8: Check updated loyalty points (should have +25 +50 = 75)
echo -e "${BLUE}Test 8: Check Updated Loyalty Points${NC}"
LOYALTY2=$(curl -s "$API_BASE/v1/users/$USER_ID/loyalty")
POINTS2=$(echo "$LOYALTY2" | jq -r '.points')
TIER2=$(echo "$LOYALTY2" | jq -r '.tier')

if [ "$POINTS2" = "75" ]; then
  echo -e "${GREEN}✓ Loyalty points updated: $POINTS2 (Tier: $TIER2)${NC}\n"
else
  echo -e "${RED}✗ Expected 75 points, got $POINTS2${NC}"
  exit 1
fi

# Test 9: Test webhook endpoint
echo -e "${BLUE}Test 9: Webhook Tracking Update${NC}"
WEBHOOK=$(curl -s -X POST "$API_BASE/v1/webhooks/tracking" \
  -H "Content-Type: application/json" \
  -d "{
    \"trackingNumber\": \"1Z999AA10123456999\",
    \"carrier\": \"UPS\",
    \"status\": \"out_for_delivery\",
    \"location\": \"Seattle, WA Distribution Center\"
  }")

WEBHOOK_STATUS=$(echo "$WEBHOOK" | jq -r '.status')
if [ "$WEBHOOK_STATUS" = "OUT_FOR_DELIVERY" ]; then
  echo -e "${GREEN}✓ Webhook processed: $WEBHOOK_STATUS${NC}\n"
else
  echo -e "${RED}✗ Webhook processing failed${NC}"
  exit 1
fi

# Test 10: Check job status
echo -e "${BLUE}Test 10: Background Job Status${NC}"
JOB_STATUS=$(curl -s "$API_BASE/v1/jobs/status")
IS_RUNNING=$(echo "$JOB_STATUS" | jq -r '.jobs.polling.isRunning')

if [ "$IS_RUNNING" = "true" ]; then
  echo -e "${GREEN}✓ Background polling job is running${NC}\n"
else
  echo -e "${RED}✗ Background job not running${NC}"
  exit 1
fi

# Test 11: Carrier detection
echo -e "${BLUE}Test 11: Carrier Detection${NC}"
DETECT=$(curl -s "$API_BASE/v1/carriers/detect?trackingNumber=1Z999AA10123456789&limit=3")
CANDIDATES=$(echo "$DETECT" | jq '.candidates | length')

if [ "$CANDIDATES" -gt "0" ]; then
  echo -e "${GREEN}✓ Carrier detection found $CANDIDATES candidates${NC}\n"
else
  echo -e "${RED}✗ Carrier detection failed${NC}"
  exit 1
fi

# Test 12: Data export
echo -e "${BLUE}Test 12: User Data Export (GDPR)${NC}"
EXPORT=$(curl -s "$API_BASE/v1/me/export" \
  -H "Authorization: Bearer $TOKEN")

EXPORT_OK=$(echo "$EXPORT" | jq -r '.ok')
if [ "$EXPORT_OK" = "true" ]; then
  SHIPMENT_COUNT=$(echo "$EXPORT" | jq '.shipments | length')
  echo -e "${GREEN}✓ Data export successful ($SHIPMENT_COUNT shipments)${NC}\n"
else
  echo -e "${RED}✗ Data export failed${NC}"
  exit 1
fi

echo -e "${GREEN}=== All Tests Passed! ===${NC}"
echo -e "\nSummary:"
echo -e "  - Shipment ID: $SHIPMENT_ID"
echo -e "  - User ID: $USER_ID"
echo -e "  - Final Points: $POINTS2"
echo -e "  - Final Tier: $TIER2"
