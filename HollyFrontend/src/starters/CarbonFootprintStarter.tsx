export default function CarbonFootprintStarter() {
  return (
    <div>
      <h1>Starter: Carbon Footprint</h1>
      <p>Goal: Estimate emissions for shipments based on distance, mode, and package weight.</p>
      <h3>Acceptance Criteria</h3>
      <ul>
        <li>Show per-shipment CO₂e estimate and route distance.</li>
        <li>Aggregate footprint for a time window.</li>
        <li>Toggle transport mode assumptions.</li>
      </ul>
      <h3>APIs & Data</h3>
      <ul>
        <li>Distance calculation using existing geo utilities.</li>
        <li>Emission factors table (frontend constants to start).</li>
      </ul>
      <h3>Next Steps</h3>
      <ol>
        <li>Implement distance util and factors.</li>
        <li>Render widget on shipment detail.</li>
        <li>Add report view with filtering.</li>
      </ol>
    </div>
  )
}
