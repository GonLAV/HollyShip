import { useMemo, useState } from 'react'
import MapView, { LatLng } from '../ui/MapView'

export default function LiveMapStarter() {
  // Sample route: San Francisco -> Los Angeles
  const origin = useMemo<LatLng>(() => ({ lat: 37.7749, lng: -122.4194 }), [])
  const destination = useMemo<LatLng>(() => ({ lat: 34.0522, lng: -118.2437 }), [])
  const [simulate, setSimulate] = useState(true)
  const [speed, setSpeed] = useState(70)

  return (
    <div>
      <h1>Starter: Real-time Delivery Map</h1>
      <p>Interactive map with origin, destination, route, and a moving courier marker. Toggle simulation and adjust speed below.</p>

      <MapView origin={origin} destination={destination} simulate={simulate} speedKmh={speed} style={{ marginTop: 8, marginBottom: 12 }} />

      <div className="panel" aria-label="Map controls">
        <label className="row">
          <input type="checkbox" checked={simulate} onChange={(e) => setSimulate(e.target.checked)} />
          <span>Simulate courier movement</span>
        </label>
        <label className="row">
          <span>Speed</span>
          <input type="range" min={10} max={130} step={5} value={speed} onChange={(e) => setSpeed(parseInt(e.target.value))} aria-label="Speed km/h" />
          <span>{speed} km/h</span>
        </label>
      </div>

      <h3>Acceptance Criteria</h3>
      <ul>
        <li>Map renders with markers for origin, destination, and current location.</li>
        <li>Path visualized; ETA displayed and updates.</li>
        <li>Auto-fit bounds to include route markers.</li>
        <li>Accessible: keyboard panning/zoom fallback and labels.</li>
      </ul>

      <h3>Notes</h3>
      <ul>
        <li>Using OpenStreetMap tiles via Leaflet; no API key required.</li>
        <li>Current marker moves along the straight route for demo; replace with real updates from `/v1/shipments/:id`.</li>
      </ul>

      <style>{`
        .panel { display: grid; gap: 8px; border: 1px solid var(--border); padding: 12px; border-radius: 8px; background: var(--bg); }
        .row { display: flex; gap: 8px; align-items: center; }
      `}</style>
    </div>
  )
}
