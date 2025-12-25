# HollyShip — MVP Roadmap (Actionable Checklist)

This turns [docs/PRODUCT_BLUEPRINT.md](docs/PRODUCT_BLUEPRINT.md) into a concrete build plan.

## MVP definition (first shippable)

- Users can add a shipment by tracking number
- App shows canonical status + timeline
- Users earn points for status milestones (IN_TRANSIT, DELIVERED)
- Users can view points + tier
- Basic coupon redemption stub (no real partners yet)

---

## Phase 0 — Repo foundations (1–2 days)

- [ ] Backend service scaffold (TypeScript API)
- [ ] Postgres + Redis via docker-compose
- [ ] OpenAPI spec checked in (docs/openapi.yaml)
- [ ] Environment config templates (.env.example)
- [ ] Logging + request id
- [ ] Health endpoints (/health)

---

## Phase 1 — Tracking MVP (week 1)

### Core data model
- [ ] Tables/models: users, carriers, shipments, tracking_events, loyalty_ledger, coupons
- [ ] Canonical statuses: CREATED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, DELAYED, ACTION_REQUIRED, FAILURE
- [ ] Status mapping layer (carrier → canonical)

### APIs (minimal)
- [ ] POST /v1/shipments/resolve
- [ ] GET /v1/shipments/{id}
- [ ] POST /v1/shipments/{id}/refresh (enqueue job)

### Tracking provider integration
Choose **one** for MVP:
- [ ] Aggregator sandbox integration (AfterShip/17TRACK/EasyPost/Shippo)
  - [ ] Identify carrier
  - [ ] Fetch tracking status
  - [ ] Webhook receiver (optional for MVP)

### Jobs
- [ ] Polling job for shipments not delivered
- [ ] Retry/backoff + idempotency keys

---

## Phase 2 — Rewards MVP (week 2)

### Points rules (MVP)
- [ ] +25 points on transition to IN_TRANSIT (once per shipment)
- [ ] +50 points on transition to DELIVERED (once per shipment)

### Rewards APIs
- [ ] GET /v1/users/{id}/loyalty (points + tier)
- [ ] POST /v1/loyalty/redeem (stub)

### Tiers
- [ ] Bronze: 0–499
- [ ] Silver: 500–1999
- [ ] Gold: 2000+

### Anti-abuse (basic)
- [ ] Idempotent loyalty ledger (unique constraints)
- [ ] Daily accrual cap (config)

---

## Phase 3 — Ingestion (post-MVP)

- [ ] Gmail OAuth + watch/webhook
- [ ] Outlook OAuth + Graph subscriptions
- [ ] Email parsing corpus + regression tests
- [ ] Shopify/WooCommerce webhook ingestion

---

## Phase 4 — Privacy & compliance (post-MVP)

- [ ] Consent records for email scanning
- [ ] Data export endpoint (JSON)
- [ ] Data deletion endpoint (right-to-delete)
- [ ] Retention policies (attachments/raw payload)

---

## QA checklist (MVP)

- [ ] Contract tests against tracking provider stub
- [ ] Status mapping unit tests
- [ ] Webhook idempotency tests (replayed payload)
- [ ] Rewards accrual tests (no double credit)
- [ ] Load test: N shipments x polling interval
