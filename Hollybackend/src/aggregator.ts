import { probeCarriers } from './carrierResolver.js'
import type { CarrierProbe } from './carrierResolver.js'

type AggregatorCandidate = {
  code?: string
  name?: string
  probability?: number
  validated?: boolean
  score?: number
  matchedPattern?: string
}

type AggregatorResponse = {
  ok?: boolean
  candidates?: AggregatorCandidate[]
}

export async function aggregateCarriers(trackingNumber: string, limit = 5, carrierCode?: string): Promise<{ ok: boolean; source: 'aggregator' | 'local'; candidates: CarrierProbe[] }> {
  const base = process.env.HOLLY_AGGREGATOR_BASE_URL
  const apiKey = process.env.HOLLY_AGGREGATOR_API_KEY

  if (!base || !apiKey) {
    const candidates = probeCarriers(trackingNumber, limit)
    return { ok: true, source: 'local', candidates }
  }

  try {
    const url = new URL(base)
    // Try a generic path; integrators can adapt env to point directly to a compatible endpoint
    // Example expected: GET /v1/carriers/probe?trackingNumber=...
    if (!url.pathname || url.pathname === '/') {
      url.pathname = '/v1/carriers/probe'
    }
    url.searchParams.set('trackingNumber', trackingNumber)
    url.searchParams.set('limit', String(limit))
    if (carrierCode) {
      // Not all aggregators support this; harmless if ignored
      url.searchParams.set('carrier', carrierCode)
    }

    const res = await fetch(url, { headers: { 'authorization': `Bearer ${apiKey}` } })
    const json = (await res.json()) as AggregatorResponse
    const raw = Array.isArray(json.candidates) ? json.candidates : []

    // Normalize into CarrierProbe shape; when fields are missing, fill conservative defaults
    const candidates: CarrierProbe[] = raw.map((r) => ({
      code: r.code ?? 'unknown',
      name: r.name ?? (r.code ?? 'Unknown Carrier'),
      confidence: 'medium',
      score: typeof r.score === 'number' ? r.score : Math.round((r.probability ?? 0.6) * 1000),
      matchedPattern: r.matchedPattern ?? 'aggregator',
      validated: !!r.validated,
      probability: typeof r.probability === 'number' ? r.probability : 0.6,
    }))

    return { ok: true, source: 'aggregator', candidates }
  } catch {
    // Fallback to local when aggregator unreachable/misconfigured
    const candidates = probeCarriers(trackingNumber, limit)
    return { ok: true, source: 'local', candidates }
  }
}
