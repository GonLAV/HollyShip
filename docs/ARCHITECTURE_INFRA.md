# HollyShip — Public-Ready Architecture & Infrastructure Plan

This plan maps the current prototype to a deployable, secure, and scalable setup so external users can access HollyShip reliably.

## Core Architecture
- **Frontend**: React web app (Vite). Add PWA hardening (caching strategy, icons, offline shell) and WCAG AA checks. Optional: React Native shell for mobile parity.
- **Backend API**: REST/GraphQL on Node.js (NestJS/Express) with validation (Zod/JOI), RBAC/ABAC middleware, and OpenAPI-first development (`docs/openapi.yaml`).
- **Service boundaries** (can start as a modular monolith):
  - Ingestion (email/webhooks/manual), Carrier Resolver & Tracker, Notifications, User/Auth, Rewards/Offers.
  - Background jobs for carrier polling and email parsing.

## Data & Storage
- **Primary DB**: PostgreSQL (managed: RDS/Cloud SQL). Enable automated backups, PITR, read replicas, pgBouncer/connection pooling.
- **Cache**: Redis (ElastiCache/Memorystore) for hot shipment lookups and rate limiting buckets.
- **Object storage**: S3/Azure Blob/GCS for email attachments and exports; fronted by CDN (CloudFront/Azure CDN) for public assets.
- **Analytics**: Ship events to BigQuery/Redshift/ClickHouse via stream (Kafka/Pub/Sub/Kinesis) for product analytics.

## Hosting & Networking
- **Compute**: Containerize web + API. Deploy on managed container platform (ECS/Fargate, Cloud Run, or AKS/GKE) with auto-scaling policies.
- **Domain & TLS**: Custom domain via Route53/Cloud DNS; issue certs with ACM/Let’s Encrypt; enforce HTTPS/HSTS.
- **Load balancer**: L7 ALB/Ingress with health checks and sticky sessions disabled (stateless services).
- **Networking**: Private subnets for services/DB/cache; NAT for egress; security groups limiting DB/Redis to app only.

## Security
- **AuthN/Z**: OAuth 2.0/OIDC (Auth0/Cognito/Azure AD). Short-lived JWTs, refresh tokens in httpOnly cookies. Role/tenant-aware guards on every route.
- **Secrets**: KMS-backed secret store (SSM Parameter Store/Secret Manager/Key Vault). No secrets in code or images.
- **Traffic protection**: TLS everywhere, WAF rules for OWASP top 10, DDoS shielding (Shield/Cloud Armor), IP allowlists for admin.
- **Abuse controls**: Rate limiting + user-level throttles (Redis), request size limits, file scanning for uploads.
- **Data**: At-rest encryption (EBS/RDS/S3 managed keys), field-level encryption for PII, retention + deletion workflows.

## Scalability & Reliability
- **Auto-scaling**: CPU/RAM/queue-depth based scaling for API/web workers; horizontal-first.
- **Queues**: SQS/Service Bus/Pub/Sub for async jobs (email ingest, carrier polling, notifications). Dead-letter queues with alerting.
- **Caching**: Redis for session-less caching; CDN for static assets; client-side HTTP caching headers tuned.
- **Resilience**: Health probes, circuit breakers, retries with backoff, idempotency keys on webhook/job handlers.
- **Backups/DR**: Daily DB snapshots, cross-region replication for DB/object storage, restore runbooks.

## Monitoring & Analytics
- **Observability**: Structured JSON logs to CloudWatch/Stackdriver + log-based metrics; OpenTelemetry traces; metrics via Prometheus/Grafana or managed equivalents.
- **APM/Error tracking**: Sentry/DataDog for frontend + backend; alert on p95 latency, error rate, and queue lag.
- **Product analytics**: GA4/Amplitude/Mixpanel on web; privacy-friendly consent + sampling.

## CI/CD & Release
- **Pipelines**: GitHub Actions → lint/test/build → Docker image → security scans (Snyk/trivy) → deploy to staging → smoke tests → prod.
- **Deployment strategy**: Blue/Green or canary on the load balancer/Ingress; feature flags for risky changes.
- **IaC**: Terraform/Bicep/CloudFormation to version infra (networking, DB, caches, queues, CDNs, WAF).
- **Runbooks**: On-call playbooks for outage types (DB, queue backlog, auth outage), with dashboard links.

## Usability & Access Readiness
- **Perf**: Core Web Vitals budgets, image/CDN optimization, API latency targets (<300ms p95 for common reads).
- **Accessibility**: Maintain WCAG AA for color, focus, and keyboard navigation.
- **Support**: Status page (Statuspage/UptimeRobot), in-app help links, and postman collection (`postman/HollyShip.postman_collection.json`) for external testers.
