import { Link } from 'react-router-dom'

type Starter = { slug: string; title: string; summary: string }

const STARTERS: Starter[] = [
  { slug: 'live-map', title: 'Real-time Delivery Map', summary: 'Show live courier position and route with ETA.' },
  { slug: 'smart-notifications', title: 'Smart Notifications', summary: 'Mute non-urgent, escalate action-required with rules.' },
  { slug: 'return-vault', title: 'Return Label Vault', summary: 'Store labels and remind before window closes.' },
  { slug: 'webhooks', title: 'Webhooks & Dev Hooks', summary: 'Notify external systems on tracking updates.' },
  { slug: 'public-tracking', title: 'Public Tracking Pages', summary: 'Shareable branded tracking pages with expiry.' },
  { slug: 'carbon-footprint', title: 'Carbon Footprint', summary: 'Estimate emissions per shipment and totals.' },
]

export default function StartersIndex() {
  return (
    <div>
      <h1>Feature Starters</h1>
      <p>Kick off implementation with scoped goals, APIs, and acceptance criteria.</p>
      <ul className="features">
        {STARTERS.map(s => (
          <li key={s.slug}>
            <div><strong>{s.title}</strong></div>
            <div className="subtitle">{s.summary}</div>
            <div><Link to={`/starters/${s.slug}`} className="starters-link">Open starter →</Link></div>
          </li>
        ))}
      </ul>
    </div>
  )
}
