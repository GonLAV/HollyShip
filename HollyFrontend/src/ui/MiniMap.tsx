type Pt = { lat: number | null; lng: number | null; kind: 'origin' | 'destination' | 'current' }

function normalize(points: Pt[]) {
  const valid = points.filter(p => p.lat != null && p.lng != null) as { lat: number; lng: number; kind: Pt['kind'] }[]
  if (valid.length === 0) return { points: [], bbox: { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 } }
  let minLat = Math.min(...valid.map(p => p.lat))
  let maxLat = Math.max(...valid.map(p => p.lat))
  let minLng = Math.min(...valid.map(p => p.lng))
  let maxLng = Math.max(...valid.map(p => p.lng))
  if (minLat === maxLat) { minLat -= 0.1; maxLat += 0.1 }
  if (minLng === maxLng) { minLng -= 0.1; maxLng += 0.1 }
  return { points: valid, bbox: { minLat, maxLat, minLng, maxLng } }
}

export default function MiniMap({ width = 300, height = 150, points }: { width?: number; height?: number; points: Pt[] }) {
  const { points: pts, bbox } = normalize(points)
  function project(lat: number, lng: number) {
    const x = (lng - bbox.minLng) / (bbox.maxLng - bbox.minLng)
    const y = 1 - (lat - bbox.minLat) / (bbox.maxLat - bbox.minLat)
    return { x: x * width, y: y * height }
  }

  const origin = pts.find(p => p.kind === 'origin')
  const dest = pts.find(p => p.kind === 'destination')
  const curr = pts.find(p => p.kind === 'current')

  const o = origin ? project(origin.lat, origin.lng) : null
  const d = dest ? project(dest.lat, dest.lng) : null
  const c = curr ? project(curr.lat, curr.lng) : null

  return (
    <svg width={width} height={height} role="img" aria-label="Route map preview" style={{ border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card)' }}>
      {o && d && (
        <line x1={o.x} y1={o.y} x2={d.x} y2={d.y} stroke="var(--accent)" strokeWidth={2} strokeDasharray="4 3" />
      )}
      {o && (
        <circle cx={o.x} cy={o.y} r={5} fill="#4caf50" />
      )}
      {d && (
        <rect x={d.x - 5} y={d.y - 5} width={10} height={10} fill="#2196f3" />
      )}
      {c && (
        <circle cx={c.x} cy={c.y} r={4} fill="#ff9800" />
      )}
    </svg>
  )}
