import { Link, useParams } from 'react-router-dom'
import LiveMapStarter from './LiveMapStarter'
import SmartNotificationsStarter from './SmartNotificationsStarter'
import ReturnVaultStarter from './ReturnVaultStarter'
import WebhooksStarter from './WebhooksStarter'
import PublicTrackingStarter from './PublicTrackingStarter'
import CarbonFootprintStarter from './CarbonFootprintStarter'

const registry: Record<string, { title: string; Component: () => JSX.Element }> = {
  'live-map': { title: 'Real-time Delivery Map', Component: LiveMapStarter },
  'smart-notifications': { title: 'Smart Notifications', Component: SmartNotificationsStarter },
  'return-vault': { title: 'Return Label Vault', Component: ReturnVaultStarter },
  'webhooks': { title: 'Webhooks & Dev Hooks', Component: WebhooksStarter },
  'public-tracking': { title: 'Public Tracking Pages', Component: PublicTrackingStarter },
  'carbon-footprint': { title: 'Carbon Footprint', Component: CarbonFootprintStarter },
}

export default function StartersRouter() {
  const { slug } = useParams<{ slug: string }>()
  if (!slug) return null
  const entry = registry[slug]
  if (!entry) {
    return (
      <div>
        <h1>Starter not found</h1>
        <p>We don’t have a starter for “{slug}” yet.</p>
        <p>
          Explore existing starters on <Link to="/starters">Starters</Link>.
        </p>
      </div>
    )
  }
  const { Component, title } = entry
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        <Link to="/starters" style={{ fontSize: 14 }}>
          ← Back to Starters
        </Link>
      </div>
      <Component />
    </div>
  )
}
