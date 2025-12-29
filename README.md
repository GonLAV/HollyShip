# HollyShip roadmap

## Push email for package order updates
- Send transactional emails for every major order status (placed, packed, shipped, out-for-delivery, delivered, delayed, returned).
- Include tracking link, ETA, and support contact in each email.
- Allow users to toggle email frequency (all updates vs. only critical changes).

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

## UI/UX color refresh (cloud-inspired)
- Primary: #4BA3FF; Accent: #8ED1FC; Dark text: #1F2A44; Light background: #F5F8FD.
- Keep high contrast for text/icons; use accent for calls-to-action and status chips.
- WCAG AA contrast checks: #1F2A44 on #F5F8FD (13.39:1) and on #8ED1FC (8.61:1) are compliant; #4BA3FF on #1F2A44 (5.42:1) works for inverse buttons; avoid #4BA3FF on #F5F8FD for body text.

## Architecture & infrastructure for public access
- See [`docs/ARCHITECTURE_INFRA.md`](docs/ARCHITECTURE_INFRA.md) for the deployment-ready plan covering frontend/backend, data, hosting, security, scalability, monitoring, and CI/CD.

## Build & run (local)
- Frontend: `npm install && npm run dev` (or `npm run build && npm run preview`) from repo root.
- Backend: `cd Hollybackend && npm install && npm run dev` (requires env + database per `Hollybackend/.env.example` if present).
