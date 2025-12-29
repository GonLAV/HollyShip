export default function WebhooksStarter() {
  return (
    <div>
      <h1>Starter: Webhooks & Dev Hooks</h1>
      <p>Goal: Configure outbound webhooks for shipment events with signing secrets and retries.</p>
      <h3>Acceptance Criteria</h3>
      <ul>
        <li>Create/update webhook endpoints with test delivery.</li>
        <li>Signature verification details and recent delivery logs.</li>
        <li>Replay failed deliveries with exponential backoff.</li>
      </ul>
      <h3>APIs & Data</h3>
      <ul>
        <li>Webhook endpoints CRUD (new endpoints required).</li>
        <li>Delivery attempt logs and replay route.</li>
      </ul>
      <h3>Next Steps</h3>
      <ol>
        <li>Build endpoints table with status badges.</li>
        <li>Add create/edit modal with validation.</li>
        <li>Implement test send + signature info.</li>
      </ol>
    </div>
  )
}
