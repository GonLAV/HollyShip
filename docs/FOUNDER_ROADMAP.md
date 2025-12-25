# HollyShip — Founder-Grade Roadmap

> Source: user-provided roadmap (Dec 24, 2025). This complements [docs/PRODUCT_BLUEPRINT.md](docs/PRODUCT_BLUEPRINT.md) and [docs/MVP_ROADMAP.md](docs/MVP_ROADMAP.md).

## 0) Vision & strategy (North Star)

**Mission:** Track any package, anywhere—automatically—and reward users for every delivery milestone.

**North-star metric (NSM):**

- Weekly Active Trackers (WAT): unique users with at least 1 active shipment updated in last 7 days

**Supporting KPIs:**

- Activation rate (accounts linked within 24h)
- Track success rate (valid tracking mapped to canonical status)
- Time to first milestone (< 24h from add → IN_TRANSIT)
- Retention (D7, D30)
- Reward redemption rate
- Referral uplift (K-factor)

---

## Phase 1 (Weeks 1–2): MVP Foundations

**Goal:** Lovable MVP with manual add + carrier resolver + canonical timeline, minimal backend.

**Deliverables**

- Canonical data model (users, orders, shipments, tracking_events, loyalty_ledger, coupons)
- Carrier Resolver (regex → aggregator API → direct probe fallback)
- Manual tracking add (tracking number + carrier select)
- Shipment detail page (canonical statuses + timeline + ETA placeholder)
- Basic rewards (points on IN_TRANSIT + DELIVERED)
- Security baseline (JWT sessions, HTTPS, rate limits)
- Observability (structured logs, health checks)

**AI components (now)**

- AI text extraction (offline): extract tracking numbers from text (regex + heuristics)
- Status normalization: rule-based carrier terms → canonical statuses

**QA**

- Contract tests for APIs
- JSON schema validation for responses
- Idempotency tests (double events shouldn’t double points)
- Test corpus of tracking formats for UPS/FedEx/USPS/DHL
- Load test add/refresh endpoints (e.g., 100 RPS)

**Success criteria**

- Add → Resolve → status visible in < 5s
- ≥95% of known-format tracking numbers mapped to correct carrier

---

## Phase 2 (Weeks 3–4): Auto-tracking & notifications

**Goal:** Connect Gmail + Outlook; parse emails; subscribe to platform webhooks (Shopify/WooCommerce).

**Deliverables**

- OAuth connectors (Gmail, Outlook)
- Email ingestion pipeline (webhooks/watches → parse → extraction)
- Shopify/WooCommerce webhooks (order/fulfillment create/update)
- Event bus + job scheduler (polling/backoff)
- Notifications (web push/email; mobile later)
- Privacy settings UI (consent, source controls, delete/export)

**AI components**

- Lightweight email classifier (tracking vs non-tracking + likely carrier)
- Entity extraction (tracking number, merchant, ETA keywords)

**Success criteria**

- ≥70% shipping emails create an auto-shipment
- ≥90% notifications delivered within 30s of status change

---

## Phase 3 (Weeks 5–6): Rewards engine & coupon marketplace

**Goal:** Habit-forming loyalty tiers + coupons.

**Deliverables**

- Points accrual rules (CREATED +10, IN_TRANSIT +25, DELIVERED +50)
- Bronze/Silver/Gold tiers
- Coupon catalog + redemption flow (idempotent, cool-downs)
- Fraud controls (dedupe tracking, velocity limits)

**AI components**

- Coupon recommendations based on merchants
- Risk scoring for suspicious activity

**Success criteria**

- ≥30% users reach Silver in 30 days
- ≥15% users redeem at least one coupon

---

## Phase 4 (Weeks 7–10): Mobile app, maps & pro

**Goal:** React Native app with maps, better ETAs, pro features.

**Deliverables**

- RN app (Orders, Shipment detail, Rewards)
- Map view for last known location (when available)
- Advanced features (delivery calendars, pickup QR codes, reschedule links)
- Multi-account linking
- GDPR/CCPA export/delete
- Analytics funnels

---

## Continuous: Data, privacy, compliance, trust

- Store only derived tracking metadata (avoid raw email content)
- Explicit consent + granular toggles
- One-click delete/export, retention policies
- Encryption in transit/at rest, secret rotation
- Public trust signals (security page, responsible disclosure)

---

## Execution calendar (first 10 weeks)

- W1–W2: Manual tracking, resolver, timeline, points
- W3: Gmail OAuth + ingestion pipeline v1
- W4: Outlook + Shopify/WooCommerce + web push
- W5: Rewards tiers + coupons + fraud + referrals
- W6: Analytics + SEO pages
- W7–W8: React Native app + maps
- W9: Chrome/Edge extension
- W10: Public launch + hardening
