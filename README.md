# HollyShip - Package Tracking with Rewards

> **Track any package, anywhere—automatically—and earn rewards for every delivery milestone.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## 🚀 Quick Start

See [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions.

```bash
# Start infrastructure
docker compose up -d postgres redis

# Setup backend
cd Hollybackend
npm install
npx prisma migrate deploy
npm run dev

# Backend runs on http://localhost:8080
```

## 📋 Current Implementation Status

This repository implements the MVP roadmap defined in `docs/MVP_ROADMAP.md` and `docs/FOUNDER_ROADMAP.md`.

### ✅ Phase 0 - Foundations (COMPLETE)
- TypeScript backend with Fastify
- PostgreSQL + Redis infrastructure
- OpenAPI specification
- Health monitoring
- Logging and request tracking

### ✅ Phase 1 - Tracking MVP (COMPLETE)
- **Core APIs**: Create, retrieve, and manage shipments
- **Carrier Resolution**: Auto-detect carriers from tracking numbers
- **Status System**: Canonical status mapping (CREATED → IN_TRANSIT → DELIVERED)
- **Webhooks**: Receive updates from tracking providers
- **Background Jobs**: Automatic polling for shipment updates
- **External Integration**: Support for AfterShip, 17TRACK, EasyPost, Shippo

### ✅ Phase 2 - Rewards (COMPLETE)
- **Points System**: +25 for IN_TRANSIT, +50 for DELIVERED
- **Tiers**: Bronze (0-499), Silver (500-1999), Gold (2000+)
- **Anti-Abuse**: Daily accrual cap, idempotent ledger
- **APIs**: Loyalty balance, tier tracking, redemption (stub)

### 🚧 Phase 3 - Email Ingestion (Infrastructure Ready)
- Gmail OAuth flow (requires API keys)
- Outlook OAuth flow (requires API keys)
- Email parsing with tracking number extraction
- Watch/subscription setup for push notifications

### ✅ Phase 4 - Privacy & Compliance (Partial)
- GDPR data export (`GET /v1/me/export`)
- Account deletion (`DELETE /v1/me`)
- Encrypted field storage (optional)

## 🏗️ Architecture

```
Frontend (React + Vite)
    ↓ REST API
Backend (Fastify + TypeScript)
    ↓ Prisma ORM
PostgreSQL Database
    ↓
Background Jobs (Polling)
    ↓
External APIs (Tracking Providers)
```

## 🔑 Key Features

- **Multi-Carrier Support**: UPS, FedEx, USPS, DHL, and more
- **Automatic Tracking**: Extract tracking numbers from emails (Phase 3)
- **Real-Time Updates**: Webhooks and polling for status changes
- **Notification Preferences**: Customize how you receive updates (email, push, webhook, SMS)
- **Rewards Program**: Earn points for tracking shipments
- **Privacy-First**: GDPR/CCPA compliant with data export/deletion
- **Developer-Friendly**: Full OpenAPI spec at `/docs`

## 📚 Documentation

- [Quick Start Guide](QUICKSTART.md) - Get up and running
- [Notification Preferences](docs/NOTIFICATION_PREFERENCES.md) - Configure notifications
- [MVP Roadmap](docs/MVP_ROADMAP.md) - Implementation plan
- [Founder Roadmap](docs/FOUNDER_ROADMAP.md) - Product vision
- [Architecture](docs/ARCHITECTURE_INFRA.md) - Deployment guide
- [OpenAPI Spec](docs/openapi.yaml) - API reference

## 🧪 Testing

Run the integration test suite:

```bash
./test-mvp.sh
```

Tests cover:
- Health checks
- Shipment creation and tracking
- User registration and authentication
- Status transitions and webhooks
- Loyalty point accrual
- Data export (GDPR)
- Background job monitoring

## 🎨 UI/UX

**Color Palette** (cloud-inspired):
- Primary: `#4BA3FF`
- Accent: `#8ED1FC`
- Dark text: `#1F2A44`
- Light background: `#F5F8FD`

All colors meet WCAG AA contrast requirements.

## 🔌 API Endpoints

### Tracking
- `POST /v1/shipments/resolve` - Create shipment
- `GET /v1/shipments/{id}` - Get details
- `POST /v1/webhooks/tracking` - Receive updates

### Carriers
- `GET /v1/carriers/detect` - Detect from tracking number
- `GET /v1/carriers/aggregate` - Use external provider

### Authentication
- `POST /v1/auth/email/start` - Magic link flow
- `POST /v1/auth/email/verify` - Verify code
- `POST /v1/auth/oauth` - OAuth login

### Loyalty
- `GET /v1/users/{id}/loyalty` - Points and tier
- `POST /v1/loyalty/redeem` - Redeem rewards

### Email Integration
- `POST /v1/connect/email/gmail` - Gmail OAuth
- `POST /v1/connect/email/outlook` - Outlook OAuth

### Privacy
- `GET /v1/me/export` - Export data
- `DELETE /v1/me` - Delete account

### Notifications
- `GET /v1/me/notification-preferences` - List preferences
- `GET /v1/me/notification-preferences/{method}` - Get preference
- `POST /v1/me/notification-preferences` - Create/update preference
- `PATCH /v1/me/notification-preferences/{method}` - Update preference
- `DELETE /v1/me/notification-preferences/{method}` - Delete preference

See full API docs at http://localhost:8080/docs

## ⚙️ Configuration

Key environment variables (see `Hollybackend/.env.example`):

```bash
# Required
DATABASE_URL=postgresql://...
PORT=8080

# Optional
AES_SECRET=your-encryption-key-32-chars-min
WEBHOOK_SECRET=your-webhook-secret
DAILY_POINTS_CAP=500

# Tracking Providers
HOLLY_AGGREGATOR_BASE_URL=https://api.aftership.com
HOLLY_AGGREGATOR_API_KEY=your-api-key

# Email Integration (Phase 3)
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret
OUTLOOK_CLIENT_ID=your-client-id
OUTLOOK_CLIENT_SECRET=your-client-secret
```

## 🎯 Future Roadmap

### Phase 3 - Email Ingestion
- [ ] Connect Gmail API with real credentials
- [ ] Connect Outlook/Graph API
- [ ] Email parsing corpus with tests
- [ ] Shopify/WooCommerce webhooks

### Phase 4 - Mobile & Advanced
- [ ] React Native mobile app
- [ ] Map view with real-time location
- [ ] Delivery calendar and scheduling
- [ ] Multi-account linking

### Phase 5 - Scale & Polish
- [ ] Comprehensive test suite
- [ ] Load testing and optimization
- [ ] Analytics dashboards
- [ ] Admin panel

## 📦 Tech Stack

- **Backend**: TypeScript, Fastify, Prisma
- **Database**: PostgreSQL
- **Cache**: Redis (infrastructure ready)
- **Frontend**: React, Vite
- **Auth**: Email magic links, OAuth (Google, Apple)
- **APIs**: OpenAPI 3.0 spec
- **Deployment**: Docker Compose

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `./test-mvp.sh`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [Product Blueprint](docs/PRODUCT_BLUEPRINT.md)
- [Feature Ideas](docs/FEATURE_IDEAS.md)
- [Architecture Details](docs/ARCHITECTURE_INFRA.md)

## 10 engaging features to add
1. Real-time tracking timeline with map and status history.
2. Smart ETA predictions that adjust based on carrier performance and weather.
3. Saved addresses with autofill and nickname support.
4. Rewards and streaks for on-time pickups and eco-friendly delivery choices.
5. In-app chat with support, including quick canned responses for common issues.
6. Flexible delivery controls: pause, reschedule, or redirect mid-route when allowed.
7. Locker or pickup-point selection with availability shown in real time.
8. Carbon footprint insights per shipment with optional offsets.
9. Photo confirmation on delivery plus delivery notes for drivers.
10. Multi-carrier price and speed comparison before booking.

## Build & run (local)
- Frontend: `npm install && npm run dev` (or `npm run build && npm run preview`) from repo root.
- Backend: `cd Hollybackend && npm install && npm run dev` (requires env + database per `Hollybackend/.env.example` if present).
- See [QUICKSTART.md](QUICKSTART.md) for detailed instructions.

