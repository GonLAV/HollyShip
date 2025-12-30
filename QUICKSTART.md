# HollyShip MVP - Quick Start Guide

## Overview

HollyShip is a shipment tracking platform with rewards. This implementation follows the MVP roadmap defined in `docs/MVP_ROADMAP.md` and `docs/FOUNDER_ROADMAP.md`.

## Current Implementation Status

### ✅ Phase 0 - Repo Foundations (COMPLETE)
- Backend service scaffold (TypeScript + Fastify)
- Postgres + Redis via docker-compose
- OpenAPI spec (docs/openapi.yaml)
- Environment config templates
- Logging with Pino
- Health endpoints

### ✅ Phase 1 - Tracking MVP (COMPLETE)
- Core data model (users, carriers, shipments, tracking_events, loyalty_ledger, coupons)
- Canonical status system
- Shipment tracking APIs
- Carrier resolver with aggregator support
- Webhook receiver for tracking updates
- Background polling jobs

### ✅ Phase 2 - Rewards MVP (COMPLETE)
- Points accrual (+25 IN_TRANSIT, +50 DELIVERED)
- Tier system (Bronze/Silver/Gold)
- Daily accrual cap anti-abuse
- Loyalty APIs

### 🚧 Phase 3 - Ingestion (Infrastructure Ready)
- Gmail OAuth infrastructure (stub)
- Outlook OAuth infrastructure (stub)
- Email parsing with tracking extraction
- Ready for API key configuration

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- curl and jq (for testing)

### 1. Start Infrastructure

```bash
# Start Postgres and Redis
docker compose up -d postgres redis

# Wait for services to be healthy
docker compose ps
```

### 2. Setup Backend

```bash
cd Hollybackend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Build TypeScript
npm run build

# Start development server
npm run dev
```

The backend will start on http://localhost:8080

### 3. Verify Setup

```bash
# Check health
curl http://localhost:8080/health

# View API documentation
open http://localhost:8080/docs
```

### 4. Run Integration Tests

```bash
# From the root directory
./test-mvp.sh
```

## API Endpoints

### Core Tracking
- `POST /v1/shipments/resolve` - Create shipment from tracking number
- `GET /v1/shipments/{id}` - Get shipment details
- `GET /v1/shipments` - List shipments
- `DELETE /v1/shipments/{id}` - Delete shipment
- `POST /v1/shipments/{id}/simulate-status` - Simulate status change (testing)

### Webhooks
- `POST /v1/webhooks/tracking` - Receive tracking updates from providers

### Carrier Detection
- `GET /v1/carriers/detect` - Detect carrier from tracking number (regex)
- `GET /v1/carriers/probe` - Probe carrier availability
- `GET /v1/carriers/aggregate` - Use external aggregator (requires config)

### Authentication
- `POST /v1/auth/email/start` - Start email magic link flow
- `POST /v1/auth/email/verify` - Verify email code
- `POST /v1/auth/oauth` - OAuth login (Google/Apple stub)

### Loyalty
- `GET /v1/users/{id}/loyalty` - Get points and tier
- `POST /v1/loyalty/redeem` - Redeem coupon (stub)

### Email Integration (Phase 3)
- `POST /v1/connect/email/gmail` - Start Gmail OAuth
- `GET /v1/connect/email/gmail/callback` - Gmail OAuth callback
- `POST /v1/connect/email/outlook` - Start Outlook OAuth
- `GET /v1/connect/email/outlook/callback` - Outlook OAuth callback

### Privacy & Compliance
- `GET /v1/me/export` - Export user data (GDPR)
- `DELETE /v1/me` - Delete user account

### Monitoring
- `GET /health` - Health check
- `GET /v1/jobs/status` - Background job status
- `GET /v1/stats/stream` - Real-time stats (SSE)

## Configuration

### Environment Variables

See `Hollybackend/.env.example` for all configuration options:

**Required:**
- `DATABASE_URL` - Postgres connection string
- `PORT` - API server port (default: 8080)

**Optional:**
- `AES_SECRET` - Encryption key for sensitive fields (32+ chars)
- `WEBHOOK_SECRET` - Secret for validating webhooks
- `DAILY_POINTS_CAP` - Max points per day (default: 500)
- `HOLLY_AGGREGATOR_BASE_URL` - External tracking aggregator URL
- `HOLLY_AGGREGATOR_API_KEY` - Aggregator API key
- `GMAIL_CLIENT_ID` - Gmail OAuth client ID
- `GMAIL_CLIENT_SECRET` - Gmail OAuth secret
- `OUTLOOK_CLIENT_ID` - Outlook OAuth client ID
- `OUTLOOK_CLIENT_SECRET` - Outlook OAuth secret

### Tracking Provider Integration

To connect to real tracking providers:

1. **AfterShip / 17TRACK / EasyPost / Shippo:**
   ```bash
   export HOLLY_AGGREGATOR_BASE_URL=https://api.aftership.com
   export HOLLY_AGGREGATOR_API_KEY=your-api-key
   ```

2. **Gmail:**
   ```bash
   export GMAIL_CLIENT_ID=your-client-id
   export GMAIL_CLIENT_SECRET=your-client-secret
   ```

3. **Outlook:**
   ```bash
   export OUTLOOK_CLIENT_ID=your-client-id
   export OUTLOOK_CLIENT_SECRET=your-client-secret
   ```

## Database Schema

Key models:
- **User** - User accounts with plan tiers
- **Carrier** - Shipping carriers (UPS, FedEx, USPS, etc.)
- **Shipment** - Tracked shipments with status and location
- **TrackingEvent** - Status change history
- **TrackingChain** - Multi-carrier handoff tracking
- **LoyaltyLedger** - Points history with anti-abuse
- **Coupon** - Redeemable rewards
- **Order** - E-commerce orders
- **UsageMeter** - Monthly quota tracking
- **StatsRollup** - Analytics snapshots

## Background Jobs

The polling job runs every 5 minutes and:
1. Finds shipments not yet DELIVERED
2. Calls tracking provider API (when configured)
3. Updates status and creates events
4. Awards loyalty points for milestones
5. Respects daily points cap

## Testing

### Manual Testing

```bash
# Create a shipment
curl -X POST http://localhost:8080/v1/shipments/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNumber": "1Z999AA10123456784",
    "hintCarrier": "UPS",
    "label": "Test Package"
  }'

# Get shipment details
curl http://localhost:8080/v1/shipments/{id}

# Simulate status change
curl -X POST http://localhost:8080/v1/shipments/{id}/simulate-status \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_TRANSIT"}'
```

### Integration Test

Run the full integration test suite:

```bash
./test-mvp.sh
```

## Architecture

```
┌─────────────┐
│   Frontend  │ (React + Vite)
└──────┬──────┘
       │
       ↓ HTTP/REST
┌─────────────┐
│  API Server │ (Fastify + TypeScript)
└──────┬──────┘
       │
       ├─→ Postgres (Prisma ORM)
       ├─→ Redis (optional, future use)
       ├─→ Tracking Providers (AfterShip, etc.)
       └─→ Email APIs (Gmail, Outlook)
```

## Development

### Run in Development Mode

```bash
cd Hollybackend
npm run dev  # Auto-reload on changes
```

### Build for Production

```bash
cd Hollybackend
npm run build
npm start
```

### Database Management

```bash
# Create new migration
npx prisma migrate dev --name description

# Apply migrations
npx prisma migrate deploy

# Open Prisma Studio (DB GUI)
npm run prisma:studio
```

## Docker Compose

Start all services:

```bash
docker compose up -d
```

This starts:
- **postgres** - Database on port 5432
- **redis** - Cache on port 6379
- **api** - Backend on port 8080
- **web** - Frontend on port 5173

## Next Steps

1. **Add Test Suite** - Unit and integration tests
2. **Connect Real Providers** - Add API keys for tracking services
3. **Shopify/WooCommerce** - Webhook ingestion
4. **Frontend Enhancements** - Complete tracking UI
5. **Mobile App** - React Native (Phase 4)
6. **Performance** - Load testing and optimization

## Support

- Documentation: See `docs/` directory
- OpenAPI Spec: http://localhost:8080/docs
- Issues: Report via GitHub Issues
