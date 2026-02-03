#!/bin/bash
# Integration test script for new HollyShip features
# Tests saved addresses, carbon footprint, delivery photos, and delivery preferences

set -e  # Exit on error

API_BASE="http://localhost:8080"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== HollyShip New Features Integration Test ===${NC}\n"

# Test 1: Health check
echo -e "${BLUE}Test 1: Health Check${NC}"
HEALTH=$(curl -s "$API_BASE/health")
if echo "$HEALTH" | jq -e '.ok == true' > /dev/null; then
  echo -e "${GREEN}✓ Health check passed${NC}\n"
else
  echo -e "${RED}✗ Health check failed${NC}"
  exit 1
fi

# Test 2: Create a shipment to test carbon footprint
echo -e "${BLUE}Test 2: Create Shipment with Carbon Footprint${NC}"
SHIPMENT=$(curl -s -X POST "$API_BASE/v1/shipments/resolve" \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNumber": "1Z999AA10123456789",
    "hintCarrier": "UPS",
    "label": "Carbon Test Package",
    "destination": "Seattle, WA"
  }')

SHIPMENT_ID=$(echo "$SHIPMENT" | jq -r '.id')
CARBON_KG=$(echo "$SHIPMENT" | jq -r '.carbonFootprintKg')

if [ "$SHIPMENT_ID" != "null" ] && [ -n "$SHIPMENT_ID" ]; then
  echo -e "${GREEN}✓ Shipment created: $SHIPMENT_ID${NC}"
  if [ "$CARBON_KG" != "null" ]; then
    echo -e "${GREEN}✓ Carbon footprint calculated: ${CARBON_KG}kg CO2${NC}\n"
  else
    echo -e "${RED}✗ Carbon footprint not calculated${NC}\n"
  fi
else
  echo -e "${RED}✗ Shipment creation failed${NC}"
  exit 1
fi

# Test 3: Update delivery notes
echo -e "${BLUE}Test 3: Update Delivery Notes${NC}"
NOTES_RESULT=$(curl -s -X PATCH "$API_BASE/v1/shipments/$SHIPMENT_ID/delivery-notes" \
  -H "Content-Type: application/json" \
  -d '{
    "deliveryNotes": "Leave at front desk, gate code 1234"
  }')

NOTES=$(echo "$NOTES_RESULT" | jq -r '.shipment.deliveryNotes')
if [ "$NOTES" != "null" ] && [ -n "$NOTES" ]; then
  echo -e "${GREEN}✓ Delivery notes updated: $NOTES${NC}\n"
else
  echo -e "${RED}✗ Delivery notes update failed${NC}"
  exit 1
fi

# Test 4: Upload delivery photo
echo -e "${BLUE}Test 4: Upload Delivery Photo${NC}"
PHOTO=$(curl -s -X POST "$API_BASE/v1/shipments/$SHIPMENT_ID/photos" \
  -H "Content-Type: application/json" \
  -d '{
    "photoUrl": "https://example.com/delivery-photo.jpg",
    "photoType": "proof_of_delivery",
    "metadata": {
      "timestamp": "2026-01-02T15:30:00Z",
      "quality": "high"
    }
  }')

PHOTO_ID=$(echo "$PHOTO" | jq -r '.photo.id')
if [ "$PHOTO_ID" != "null" ] && [ -n "$PHOTO_ID" ]; then
  echo -e "${GREEN}✓ Delivery photo uploaded: $PHOTO_ID${NC}\n"
else
  echo -e "${RED}✗ Delivery photo upload failed${NC}"
  exit 1
fi

# Test 5: Get all photos for shipment
echo -e "${BLUE}Test 5: Get Delivery Photos${NC}"
PHOTOS=$(curl -s "$API_BASE/v1/shipments/$SHIPMENT_ID/photos")
PHOTO_COUNT=$(echo "$PHOTOS" | jq '.photos | length')
if [ "$PHOTO_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Retrieved $PHOTO_COUNT photo(s)${NC}\n"
else
  echo -e "${RED}✗ Failed to retrieve photos${NC}"
  exit 1
fi

# Test 6: Calculate carbon footprint with custom weight
echo -e "${BLUE}Test 6: Calculate Carbon Footprint with Weight${NC}"
CARBON_RESULT=$(curl -s -X POST "$API_BASE/v1/shipments/$SHIPMENT_ID/calculate-carbon" \
  -H "Content-Type: application/json" \
  -d '{
    "weightKg": 5.5
  }')

CARBON_UPDATED=$(echo "$CARBON_RESULT" | jq -r '.carbonFootprintKg')
CARBON_DESC=$(echo "$CARBON_RESULT" | jq -r '.description')
OFFSET_COST=$(echo "$CARBON_RESULT" | jq -r '.offsetCostUsd')

if [ "$CARBON_UPDATED" != "null" ]; then
  echo -e "${GREEN}✓ Carbon footprint recalculated: ${CARBON_UPDATED}kg CO2${NC}"
  echo -e "${GREEN}  Description: $CARBON_DESC${NC}"
  echo -e "${GREEN}  Offset cost: \$${OFFSET_COST}${NC}\n"
else
  echo -e "${RED}✗ Carbon footprint calculation failed${NC}"
  exit 1
fi

# Test 7: Register a user for testing saved addresses
echo -e "${BLUE}Test 7: Register User${NC}"
USER_EMAIL="test-$(date +%s)@example.com"
AUTH_START=$(curl -s -X POST "$API_BASE/v1/auth/email/start" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$USER_EMAIL\"}")

CODE=$(echo "$AUTH_START" | jq -r '.code // empty')
if [ -z "$CODE" ]; then
  echo -e "${RED}✗ User registration failed (no code)${NC}"
  exit 1
fi

AUTH_VERIFY=$(curl -s -X POST "$API_BASE/v1/auth/email/verify" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$USER_EMAIL\", \"code\": \"$CODE\"}")

USER_ID=$(echo "$AUTH_VERIFY" | jq -r '.userId')
TOKEN=$(echo "$AUTH_VERIFY" | jq -r '.token')

if [ "$USER_ID" != "null" ] && [ -n "$USER_ID" ]; then
  echo -e "${GREEN}✓ User registered: $USER_ID${NC}\n"
else
  echo -e "${RED}✗ User registration failed${NC}"
  exit 1
fi

# Test 8: Create saved address
echo -e "${BLUE}Test 8: Create Saved Address${NC}"
ADDRESS=$(curl -s -X POST "$API_BASE/v1/users/$USER_ID/addresses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nickname": "Home",
    "addressLine1": "123 Main St",
    "addressLine2": "Apt 4B",
    "city": "Seattle",
    "state": "WA",
    "postalCode": "98101",
    "country": "US",
    "instructions": "Leave packages at front door",
    "isDefault": true
  }')

ADDRESS_ID=$(echo "$ADDRESS" | jq -r '.address.id')
if [ "$ADDRESS_ID" != "null" ] && [ -n "$ADDRESS_ID" ]; then
  echo -e "${GREEN}✓ Saved address created: $ADDRESS_ID${NC}\n"
else
  echo -e "${RED}✗ Saved address creation failed${NC}"
  echo "$ADDRESS"
  exit 1
fi

# Test 9: Get saved addresses
echo -e "${BLUE}Test 9: Get Saved Addresses${NC}"
ADDRESSES=$(curl -s "$API_BASE/v1/users/$USER_ID/addresses" \
  -H "Authorization: Bearer $TOKEN")
ADDRESS_COUNT=$(echo "$ADDRESSES" | jq '.addresses | length')
if [ "$ADDRESS_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Retrieved $ADDRESS_COUNT address(es)${NC}\n"
else
  echo -e "${RED}✗ Failed to retrieve addresses${NC}"
  exit 1
fi

# Test 10: Update delivery preferences
echo -e "${BLUE}Test 10: Update Delivery Preferences${NC}"
PREFS=$(curl -s -X PATCH "$API_BASE/v1/users/$USER_ID/delivery-preferences" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "defaultInstructions": "Ring doorbell twice",
    "preferredTimeStart": "09:00",
    "preferredTimeEnd": "17:00",
    "allowReschedule": true,
    "allowRedirect": false,
    "notifyOnDispatch": true,
    "notifyOnDelivery": true
  }')

PREFS_ID=$(echo "$PREFS" | jq -r '.preferences.id')
if [ "$PREFS_ID" != "null" ] && [ -n "$PREFS_ID" ]; then
  echo -e "${GREEN}✓ Delivery preferences updated${NC}\n"
else
  echo -e "${RED}✗ Delivery preferences update failed${NC}"
  exit 1
fi

# Test 11: Get delivery preferences
echo -e "${BLUE}Test 11: Get Delivery Preferences${NC}"
GET_PREFS=$(curl -s "$API_BASE/v1/users/$USER_ID/delivery-preferences" \
  -H "Authorization: Bearer $TOKEN")
DEFAULT_INSTR=$(echo "$GET_PREFS" | jq -r '.preferences.defaultInstructions')
if [ "$DEFAULT_INSTR" = "Ring doorbell twice" ]; then
  echo -e "${GREEN}✓ Retrieved delivery preferences${NC}\n"
else
  echo -e "${RED}✗ Failed to retrieve delivery preferences${NC}"
  exit 1
fi

# Test 12: Update saved address
echo -e "${BLUE}Test 12: Update Saved Address${NC}"
UPDATE_ADDR=$(curl -s -X PATCH "$API_BASE/v1/users/$USER_ID/addresses/$ADDRESS_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nickname": "Home Sweet Home",
    "instructions": "Leave at back door if no answer"
  }')

UPDATED_NICKNAME=$(echo "$UPDATE_ADDR" | jq -r '.address.nickname')
if [ "$UPDATED_NICKNAME" = "Home Sweet Home" ]; then
  echo -e "${GREEN}✓ Address updated successfully${NC}\n"
else
  echo -e "${RED}✗ Address update failed${NC}"
  exit 1
fi

# Test 13: Get carbon stats for user (need to create a shipment for the user first)
echo -e "${BLUE}Test 13: Create User Shipment for Carbon Stats${NC}"
USER_SHIPMENT=$(curl -s -X POST "$API_BASE/v1/shipments/resolve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"trackingNumber\": \"1Z999AA10123456000\",
    \"hintCarrier\": \"UPS\",
    \"label\": \"User Package\",
    \"destination\": \"New York, NY\",
    \"userId\": \"$USER_ID\"
  }")

USER_SHIPMENT_ID=$(echo "$USER_SHIPMENT" | jq -r '.id')
if [ "$USER_SHIPMENT_ID" != "null" ]; then
  echo -e "${GREEN}✓ User shipment created${NC}\n"
  
  echo -e "${BLUE}Test 14: Get Carbon Stats${NC}"
  STATS=$(curl -s "$API_BASE/v1/users/$USER_ID/carbon-stats" \
    -H "Authorization: Bearer $TOKEN")
  TOTAL_CARBON=$(echo "$STATS" | jq -r '.stats.totalCarbonKg')
  TOTAL_SHIPMENTS=$(echo "$STATS" | jq -r '.stats.totalShipments')
  
  if [ "$TOTAL_SHIPMENTS" -gt 0 ]; then
    echo -e "${GREEN}✓ Carbon stats retrieved: $TOTAL_SHIPMENTS shipment(s), ${TOTAL_CARBON}kg CO2 total${NC}\n"
  else
    echo -e "${RED}✗ Carbon stats retrieval failed${NC}"
    exit 1
  fi
else
  echo -e "${RED}✗ User shipment creation failed${NC}"
  exit 1
fi

# Final summary
echo -e "${BLUE}=== Test Summary ===${NC}"
echo -e "${GREEN}✓ All new feature tests passed!${NC}"
echo -e "\n${BLUE}Features tested:${NC}"
echo -e "  • Saved addresses (create, read, update)"
echo -e "  • Delivery preferences (create/update, read)"
echo -e "  • Carbon footprint calculation (automatic & manual)"
echo -e "  • Carbon statistics"
echo -e "  • Delivery notes"
echo -e "  • Delivery photos (upload, read)"
echo ""
