import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { CarrierCandidate, ShipmentSummary } from '../api/types'
import { useSessionStore } from '../state/session'
import { useToast } from '../ui/toaster'
import { z } from 'zod'
import { SkeletonCard } from '../ui/Skeleton'

export default function ShipmentsPage() {
  const [items, setItems] = useState<ShipmentSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [limit, setLimit] = useState(20)
  const { userId } = useSessionStore()
  const { show } = useToast()

  const [tn, setTn] = useState('')
  const [label, setLabel] = useState('')
  const [dest, setDest] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [carrierCandidates, setCarrierCandidates] = useState<CarrierCandidate[] | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [selectedCarrier, setSelectedCarrier] = useState<string>('AUTO')
  const [bulkTn, setBulkTn] = useState('')
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  
  function exportCsv() {
    const rows = (items ?? []).map(s => ({
      label: s.label ?? '',
      trackingNumber: s.trackingNumber,
      carrier: s.carrier ?? '',
      status: s.status,
      eta: s.eta ?? '',
      origin: s.origin ?? '',
      destination: s.destination ?? '',
      createdAt: s.createdAt,
    }))
    const header = ['label','trackingNumber','carrier','status','eta','origin','destination','createdAt']
    const csv = [header.join(','), ...rows.map(r => header.map(k => {
      const v = (r as any)[k] ?? ''
      const needsQuote = /[",\n]/.test(String(v))
      const safe = String(v).replace(/"/g, '""')
      return needsQuote ? `"${safe}"` : safe
    }).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shipments-${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true); setError(null)
      try {
        const res = await api.listShipments({ limit, userId: userId ?? undefined })
        if (!cancelled) setItems(res.items)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load shipments')
        show('Failed to load shipments')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [userId, limit])

  const schema = z.object({
    trackingNumber: z.string().min(3, 'Tracking number too short'),
    label: z.string().max(120).optional().or(z.literal('').transform(() => undefined)),
    destination: z.string().max(120).optional().or(z.literal('').transform(() => undefined)),
  })

  useEffect(() => {
    let cancelled = false
    async function run() {
      const tnTrim = tn.trim()
      if (tnTrim.length < 3) { setCarrierCandidates(null); return }
      setDetecting(true)
      try {
        const resp = await api.probeCarrier(tnTrim)
        if (!cancelled) {
          setCarrierCandidates(resp.candidates)
          const top = resp.candidates[0]
          if (top?.validated) setSelectedCarrier(top.name)
          else setSelectedCarrier('AUTO')
        }
      } catch {
        if (!cancelled) setCarrierCandidates(null)
      } finally {
        if (!cancelled) setDetecting(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [tn])

  async function onResolve(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true); setError(null)
    try {
      const parsed = schema.parse({ trackingNumber: tn.trim(), label: label.trim(), destination: dest.trim() })
      await api.resolveShipment({
        trackingNumber: parsed.trackingNumber,
        hintCarrier: selectedCarrier ?? 'AUTO',
        label: parsed.label ?? null,
        destination: parsed.destination ?? null,
        userId: userId ?? null,
      })
      setTn(''); setLabel(''); setDest('')
      show('Shipment added')
      // Refresh list with same limit
      const res = await api.listShipments({ limit, userId: userId ?? undefined })
      setItems(res.items)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to track shipment')
      show('Failed to add shipment')
    } finally {
      setSubmitting(false)
    }
  }

  async function onBulkAdd(e: FormEvent) {
    e.preventDefault()
    const lines = bulkTn.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    if (lines.length === 0) return
    setBulkSubmitting(true)
    let ok = 0, fail = 0
    for (const line of lines) {
      try {
        await api.resolveShipment({ trackingNumber: line, hintCarrier: 'AUTO', userId: userId ?? null })
        ok++
      } catch {
        fail++
      }
    }
    try {
      const res = await api.listShipments({ limit, userId: userId ?? undefined })
      setItems(res.items)
    } catch {}
    setBulkSubmitting(false)
    setBulkTn('')
    show(`Added ${ok} shipments${fail ? `, ${fail} failed` : ''}`)
  }

  return (
    <div>
      <h1>My Shipments</h1>
      <form className="login-form" onSubmit={onResolve} aria-label="Track a package">
        <label>
          Tracking number
          <input value={tn} onChange={(e) => setTn(e.target.value)} placeholder="1Z999..." required />
        </label>
        {carrierCandidates && carrierCandidates.length > 0 && (
          <div className="notice" aria-live="polite">
            Possible carriers:
            <select className="chip" aria-label="Detected carrier" value={selectedCarrier} onChange={(e) => setSelectedCarrier(e.target.value)}>
              <option value="AUTO">AUTO</option>
              {carrierCandidates.slice(0,5).map(c => (
                <option key={c.code} value={c.name}>{c.name} {c.validated ? '✓' : ''} {c.probability ? `(${Math.round(c.probability*100)}%)` : ''}</option>
              ))}
            </select>
          </div>
        )}
        <label>
          Label (optional)
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Work laptop" />
        </label>
        <label>
          Destination (optional)
          <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="San Francisco, CA" />
        </label>
        <button type="submit" disabled={submitting || !tn}>Track</button>
      </form>
      <details style={{ marginTop: 12 }}>
        <summary>Bulk add shipments</summary>
        <form className="login-form" onSubmit={onBulkAdd} aria-label="Bulk add shipments">
          <label>
            Paste tracking numbers (one per line)
            <textarea value={bulkTn} onChange={(e) => setBulkTn(e.target.value)} rows={4} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'inherit' }} />
          </label>
          <button type="submit" disabled={bulkSubmitting || !bulkTn.trim()}>Add</button>
        </form>
      </details>
      {loading && <SkeletonCard />}
      {error && <div className="error" role="alert">{error}</div>}
      <ul className="features">
        {(items ?? []).map(s => (
          <li key={s.id}>
            <div><Link to={`/shipments/${s.id}`}><strong>{s.label ?? s.trackingNumber}</strong></Link></div>
            <div>Status: {s.status} {s.eta ? `· ETA ${new Date(s.eta).toLocaleString()}` : ''}</div>
            <div>{s.origin ?? 'Unknown'} → {s.destination ?? 'Unknown'}</div>
          </li>
        ))}
      </ul>
      {!loading && items?.length === 0 && <div>No shipments yet.</div>}
      {!loading && (items?.length ?? 0) < 100 && (
        <p><button className="chip" onClick={() => setLimit((l) => Math.min(100, l + 20))}>Load more</button></p>
      )}
      <p>
        <button className="chip" onClick={exportCsv} disabled={!items || items.length === 0}>Export CSV</button>
      </p>
    </div>
  )
}
