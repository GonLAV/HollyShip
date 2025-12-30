import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import useDebouncedValue from '../hooks/useDebouncedValue'

const RAW_FEATURES: string[] = [
  "Real-time delivery map with live courier position.",
  "Delivery ETA confidence score with weather/traffic inputs.",
  "Multi-carrier smart pickup scheduling.",
  "In-app reschedule or reroute when carrier allows.",
  "Doorstep photo confirmation and proof-of-delivery vault.",
  "Delivery instructions per address (gate code, leave at desk).",
  "Package grouping by household member or team.",
  "Shared tracking links with expiring access.",
  "Carbon footprint estimate per shipment.",
  "Optional carbon offsets checkout.",
  "Loyalty points for on-time pickups and eco choices.",
  "Streaks and badges for organizing deliveries.",
  "Smart inbox that auto-highlights urgent shipments.",
  "Delay risk prediction with proactive alerts.",
  "Smart notifications (mute non-urgent, escalate action-required).",
  "Calendar sync for expected delivery windows.",
  "Siri/Google Assistant voice intents to ask “where’s my package.”",
  "Watch app glance for next delivery.",
  "Lock screen widgets for ETA.",
  "Bulk import from email inbox history.",
  "Gmail/Outlook auto-labeling rules for shipping emails.",
  "Marketplace connectors (Amazon, eBay, Etsy) using official APIs.",
  "E-commerce platform webhooks (Shopify, WooCommerce).",
  "In-store pickup reminders with QR code surface.",
  "Return label vault with reminders before window closes.",
  "One-tap return pickup scheduling where supported.",
  "Smart carrier suggestions by cost/speed/reliability.",
  "Address book with verification and geocoding.",
  "Household profiles with per-person notification settings.",
  "Guest access for roommates/biz assistants.",
  "Delivery anomaly detection (stalled package alert).",
  "Multi-leg tracking (handoffs tracked automatically).",
  "Alternate carrier handoff detection (new tracking ID capture).",
  "SLA breach detection for priority shipments.",
  "Insurance recommendation for high-value shipments.",
  "Secure document shipping workflow.",
  "Export shipments to CSV/JSON for expense reports.",
  "Expense tagging by project/client.",
  "Inbox cleanup suggestions (archive old shipment emails).",
  "Multi-language UI with auto-locale detection.",
  "Dark mode and high-contrast accessibility theme.",
  "WCAG-friendly focus and keyboard nav.",
  "Custom notification channels (email, SMS, push, webhook).",
  "Slack/Teams notifications for business accounts.",
  "Webhooks for developers to consume tracking updates.",
  "Public tracking pages with brand/logo customization.",
  "White-label embeddable tracking widget.",
  "QR code generator for pickup lockers.",
  "Geofenced notifications when courier is nearby.",
  "Smart delivery window prediction based on history.",
  "Reroute to locker/neighbor where carrier supports it.",
  "Proof-of-age required indicator.",
  "Temperature-sensitive shipment alerts (cold chain).",
  "Signature-required status surfaced early.",
  "Cross-border customs milestone tracking.",
  "Duty/tax estimation for imports.",
  "Multi-warehouse shipment split awareness.",
  "Multi-package in one order grouping.",
  "Photo-to-track: snap label and auto-extract tracking number.",
  "Clipboard watcher on mobile/desktop for tracking numbers.",
  "Browser extension to capture tracking numbers at checkout.",
  "“Track by order number” via merchant connector.",
  "SMS-to-track ingestion for carriers that text updates.",
  "Offline cache of latest statuses.",
  "Data export & account deletion self-service.",
  "Privacy mode: redact merchant names on shared links.",
  "Do-not-track list for senders/merchants.",
  "Family safety mode (hide sender names).",
  "Heatmap of delivery density by city.",
  "Insights dashboard for monthly shipping volume.",
  "Carrier reliability score by route.",
  "Emissions dashboard by user and time period.",
  "Package dimension/weight capture for future quotes.",
  "Saved packaging presets for small businesses.",
  "Label generation via carrier APIs (business tier).",
  "Pickup scheduling for outbound shipments.",
  "Bulk label purchase and manifest generation.",
  "Scan-to-ship with barcode support.",
  "Return tracking with RMA linkage.",
  "Refund/claim workflow helper when package lost.",
  "Dispute assistant template for damaged items.",
  "Delivery tipping flow where supported.",
  "Photo notes for drop-off location hints.",
  "Geotagged delivery event map history.",
  "Predictive reroute suggestion if user away (calendar-aware).",
  "Travel mode to pause home deliveries.",
  "Vacation hold reminders with carrier links.",
  "Smart grouping by delivery day.",
  "“On vehicle” progress percent visualization.",
  "Opt-in crowdsourced status verification.",
  "Merchant performance leaderboard (speed/accuracy).",
  "Coupon/offer surfacing after successful delivery.",
  "Loyalty redemption for shipping discounts.",
  "Partner offers for packaging supplies.",
  "AI chatbot for “where is my package” and reroute steps.",
  "Incident timeline with evidences for claims.",
  "Compare carriers for same route historically.",
  "Custom statuses for internal ops teams.",
  "API rate limits dashboard for developers.",
  "Uptime/status page with subscriber alerts."
]

type Feature = { id: number; text: string; categories: string[] }

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Tracking: ['track', 'tracking', 'courier', 'map', 'eta', 'vehicle', 'handoff', 'multi-leg'],
  Notifications: ['notification', 'alerts', 'mute', 'escalate', 'lock screen', 'geofenced'],
  Integrations: ['gmail', 'outlook', 'shopify', 'woocommerce', 'amazon', 'ebay', 'etsy', 'webhook', 'api', 'marketplace', 'connector', 'extension'],
  Returns: ['return', 'rma', 'refund', 'claim'],
  Eco: ['carbon', 'emissions', 'eco'],
  Analytics: ['dashboard', 'insights', 'score', 'leaderboard'],
  Security: ['privacy', 'redact', 'guest', 'access', 'age', 'signature', 'vault'],
  Accessibility: ['wcag', 'keyboard', 'high-contrast', 'dark mode'],
  Shipping: ['label', 'pickup', 'manifest', 'warehouse', 'package', 'dimension', 'weight', 'quote', 'insurance'],
  Automation: ['auto', 'smart', 'suggestions', 'prediction', 'assistant'],
  Business: ['expense', 'csv', 'json', 'project', 'client', 'sla', 'ops', 'rate limits', 'uptime'],
}

function categorize(text: string): string[] {
  const t = text.toLowerCase()
  const cats: string[] = []
  for (const [cat, keys] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keys.some(k => t.includes(k))) cats.push(cat)
  }
  return cats.length ? cats : ['General']
}

export default function FeaturesPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const qDebounced = useDebouncedValue(q, 250)
  const cParam = params.get('c') ?? 'All'
  const selectedCats = useMemo(() => new Set((cParam === 'All' ? [] : cParam.split(',')).filter(Boolean)), [cParam])

  const data = useMemo<Feature[]>(() => RAW_FEATURES.map((text, idx) => ({
    id: idx + 1,
    text,
    categories: categorize(text),
  })), [])

  const allCategories = useMemo(() => {
    const set = new Set<string>(['All'])
    data.forEach(f => f.categories.forEach(cat => set.add(cat)))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [data])

  const filtered = useMemo(() => {
    const s = qDebounced.trim().toLowerCase()
    return data.filter((f) => {
      const matchQ = !s || f.text.toLowerCase().includes(s)
      const matchC = selectedCats.size === 0 || f.categories.some(cat => selectedCats.has(cat))
      return matchQ && matchC
    })
  }, [data, qDebounced, selectedCats])

  function setQuery(next: string) {
    const nextParams = new URLSearchParams(params)
    next ? nextParams.set('q', next) : nextParams.delete('q')
    setParams(nextParams, { replace: true })
  }

  function setCategory(next: string) {
    const nextParams = new URLSearchParams(params)
    if (next === 'All') {
      nextParams.delete('c')
    } else {
      const current = new Set(selectedCats)
      if (current.has(next)) current.delete(next)
      else current.add(next)
      const csv = Array.from(current).join(',')
      if (csv) nextParams.set('c', csv)
      else nextParams.delete('c')
    }
    setParams(nextParams, { replace: true })
  }

  return (
    <div>
      <h1>HollyShip — 100 Feature Ideas <span className="badge">v0</span></h1>
      <div className="subtitle">Browse by category or search by keyword.</div>

      <div className="cta">
        <div>
          Want to start building? Explore our scoped
          <Link to="/starters" className="cta-link"> Feature Starters</Link> to kick off core ideas like a live map, smart notifications, and more.
        </div>
      </div>

      <div className="search" role="search">
        <input
          placeholder="Search features (e.g. notifications, carbon, export)"
          value={q}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search features"
        />
      </div>

      <div className="filters" role="tablist" aria-label="Categories">
        <button
          key="All"
          className={`chip ${selectedCats.size === 0 ? 'active' : ''}`}
          onClick={() => setCategory('All')}
          role="tab"
          aria-selected={selectedCats.size === 0}
        >
          All
        </button>
        {allCategories.filter(c => c !== 'All').map(cat => (
          <button
            key={cat}
            className={`chip ${selectedCats.has(cat) ? 'active' : ''}`}
            onClick={() => setCategory(cat)}
            role="tab"
            aria-selected={selectedCats.has(cat)}
          >
            {cat}
          </button>
        ))}
        {selectedCats.size > 0 && (
          <button className="chip" onClick={() => setCategory('All')}>Clear</button>
        )}
      </div>

      <div className="count">Showing {filtered.length} of {RAW_FEATURES.length}</div>
      <ul className="features">
        {filtered.map(f => (
          <li key={f.id}>
            <div><strong>#{f.id}</strong> — {renderHighlighted(f.text, qDebounced)}</div>
            <div>
              {f.categories.map(cat => (
                <span key={cat} className="badge">{cat}</span>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <footer>
        Draft UI for ideation. Built with Vite + React + TS.
      </footer>
      <style>{`
        .cta { margin: 12px 0 16px; padding: 12px; border: 1px dashed var(--border); border-radius: 8px; background: var(--bg-muted); }
        .cta-link { margin-left: 6px; font-weight: 600; color: var(--link); text-decoration: none; }
        .cta-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function renderHighlighted(text: string, query: string) {
  const q = query.trim()
  if (!q) return text
  try {
    const re = new RegExp(`(${escapeRegExp(q)})`, 'ig')
    const parts = text.split(re)
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>
    )
  } catch {
    return text
  }
}
