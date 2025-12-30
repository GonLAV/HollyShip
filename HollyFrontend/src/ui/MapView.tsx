import { useEffect, useRef } from 'react'
import L, { LatLngExpression, Map as LeafletMap, Marker as LeafletMarker, Polyline as LeafletPolyline } from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type LatLng = { lat: number; lng: number }

type Props = {
  origin: LatLng
  destination: LatLng
  current?: LatLng
  simulate?: boolean
  speedKmh?: number
  className?: string
  style?: React.CSSProperties
}

export default function MapView({ origin, destination, current, simulate = false, speedKmh = 60, className, style }: Props) {
  const divRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const currentRef = useRef<LeafletMarker | null>(null)
  const routeRef = useRef<LeafletPolyline | null>(null)
  const simRef = useRef<number | null>(null)

  // init map
  useEffect(() => {
    if (!divRef.current) return
    if (mapRef.current) return
    const map = L.map(divRef.current, { zoomControl: true, attributionControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)
    mapRef.current = map
  }, [])

  // draw static markers and route
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // clear route if exists
    if (routeRef.current) {
      map.removeLayer(routeRef.current)
      routeRef.current = null
    }

    const o = L.marker(toLL(origin), { title: 'Origin' }).addTo(map)
    const d = L.marker(toLL(destination), { title: 'Destination' }).addTo(map)

    const line = L.polyline([toLL(origin), toLL(destination)], { color: '#0a84ff', weight: 4, opacity: 0.8 }).addTo(map)
    routeRef.current = line

    // current marker
    if (currentRef.current) {
      map.removeLayer(currentRef.current)
      currentRef.current = null
    }
    const c = current ?? origin
    currentRef.current = L.marker(toLL(c), { title: 'Current position' }).addTo(map)

    const points: LatLngExpression[] = [toLL(origin), toLL(destination)]
    if (current) points.push(toLL(current))
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds.pad(0.2))

    return () => {
      map.removeLayer(o)
      map.removeLayer(d)
      if (currentRef.current) map.removeLayer(currentRef.current)
      if (routeRef.current) map.removeLayer(routeRef.current)
    }
  }, [origin, destination])

  // update current marker when prop changes
  useEffect(() => {
    if (!current) return
    if (!currentRef.current) return
    currentRef.current.setLatLng(toLL(current))
  }, [current])

  // simple simulation along the straight route
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!simulate) {
      if (simRef.current) {
        window.clearInterval(simRef.current)
        simRef.current = null
      }
      return
    }
    const totalKm = distanceKm(origin, destination)
    const totalHours = totalKm / Math.max(1, speedKmh)
    const totalMs = totalHours * 3600_000
    const start = Date.now()
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / totalMs)
      const pos = lerp(origin, destination, t)
      if (currentRef.current) currentRef.current.setLatLng(toLL(pos))
      if (t >= 1 && simRef.current) {
        window.clearInterval(simRef.current)
        simRef.current = null
      }
    }
    tick()
    simRef.current = window.setInterval(tick, 1000)
    return () => {
      if (simRef.current) window.clearInterval(simRef.current)
      simRef.current = null
    }
  }, [simulate, speedKmh, origin, destination])

  return <div ref={divRef} className={className} style={{ height: 360, borderRadius: 8, overflow: 'hidden', ...style }} aria-label="Map" />
}

function toLL(p: LatLng): LatLngExpression {
  return [p.lat, p.lng]
}

function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t }
}

// Haversine distance in km
function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const la1 = toRad(a.lat)
  const la2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
function toRad(d: number) { return (d * Math.PI) / 180 }
