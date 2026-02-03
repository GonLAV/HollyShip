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
  const giftSurpriseMode = usePreferencesStore(s => s.giftSurpriseMode)
  const setGiftSurpriseMode = usePreferencesStore(s => s.setGiftSurpriseMode)
  const showWeatherImpact = usePreferencesStore(s => s.showWeatherImpact)
  const setShowWeatherImpact = usePreferencesStore(s => s.setShowWeatherImpact)
  
  // Package notes feature
  const [packageNotes, setPackageNotes] = useState<string>(() => {
    try { return localStorage.getItem(`notes:${id}`) || '' } catch { return '' }
  })
  
  // Weather impact simulation (would be from API in production)
  const [weatherImpact, setWeatherImpact] = useState<{severity: 'none' | 'low' | 'medium' | 'high', description: string} | null>(null)
  
  useEffect(() => {
    // Simulate weather check based on destination
    if (detail?.destination && showWeatherImpact) {
      // In production, this would call a weather API
      const random = Math.random()
      if (random > 0.7) {
        setWeatherImpact({
          severity: random > 0.9 ? 'high' : random > 0.8 ? 'medium' : 'low',
          description: random > 0.9 ? '❄️ Heavy snow may delay delivery' 
                     : random > 0.8 ? '🌧️ Rain in delivery area' 
                     : '☁️ Cloudy conditions'
        })
      } else {
        setWeatherImpact(null)
      }
    } else {
      setWeatherImpact(null)
    }
  }, [detail?.destination, showWeatherImpact])
  
  const saveNotes = (notes: string) => {
    setPackageNotes(notes)
    try { localStorage.setItem(`notes:${id}`, notes) } catch {}
  }

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
  
  // Human-readable time remaining
  const timeRemaining = useMemo(() => {
    if (!detail?.eta) return null
    const now = new Date()
    const eta = new Date(detail.eta)
    const diffMs = eta.getTime() - now.getTime()
    
    if (diffMs < 0) return 'ETA passed'
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (days > 1) return `~${days} days`
    if (days === 1) return '~1 day'
    if (hours > 1) return `~${hours} hours`
    if (hours === 1) return '~1 hour'
    return 'Less than 1 hour'
  }, [detail?.eta])
  
  // Latest event with emoji
  const latestEventEmoji = useMemo(() => {
    if (!detail?.events || detail.events.length === 0) return '📦'
    const latest = detail.events[0]
    const status = latest.canonicalStatus.toLowerCase()
    
    if (status.includes('delivered')) return '✅'
    if (status.includes('out_for_delivery')) return '🚚'
    if (status.includes('in_transit')) return '📦'
    if (status.includes('delayed')) return '⏰'
    if (status.includes('failure')) return '❌'
    return '📦'
  }, [detail?.events])

  return (
    <div>
      <p><Link to="/shipments">← Back to Shipments</Link></p>
      <h1>{title}</h1>

      {/* Quick Actions Bar */}
      {detail && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem' }} role="toolbar" aria-label="Shipment actions">
          <button 
            className="chip" 
            onClick={() => {
              navigator.clipboard.writeText(detail.trackingNumber)
              show('📋 Tracking number copied!')
            }}
            title="Copy tracking number to clipboard"
            aria-label="Copy tracking number to clipboard"
          >
            📋 Copy Tracking #
          </button>
          
          <button 
            className="chip" 
            onClick={() => {
              const url = window.location.href
              navigator.clipboard.writeText(url)
              show('🔗 Link copied! Share with anyone.')
            }}
            title="Copy page link to share"
            aria-label="Copy page link to share"
          >
            🔗 Share Link
          </button>
          
          <button 
            className="chip" 
            onClick={async () => {
              try {
                const next = await api.getShipment(id!)
                setDetail(next)
                show('✅ Status refreshed!')
              } catch {
                show('❌ Failed to refresh')
              }
            }}
            title="Refresh tracking status"
            aria-label="Refresh tracking status"
          >
            🔄 Refresh
          </button>

          {detail.status === 'DELIVERED' && (
            <span className="chip" style={{ background: 'var(--primary)', color: 'white', cursor: 'default' }} role="status" aria-label="Package delivered">
              ✓ Delivered
            </span>
          )}
          
          {detail.status === 'OUT_FOR_DELIVERY' && (
            <span className="chip" style={{ background: '#ff9500', color: 'white', cursor: 'default' }} role="status" aria-label="Package out for delivery">
              🚚 Out for Delivery
            </span>
          )}
          
          {detail.status === 'IN_TRANSIT' && (
            <span className="chip" style={{ background: '#4BA3FF', color: 'white', cursor: 'default' }} role="status" aria-label="Package in transit">
              📦 In Transit
            </span>
          )}
        </div>
      )}

      {/* Package Notes Section */}
      {detail && (
        <div style={{ marginBottom: '1rem' }}>
          <details>
            <summary 
              style={{ cursor: 'pointer', fontWeight: 500 }} 
              aria-label={packageNotes ? 'Toggle package notes (saved)' : 'Toggle package notes'}
            >
              📝 Package Notes {packageNotes && '(saved)'}
            </summary>
            <div style={{ marginTop: '0.5rem' }}>
              <textarea
                value={packageNotes}
                onChange={(e) => saveNotes(e.target.value)}
                placeholder="Add personal notes: What's in this package? Gift for whom? Special instructions?"
                aria-label="Personal package notes"
                style={{ 
                  width: '100%', 
                  minHeight: '80px', 
                  padding: '10px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'inherit',
                  fontFamily: 'inherit',
                  fontSize: '14px'
                }}
              />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                💡 Private notes, saved only on this device
              </p>
            </div>
          </details>
        </div>
      )}

      {loading && <div>Loading…</div>}
      {error && <div className="error" role="alert">{error}</div>}

      <div className="email-row">
        <label>
          <input 
            type="checkbox" 
            checked={emailUpdates} 
            onChange={(e) => setEmailUpdates(e.target.checked)}
            aria-label="Enable email updates for this shipment"
          />
          <span style={{ marginLeft: 6 }}>Email me updates (on-the-way, delivered)</span>
        </label>
      </div>

      <div className="email-row">
        <label>
          <input 
            type="checkbox" 
            checked={animationsEnabled} 
            onChange={(e) => setAnimationsEnabled(e.target.checked)}
            aria-label="Enable delivery animations"
          />
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
                aria-label="Choose animation style for delivery celebration"
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
              <input 
                type="checkbox" 
                checked={soundEnabled} 
                onChange={(e) => setSoundEnabled(e.target.checked)}
                aria-label="Enable sound effects for animations"
              />
              <span style={{ marginLeft: 6 }}>🔊 Play sound effect</span>
            </label>
          </div>

          <div className="email-row" style={{ marginLeft: 24 }}>
            <label>
              <input 
                type="checkbox" 
                checked={respectReducedMotion} 
                onChange={(e) => setRespectReducedMotion(e.target.checked)}
                aria-label="Respect system reduced motion preference"
              />
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
              aria-label="Test the selected animation style"
            >
              🎉 Test Animation
            </button>
          </div>
        </>
      )}
      
      <div className="email-row">
        <label>
          <input 
            type="checkbox" 
            checked={giftSurpriseMode} 
            onChange={(e) => setGiftSurpriseMode(e.target.checked)}
            aria-label="Enable gift surprise mode to hide sender and contents"
          />
          <span style={{ marginLeft: 6 }}>🎁 Gift Surprise Mode (hide sender/contents)</span>
        </label>
      </div>
      
      <div className="email-row">
        <label>
          <input 
            type="checkbox" 
            checked={showWeatherImpact} 
            onChange={(e) => setShowWeatherImpact(e.target.checked)}
            aria-label="Show weather impact on delivery"
          />
          <span style={{ marginLeft: 6 }}>🌤️ Show weather impact on delivery</span>
        </label>
      </div>

      {detail && (
        <>
          {/* Weather Impact Alert */}
          {weatherImpact && weatherImpact.severity !== 'none' && (
            <div 
              role="alert"
              aria-live="polite"
              style={{
                marginTop: '1rem',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: weatherImpact.severity === 'high' ? '#FF4B4B' 
                           : weatherImpact.severity === 'medium' ? '#FFA94B' 
                           : '#4BA3FF',
                background: weatherImpact.severity === 'high' ? 'rgba(255, 75, 75, 0.1)' 
                          : weatherImpact.severity === 'medium' ? 'rgba(255, 169, 75, 0.1)' 
                          : 'rgba(75, 163, 255, 0.1)',
              }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>
                Weather Alert
              </strong>
              <span>{weatherImpact.description}</span>
            </div>
          )}
          
          <section className="eta-panel" aria-label="Package status and estimated arrival">
            <h2>{latestEventEmoji} Package Status</h2>
            
            {detail.eta && timeRemaining && (
              <div style={{ 
                padding: '12px', 
                background: 'var(--primary)', 
                color: 'white', 
                borderRadius: '8px', 
                marginBottom: '1rem',
                fontSize: '18px',
                fontWeight: 500,
                textAlign: 'center'
              }}>
                ⏱️ Arriving in {timeRemaining}
              </div>
            )}
            
            {detail.eta && (
              <p>
                📅 Carrier ETA: {new Date(detail.eta).toLocaleDateString()} ({etaDaysLeft(detail.eta)} day(s) left)
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
                aria-label="Enter expected business days for delivery"
              />
            </label>
            <p className="eta-message">{etaMsg}</p>
            {expectedDays != null && etaMsg.includes('overdue') && (
              <p>
                <a className="chip" href={supportMailto(detail, expectedDays)} target="_blank" rel="noreferrer">📧 Contact support</a>
              </p>
            )}
          </section>

          <div className="detail-grid">
            <div>
              <div><strong>Status:</strong> {detail.status}</div>
              <div><strong>Carrier:</strong> {detail.carrier ?? 'Unknown'}</div>
              <div><strong>Tracking #:</strong> {detail.trackingNumber} <button className="chip" onClick={() => copyTracking(detail.trackingNumber)}>Copy</button></div>
              <div><strong>ETA:</strong> {detail.eta ? new Date(detail.eta).toLocaleString() : '—'}</div>
              <div><strong>Route:</strong> {giftSurpriseMode ? '🎁 Surprise!' : `${detail.origin ?? 'Unknown'} → ${detail.destination ?? 'Unknown'}`}</div>
              <div><strong>Created:</strong> {new Date(detail.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div><strong>Current pos:</strong> {giftSurpriseMode ? '🎁 Hidden' : fmtLatLng(detail.currentLat, detail.currentLng)}</div>
              <div><strong>Origin coords:</strong> {giftSurpriseMode ? '🎁 Hidden' : fmtLatLng(detail.originLat, detail.originLng)}</div>
              <div><strong>Dest coords:</strong> {giftSurpriseMode ? '🎁 Hidden' : fmtLatLng(detail.destinationLat, detail.destinationLng)}</div>
              {!giftSurpriseMode && (
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
              )}
              {giftSurpriseMode && (
                <div style={{ marginTop: 8, padding: '12px', background: 'var(--primary)', color: 'white', borderRadius: '8px', textAlign: 'center' }}>
                  🎁 Map hidden to keep the surprise!
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {detail && (
        <section aria-label="Package journey timeline">
          <h2>📍 Package Journey</h2>
          {detail.events.length > 0 ? (
            <div style={{ position: 'relative', paddingLeft: '30px' }}>
              {detail.events.map((ev, idx) => {
                const isFirst = idx === 0
                const isLast = idx === detail.events.length - 1
                const statusEmoji = 
                  ev.canonicalStatus === 'DELIVERED' ? '✅' :
                  ev.canonicalStatus === 'OUT_FOR_DELIVERY' ? '🚚' :
                  ev.canonicalStatus === 'IN_TRANSIT' ? '📦' :
                  ev.canonicalStatus === 'DELAYED' ? '⏰' :
                  ev.canonicalStatus === 'FAILURE' ? '❌' : '📍'
                
                return (
                  <div key={ev.id} style={{ 
                    position: 'relative', 
                    marginBottom: isLast ? 0 : '24px',
                    paddingBottom: isLast ? 0 : '8px'
                  }}>
                    {/* Timeline dot */}
                    <div style={{
                      position: 'absolute',
                      left: '-30px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: isFirst ? 'var(--primary)' : 'var(--border)',
                      border: '3px solid var(--bg)',
                      boxShadow: isFirst ? '0 0 0 3px var(--primary)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px'
                    }}>
                      {isFirst && '●'}
                    </div>
                    
                    {/* Timeline line */}
                    {!isLast && (
                      <div style={{
                        position: 'absolute',
                        left: '-21px',
                        top: '20px',
                        width: '2px',
                        height: 'calc(100% + 12px)',
                        background: 'var(--border)'
                      }} />
                    )}
                    
                    {/* Event content */}
                    <div style={{ 
                      background: isFirst ? 'var(--card)' : 'transparent',
                      padding: isFirst ? '12px' : '4px 0',
                      borderRadius: '8px',
                      border: isFirst ? '1px solid var(--border)' : 'none'
                    }}>
                      <div style={{ fontWeight: isFirst ? 600 : 500 }}>
                        {statusEmoji} <strong>{ev.canonicalStatus}</strong> 
                        {ev.carrierStatus && ` · ${ev.carrierStatus}`}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        📍 {ev.location ?? 'Location not available'}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        🕐 {new Date(ev.eventTime).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div>No tracking events yet. Check back soon!</div>
          )}
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
