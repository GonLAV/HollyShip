export default function PublicTrackingStarter() {
  return (
    <div>
      <h1>Starter: Public Tracking Pages</h1>
      <p>Goal: Generate shareable tracking pages with the latest status, map, and carrier info.</p>
      <h3>Acceptance Criteria</h3>
      <ul>
        <li>Public route with shipment ID/token.</li>
        <li>Read-only view: status, events, map, estimated delivery.</li>
        <li>Branding and theme options.</li>
      </ul>
      <h3>APIs & Data</h3>
      <ul>
        <li>GET shipment by token; optional signed URLs for assets.</li>
      </ul>
      <h3>Next Steps</h3>
      <ol>
        <li>Create public route and fetch logic.</li>
        <li>Design share dialog from the internal detail page.</li>
        <li>Add theme selector and preview.</li>
      </ol>
    </div>
  )
}
