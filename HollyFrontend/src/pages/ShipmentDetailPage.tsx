import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { ShipmentDetail, ShipmentChainItem } from '../api/types'
import MiniMap from '../ui/MiniMap'
import { burstConfetti, celebrate } from '../ui/celebration'
import { useToast } from '../ui/toaster'
import { API_BASE_URL } from '../config'
import { usePreferencesStore, type AnimationStyle } from '../state/preferences'

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<ShipmentDetail | null>(null)
  const [chain, setChain] = useState<ShipmentChainItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailUpdates, setEmailUpdates] = useState<boolean>(() => {
    try { return localStorage.getItem('emailUpdates') === '1' } catch { return false }
  })
  const [expectedDays, setExpectedDays] = useState<number | null>(null)
  const [expectedInput, setExpectedInput] = useState('')
  const prevDetail = useRef<ShipmentDetail | null>(null)
  const { show } = useToast()
  const animationsEnabled = usePreferencesStore(s => s.animationsEnabled)
  const setAnimationsEnabled = usePreferencesStore(s => s.setAnimationsEnabled)
  const animationStyle = usePreferencesStore(s => s.animationStyle)
  const setAnimationStyle = usePreferencesStore(s => s.setAnimationStyle)
  const soundEnabled = usePreferencesStore(s => s.soundEnabled)
  const setSoundEnabled = usePreferencesStore(s => s.setSoundEnabled)
  const respectReducedMotion = usePreferencesStore(s => s.respectReducedMotion)
  const setRespectReducedMotion = usePreferencesStore(s => s.setRespectReducedMotion)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const sid = id!
        const [detailResp, chainResp] = await Promise.all([
          api.getShipment(sid),
          api.getShipmentChain(sid).then(r => r.items),
        ])
        if (!cancelled) {
          setDetail(detailResp)
          setChain(chainResp)
          prevDetail.current = detailResp
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load shipment')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const interval = setInterval(async () => {
      try {
        const sid = id!
        const next = await api.getShipment(sid)
        if (cancelled) return
        const previous = prevDetail.current
        setDetail(next)
        prevDetail.current = next
        if (previous) {
          const prevEvents = previous.events?.length ?? 0
          const nextEvents = next.events?.length ?? 0
          if (nextEvents > prevEvents) {
            show(`New update: ${next.events[0]?.canonicalStatus ?? 'Shipment updated'}`)
            if (animationsEnabled) burstConfetti()
          }
          const latest = next.events?.[0]
          const latestText = (latest?.canonicalStatus || latest?.carrierStatus || '').toLowerCase()
          const prevLatestText = (previous.events?.[0]?.canonicalStatus || previous.events?.[0]?.carrierStatus || '').toLowerCase()
          const becameOFD = !prevLatestText.includes('out for delivery') && latestText.includes('out for delivery')
          if (becameOFD) {
            show('Your package is on the way!')
            if (emailUpdates) {
              sendEmailOnTheWay(sid).catch(() => {
                show('Tried to email you, but email service is not configured.')
              })
            }
          }
          const wasDelivered = previous.status?.toLowerCase() === 'delivered'
          const isDelivered = next.status?.toLowerCase() === 'delivered' || latestText.includes('delivered')
          if (!wasDelivered && isDelivered) {
            show('Delivered! 🎉')
            if (animationsEnabled) {
              celebrate({
                style: animationStyle,
                duration: 5000,
                sound: soundEnabled,
                respectReducedMotion,
              })
            }
          }
        }
      } catch {
        // ignore transient failures
      }
    }, 10000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [id, emailUpdates, show, animationsEnabled, animationStyle, soundEnabled, respectReducedMotion])

  useEffect(() => {
    try { localStorage.setItem('emailUpdates', emailUpdates ? '1' : '0') } catch {}
  }, [emailUpdates])

  useEffect(() => {
    if (!id) return
    try {
      const stored = localStorage.getItem(`eta-days:${id}`)
      if (stored) {
        setExpectedDays(Number(stored))
        setExpectedInput(stored)
      }
    } catch {}
  }, [id])

  useEffect(() => {
    if (!id) return
    try {
      if (expectedDays == null) {
        localStorage.removeItem(`eta-days:${id}`)
      } else {
        localStorage.setItem(`eta-days:${id}`, String(expectedDays))
      }
    } catch {}
  }, [expectedDays, id])

  const title = useMemo(() => {
    if (!detail) return 'Shipment'
    return detail.label || detail.trackingNumber
  }, [detail])

  const etaMsg = useMemo(() => {
    if (!detail) return ''
    return etaMessage(detail.createdAt, expectedDays)
  }, [detail, expectedDays])

  return (
    <div>
      <p><Link to="/shipments">← Back to Shipments</Link></p>
      <h1>{title}</h1>

      {loading && <div>Loading…</div>}
      {error && <div className="error" role="alert">{error}</div>}

      <div className="email-row">
        <label>
          <input type="checkbox" checked={emailUpdates} onChange={(e) => setEmailUpdates(e.target.checked)} />
          <span style={{ marginLeft: 6 }}>Email me updates (on-the-way, delivered)</span>
        </label>
      </div>

      <div className="email-row">
        <label>
          <input type="checkbox" checked={animationsEnabled} onChange={(e) => setAnimationsEnabled(e.target.checked)} />
          <span style={{ marginLeft: 6 }}>Enable animations</span>
        </label>
      </div>

      {animationsEnabled && (
        <>
          <div className="email-row" style={{ marginLeft: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ minWidth: 120 }}>Animation style:</span>
              <select 
                value={animationStyle} 
                onChange={(e) => setAnimationStyle(e.target.value as AnimationStyle)}
                style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit' }}
              >
                <option value="fireworks">🎆 Fireworks</option>
                <option value="confetti">🎊 Confetti</option>
                <option value="stars">⭐ Stars</option>
                <option value="rainbow">🌈 Rainbow</option>
                <option value="pride">💙 Brand Colors</option>
              </select>
            </label>
          </div>

          <div className="email-row" style={{ marginLeft: 24 }}>
            <label>
              <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
              <span style={{ marginLeft: 6 }}>🔊 Play sound effect</span>
            </label>
          </div>

          <div className="email-row" style={{ marginLeft: 24 }}>
            <label>
              <input type="checkbox" checked={respectReducedMotion} onChange={(e) => setRespectReducedMotion(e.target.checked)} />
              <span style={{ marginLeft: 6 }}>♿ Respect reduced motion preference</span>
            </label>
          </div>

          <div className="email-row" style={{ marginLeft: 24 }}>
            <button 
              className="chip" 
              onClick={() => celebrate({ 
                style: animationStyle, 
                duration: 3000, 
                sound: soundEnabled,
                respectReducedMotion 
              })}
            >
              🎉 Test Animation
            </button>
          </div>
        </>
      )}

      {detail && (
        <>
          <section className="eta-panel">
            <h2>ETA tracker</h2>
            {detail.eta && (
              <p>
                Carrier ETA: {new Date(detail.eta).toLocaleDateString()} ({etaDaysLeft(detail.eta)} day(s) left)
              </p>
            )}
            <label>
              Expected business days
              <input
                type="number"
                min={1}
                value={expectedInput}
                onChange={(e) => {
                  const next = e.target.value
                  setExpectedInput(next)
                  setExpectedDays(next ? Number(next) : null)
                }}
                placeholder="e.g. 10"
              />
            </label>
            <p className="eta-message">{etaMsg}</p>
            {expectedDays != null && etaMsg.includes('overdue') && (
              <p>
                <a className="chip" href={supportMailto(detail, expectedDays)} target="_blank" rel="noreferrer">Contact support</a>
              </p>
            )}
          </section>

          <div className="detail-grid">
            <div>
              <div><strong>Status:</strong> {detail.status}</div>
              <div><strong>Carrier:</strong> {detail.carrier ?? 'Unknown'}</div>
              <div><strong>Tracking #:</strong> {detail.trackingNumber} <button className="chip" onClick={() => copyTracking(detail.trackingNumber)}>Copy</button></div>
              <div><strong>ETA:</strong> {detail.eta ? new Date(detail.eta).toLocaleString() : '—'}</div>
              <div><strong>Route:</strong> {detail.origin ?? 'Unknown'} → {detail.destination ?? 'Unknown'}</div>
              <div><strong>Created:</strong> {new Date(detail.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div><strong>Current pos:</strong> {fmtLatLng(detail.currentLat, detail.currentLng)}</div>
              <div><strong>Origin coords:</strong> {fmtLatLng(detail.originLat, detail.originLng)}</div>
              <div><strong>Dest coords:</strong> {fmtLatLng(detail.destinationLat, detail.destinationLng)}</div>
              <div style={{ marginTop: 8 }}>
                <MiniMap
                  width={320}
                  height={160}
                  points={[
                    { lat: detail.originLat, lng: detail.originLng, kind: 'origin' },
                    { lat: detail.destinationLat, lng: detail.destinationLng, kind: 'destination' },
                    { lat: detail.currentLat, lng: detail.currentLng, kind: 'current' },
                  ]}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {detail && (
        <section>
          <h2>Events</h2>
          <ul className="features">
            {detail.events.map(ev => (
              <li key={ev.id}>
                <div><strong>{ev.canonicalStatus}</strong> {ev.carrierStatus ? `· ${ev.carrierStatus}` : ''}</div>
                <div>{ev.location ?? '—'}</div>
                <div>{new Date(ev.eventTime).toLocaleString()}</div>
              </li>
            ))}
          </ul>
          {detail.events.length === 0 && <div>No events yet.</div>}
        </section>
      )}

      {chain.length > 0 && (
        <section>
          <h2>Tracking Chain</h2>
          <ul className="features">
            {chain.map(item => (
              <li key={item.id}>
                <div><strong>{item.carrier ?? 'Unknown carrier'}</strong> — {item.trackingNumber}</div>
                <div>Handoff #{item.handoffIndex} {item.isCurrent ? '· current' : ''}</div>
                <div>{new Date(item.createdAt).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <style>{`
        .eta-panel { border: 1px dashed var(--border); padding: 1rem; border-radius: 10px; background: var(--card); margin-bottom: 1.5rem; }
        .eta-panel label { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 600; }
        .eta-panel input { padding: 0.5rem; border-radius: 6px; border: 1px solid var(--border); background: var(--bg); }
        .eta-message { margin: 0.5rem 0; font-weight: 500; }
        .eta-note { color: var(--danger); font-size: 0.9rem; }
      `}</style>
    </div>
  )
}

function fmtLatLng(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return '—'
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

async function sendEmailOnTheWay(id: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/notify/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shipmentId: id, template: 'on_the_way' }),
    })
    return await res.json().catch(() => ({}))
  } catch {
    // ignore
  }
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function etaDaysLeft(eta: string) {
  const diff = Math.ceil((new Date(eta).getTime() - Date.now()) / MS_PER_DAY)
  return Math.max(0, diff)
}

function etaMessage(createdAt: string, expectedDays: number | null) {
  if (!expectedDays) return 'Set the expected business days to see countdowns.'
  const start = new Date(createdAt)
  if (Number.isNaN(start.getTime())) return 'Unable to compute timeline.'
  const elapsed = businessDaysBetween(start, new Date())
  const remaining = expectedDays - elapsed
  if (remaining > 0) return `${remaining} business day(s) left until expected arrival.`
  if (remaining === 0) return `Shipment is expected to arrive today (day ${expectedDays}).`
  return `Shipment is ${-remaining} business day(s) overdue. Please contact customer support.`
}

function businessDaysBetween(start: Date, end: Date) {
  const from = new Date(start)
  const to = new Date(end)
  from.setHours(0, 0, 0, 0)
  to.setHours(0, 0, 0, 0)
  if (from > to) return 0
  let count = 0
  const cursor = new Date(from)
  while (cursor <= to) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

function copyTracking(tn: string) {
  try {
    navigator.clipboard.writeText(tn)
  } catch {}
}

function supportMailto(detail: ShipmentDetail, expectedDays: number | null) {
  const tn = detail.trackingNumber
  const label = detail.label ?? ''
  const subject = encodeURIComponent(`Support: Overdue shipment ${label || tn}`)
  const body = encodeURIComponent(`Hello support,%0A%0AMy shipment appears overdue.%0A%0ATracking: ${tn}%0ALabel: ${label}%0AExpected business days: ${expectedDays ?? ''}%0ACreated: ${detail.createdAt}%0A%0AThanks.`)
  return `mailto:support@example.com?subject=${subject}&body=${body}`
}
