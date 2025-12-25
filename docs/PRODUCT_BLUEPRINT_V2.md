# HollyShip — AI-Powered Tracking + Rewards (Blueprint v2)

This document captures an updated, end-to-end blueprint for building **HollyShip** into an **AI-powered tracking app** with:

1) **Universal delivery tracking** (track any shipment/order by tracking number across carriers, stores, marketplaces)
2) **Loyalty & rewards** (users earn points that unlock coupons & discounts)

> Note: “Track any shipment” is aspirational. In practice, near-universal coverage comes from combining aggregator APIs + platform webhooks + email parsing while respecting ToS.

---

## 1) High-level architecture

**Frontends**

- **Mobile**: React Native or Flutter (iOS/Android)
- **Web**: React/Next.js

**Backends**

- **API Gateway**: REST/GraphQL (Node.js/TypeScript with NestJS or Python/FastAPI)
- **Services (microservices or modular monolith)**
  - **Ingestion Service**: Email, e-commerce and marketplace connectors, manual add
  - **Carrier Resolver & Tracker**: Detect carrier from tracking number; call carrier APIs; normalize statuses
  - **Events & Notifications**: Webhooks → Event bus → push/email/SMS
  - **Rewards Engine**: Points accrual, tiers, coupons, redemption, anti-fraud
  - **Partners & Coupons**: Offer catalog, eligibility, issuance, redemption
  - **Privacy & Compliance**: Consent, minimization, retention, delete/export, audit

**Data**

- **DB**: PostgreSQL (OLTP) + Redis (caching) + S3/Blob (attachments)
- **Analytics**: BigQuery/Redshift/ClickHouse for events

**Infra**

- **Event bus**: Kafka or cloud Pub/Sub (idempotent consumers)
- **Jobs**: Scheduler for re-polling carriers; retry/backoff; dead-letter queues
- **Secrets**: Vault/KMS; OAuth tokens per connector

---

## 2) Order & tracking sources (go beyond Shop)

Support multiple ingestion paths:

1) **Email connectors (OAuth)**
- Gmail via Gmail API + watch/webhook (Pub/Sub)
- Outlook/Microsoft 365 via Microsoft Graph webhooks
- Parse MIME; extract tracking IDs & metadata with regex + ML classification
- Store only derived tracking data (not raw email content)

2) **E-commerce platforms (OAuth + webhooks)**
- Shopify, WooCommerce, BigCommerce, Magento
- Subscribe to order/create, fulfillment/update to ingest tracking immediately

3) **Marketplaces (where permitted)**
- Amazon/eBay/AliExpress via official APIs only (often strict policies)

4) **Carrier aggregation APIs**
- Integrate with one/more multi-carrier providers (AfterShip, 17TRACK, EasyPost, Shippo)
- Fallback to direct carrier APIs when aggregator lacks support

5) **Manual add / link paste**
- Paste tracking number or carrier tracking URL; resolver detects carrier; start polling

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
  status TEXT,             -- canonical statuses
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
  payload JSONB            -- raw event
);

CREATE TABLE loyalty_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  shipment_id UUID REFERENCES shipments(id),
  points INT,
  reason TEXT,             -- "ORDER_LINKED","IN_TRANSIT","DELIVERED",...
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, shipment_id, reason) -- idempotency
);

CREATE TABLE coupons (
  id UUID PRIMARY KEY,
  partner_code TEXT,
  coupon_code TEXT UNIQUE,
  points_cost INT,
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  redeemed_by UUID REFERENCES users(id),
  redeemed_at TIMESTAMPTZ
);
```

Canonical statuses: `CREATED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, DELAYED, ACTION_REQUIRED, FAILURE`.

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

1) User links Gmail/Outlook → OAuth → set webhook/watch
2) Email arrives → ingestion classifies/extracts → carrier resolver → shipment created
3) Carrier webhook/polling → tracking event → canonical map → update shipment → rewards accrue
4) Notifications for milestones/action-required
5) Partners module suggests offers; redemption issues coupon code

---

## 6) Rewards engine

**Earning rules (examples)**

- +10 when shipment is created (first time)
- +25 when status moves to IN_TRANSIT
- +50 when DELIVERED (optionally attested)
- +20 for rating/adding info (opt-in)

**Tiers**

- Bronze: 0–499
- Silver: 500–1999
- Gold: 2000+

**Fraud prevention**

- Verify shipment belongs to user (recipient/ZIP/last-4, where possible)
- Block duplicate tracking across accounts
- Rate limit points accrual
- Risk scoring (device/IP/velocity)

---

## 7) Email parsing & carrier detection

- Start with regex heuristics per carrier + validation/check digit logic where applicable
- Add ML classifier for carrier/merchant detection with confidence scoring
- Resolver order:
  1) deterministic regex
  2) aggregator identify
  3) direct carrier probe
  4) user confirmation if ambiguous

---

## 8) Notifications & UX

- Push: FCM/APNs
- Email: SES/SendGrid
- SMS: Twilio
- Map view for last known location (when available)
- Action banners (customs/pickup/failed delivery)
- Privacy-first controls for sources and stored data

---

## 9) Privacy, compliance, ToS

- Explicit consent for email scanning; minimal scopes
- Data minimization (store derived data, not full raw content)
- One-click delete/export
- Encrypt at rest/transit; rotate secrets; short-lived tokens
- Avoid restricted scraping; comply with marketplace/carrier ToS

---

## 10) QA plan

- Contract tests with carrier/aggregator stubs
- Schema validation (canonical statuses) via OpenAPI
- Idempotency tests for webhook retries
- Email parsing corpus with precision/recall tracking
- Rewards edge cases and caps
- Load tests (webhooks/event throughput)
- Security tests (OAuth leakage, SSRF protections)

---

## 11) Example backend snippets (TypeScript)

```ts
// carrier-resolver.service.ts
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
// loyalty.service.ts
@Injectable()
export class LoyaltyService {
  async accrue(userId: string, shipmentId: string, milestone: CanonicalStatus) {
    const points = this.pointsFor(milestone);
    await this.ledger.addOnce(userId, shipmentId, milestone, points);
  }
}
```

---

## 12) Master prompt (for AI builder)

System:
- You are a senior full-stack architect. Produce production-ready code (NestJS TypeScript + Postgres + Redis + Kafka + React Native). Follow clean architecture, DDD modules, and OpenAPI 3.0. Include unit/integration tests.

User:
- Build an AI-powered delivery tracking & rewards app with MVP requirements:
  - Ingestion: Gmail + Outlook OAuth, platform webhooks, manual add
  - Tracking: resolver (regex → aggregator → direct), canonical statuses, polling/webhooks with retries
  - Rewards: loyalty ledger, tiers, coupon redemption
  - APIs: endpoints described above; OpenAPI docs; JWT/rate limits
  - Frontend: RN app tabs + push notifications
  - Non-functional: GDPR delete/export, observability, docker-compose

---

## 13) Monetization & partnerships

- Affiliate/coupon revenue
- Premium plan (multi sources, advanced alerts)
- Merchant dashboards for exclusive offers (opt-in)

---

## 14) Phasing

- Weeks 1–2: resolver, aggregator integration, canonical schema, manual tracking
- Weeks 3–4: Gmail/Outlook connectors, ingestion pipeline, push, basic rewards
- Weeks 5–6: Shopify/WooCommerce, coupon catalog, fraud controls, QA hardening
- Week 7+: marketplaces (partnerships), analytics, tiered offers
