# HollyShip — Product Blueprint (AI Tracking + Rewards)

> Source: user-provided blueprint (Dec 24, 2025). This document is intended as the guiding spec for future backend/mobile implementation.

## Goals

1. Universal delivery tracking: track any shipment/order by tracking number across carriers, stores, and marketplaces.
2. Loyalty & rewards: users earn points that unlock coupons & discounts.

---

## 1) High-level architecture

### Frontends

- Mobile: React Native or Flutter (iOS/Android)
- Web: React/Next.js

### Backends

- API Gateway: REST/GraphQL (Node.js/TypeScript with NestJS or Python/FastAPI)
- Services (microservices or modular monolith):
  - Ingestion Service: Email, e-commerce and marketplace connectors, manual add
  - Carrier Resolver & Tracker: detect carrier from tracking number; call carrier APIs; normalize statuses
  - Events & Notifications: Webhooks → event bus → push/email/SMS
  - Rewards Engine: points accrual, tiers, coupons, redemption, anti-fraud
  - Partners & Coupons: offer catalog, eligibility, issuance, redemption flows
  - Privacy & Compliance: consent, minimization, retention, delete/export, audit

### Data

- DB: PostgreSQL (OLTP) + Redis (caching) + S3/Blob (attachments)
- Analytics: BigQuery/Redshift/ClickHouse for events

### Infra

- Event bus: Kafka or cloud Pub/Sub (idempotent consumers)
- Jobs: scheduler for re-polling carriers; retry/backoff; DLQs
- Secrets: Vault/KMS; OAuth tokens per connector

---

## 2) Order & tracking sources (go beyond Shop)

1. Email connectors (OAuth)
   - Gmail via Gmail API + watch/webhook (Pub/Sub)
   - Outlook/Microsoft 365 via Microsoft Graph webhooks
   - Parse messages (MIME), extract tracking IDs & metadata with regex + ML classification
   - Respect scopes; store only derived tracking data, not raw email content

2. E-commerce platforms (OAuth + webhooks)
   - Shopify, WooCommerce, BigCommerce, Magento: subscribe to order/create, fulfillment/update webhooks

3. Marketplaces (where permitted)
   - Amazon, eBay, AliExpress: integrate via official APIs when allowed (avoid scraping)

4. Carrier aggregation APIs
   - Integrate with multi-carrier providers (AfterShip, 17TRACK, EasyPost, Shippo)
   - Fallback: direct carrier APIs (UPS, FedEx, DHL, USPS, etc.)

5. Manual add / link paste
   - User pastes tracking number or carrier tracking URL; resolver detects carrier & starts polling

---

## 3) Canonical shipment model (normalize “anything”)

```sql
-- PostgreSQL (core tables)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  locale TEXT,
  tz TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE carriers (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE,        -- e.g., "ups", "fedex", "japan_post", "aftership:sf-express"
  name TEXT,
  api_source TEXT          -- "direct" | "aggregator"
);

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  merchant_name TEXT,      -- store/marketplace
  order_number TEXT,
  currency TEXT,
  total_amount NUMERIC(12,2),
  created_at TIMESTAMPTZ,
  source TEXT              -- "email" | "shopify" | "outlook" | "manual" | "amazon_api"
);

CREATE TABLE shipments (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  carrier_id UUID REFERENCES carriers(id),
  tracking_number TEXT,
  status TEXT,             -- canonical: "CREATED","IN_TRANSIT","OUT_FOR_DELIVERY","DELIVERED","DELAYED","ACTION_REQUIRED","FAILURE"
  eta TIMESTAMPTZ,
  origin TEXT,
  destination TEXT,
  last_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tracking_events (
  id BIGSERIAL PRIMARY KEY,
  shipment_id UUID REFERENCES shipments(id),
  carrier_status TEXT,     -- raw status
  canonical_status TEXT,   -- mapped
  location TEXT,
  event_time TIMESTAMPTZ,
  payload JSONB            -- full raw event
);

CREATE TABLE loyalty_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  shipment_id UUID REFERENCES shipments(id),
  points INT,
  reason TEXT,             -- "ORDER_LINKED","IN_TRANSIT","DELIVERED","SURVEY","PARTNER_PROMO"
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, shipment_id, reason) -- idempotency
);

CREATE TABLE coupons (
  id UUID PRIMARY KEY,
  partner_code TEXT,       -- brand offering
  coupon_code TEXT UNIQUE,
  points_cost INT,
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  redeemed_by UUID REFERENCES users(id),
  redeemed_at TIMESTAMPTZ
);
```

---

## 4) Key APIs

```http
POST /v1/shipments/resolve
Body: { "trackingNumber": "1Z123...", "hintCarrier": null }

GET /v1/shipments/{id}

POST /v1/shipments/{id}/refresh

POST /v1/orders
Body: { "merchantName": "...", "orderNumber": "...", "shipments": [...] }

GET /v1/users/{id}/loyalty

POST /v1/loyalty/redeem
Body: { "couponId": "..." }

POST /v1/connect/email/gmail

POST /v1/connect/platform/shopify

POST /v1/webhooks/carrier

POST /v1/notifications/test
```

---

## 5) Event flow

1. User links Gmail/Outlook → OAuth → set webhook/watch
2. Email arrives → ingestion parses → resolver determines carrier → shipment created
3. Webhook or polling → tracking event → canonical mapping → shipment update → rewards accrue
4. Notifications: out-for-delivery/action required/delivered
5. Partners module: offers + coupon issuance/redemption

---

## 6) Rewards engine (points, tiers, coupons, fraud controls)

### Earning rules (examples)

- +10 points when a shipment is created (first time)
- +25 points when status moves to IN_TRANSIT
- +50 points on DELIVERED (optionally verified)
- +20 points for rating merchant or adding missing info (opt-in)

### Tiers

- Bronze: 0–499
- Silver: 500–1999
- Gold: 2000+

### Fraud prevention

- Verify tracking belongs to user (recipient/ZIP/phone/email where possible)
- Block duplicate tracking numbers across accounts
- Detect velocity/volume abuse; cap points per day/week
- Risk scoring (device/IP reputation)

---

## 7) Email parsing & carrier detection

- Regex heuristics for popular carriers (UPS/FedEx/USPS/DHL etc.)
- ML classifier for carrier/merchant identification with confidence scores
- Resolver order: regex → aggregator lookup → direct carrier probe → user confirmation if ambiguous

---

## 8) Notifications & UX

- Push via Firebase/APNs; email via SES/SendGrid; SMS via Twilio
- Shipment detail + last known location + ETA (if available)
- Action banners for customs/duties/failed delivery/pickup
- Privacy-first controls and opt-outs

---

## 9) Privacy, compliance, and ToS

- Consent + minimal scopes
- Store extracted tracking metadata (avoid storing raw email content)
- Delete/export flows
- Encryption, key management, secret rotation
- ToS compliance (avoid unauthorized scraping)
- Regional compliance (GDPR/CCPA/LGPD)

---

## 10) QA plan

- Contract tests (carrier/aggregator stubs)
- Canonical status schema validation
- Idempotency tests for webhook retries
- Email parsing corpus and precision/recall measurement
- Rewards engine edge cases and caps
- Load tests (webhooks/min)
- Security tests around OAuth/tokens/URL fetching

---

## 11) Example backend snippets (TypeScript/NestJS)

```ts
@Injectable()
export class CarrierResolverService {
  constructor(private readonly carriers: CarrierRegistry, private readonly agg: AggregatorClient) {}

  async resolve(trackingNumber: string, hint?: string): Promise<CarrierMatch> {
    const regexHit = this.carriers.matchByRegex(trackingNumber, hint);
    if (regexHit) return regexHit;

    const aggHit = await this.agg.identify(trackingNumber);
    if (aggHit) return aggHit;

    const directHit = await this.tryDirectAPIs(trackingNumber);
    if (directHit) return directHit;

    throw new UnprocessableEntityException('Carrier not found');
  }
}
```

```ts
@Injectable()
export class LoyaltyService {
  async accrue(userId: string, shipmentId: string, milestone: CanonicalStatus) {
    const points = this.pointsFor(milestone);
    await this.ledger.addOnce(userId, shipmentId, milestone, points);
  }
}
```

---

## 12) “Tell the AI to build it” — master prompt

(Kept verbatim from your blueprint)

    System:
    You are a senior full-stack architect. Produce production-ready code (NestJS TypeScript + Postgres + Redis + Kafka + React Native). Follow clean architecture, DDD modules, and OpenAPI 3.0. Include unit/integration tests.

    User:
    Build an AI-powered delivery tracking & rewards app with these MVP requirements:

    1) Ingestion:
    - Gmail + Outlook OAuth; set webhooks/watches; parse emails for tracking numbers using regex + ML.
    - Shopify/WooCommerce webhooks for orders/fulfillments.
    - Manual tracking add via tracking number or URL.

    2) Tracking:
    - Carrier resolver (regex → aggregator → direct APIs).
    - Store canonical statuses: CREATED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, DELAYED, ACTION_REQUIRED, FAILURE.
    - Polling + webhook handlers; idempotent, retry with exponential backoff.

    3) Rewards:
    - Loyalty ledger with points for milestones (IN_TRANSIT +25, DELIVERED +50).
    - Tiers (Bronze/Silver/Gold) and coupon redemption flow.

    4) APIs:
    - Endpoints described in section 4 above; generate OpenAPI docs.
    - RBAC with JWT/OAuth; rate limits.

    5) Frontend:
    - React Native app: Orders tab, Shipment detail with map, Rewards tab with points & coupons.
    - Push notifications.

    6) Non-functional:
    - GDPR/CCPA features (consent, delete/export).
    - Logging, metrics, health checks.
    - CI/CD scripts and containerization (Docker), infra IaC templates.

    Deliver:
    - Repo with backend, mobile, tests, OpenAPI spec, and scripts to run locally with docker-compose.

---

## 13) Monetization & partnerships

- Affiliate & partner coupons
- Premium plan
- Merchant dashboards (opt-in)

---

## 14) Implementation phases

- Weeks 1–2: resolver + aggregator + schema + manual tracking
- Weeks 3–4: Gmail/Outlook + webhooks + push + basic rewards
- Weeks 5–6: Shopify/WooCommerce + coupons + fraud + QA hardening
- Week 7+: marketplace partnerships + analytics + tiers
