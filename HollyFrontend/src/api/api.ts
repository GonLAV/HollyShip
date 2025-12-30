import { API_BASE_URL } from '../config'
import type {
  CarrierDetectionResponse,
  ChainResponse,
  EmailStartResponse,
  EmailVerifyResponse,
  HealthResponse,
  LoyaltyResponse,
  OAuthVerifyResponse,
  ShipmentDetail,
  ShipmentSummary,
  ShipmentsListResponse,
} from './types'

export class APIError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.body = body
  }
}

export type TokenProvider = () => string | null | undefined

export class APIClient {
  private base: string
  private getToken?: TokenProvider
  private defaultRetries: number

  constructor(base = API_BASE_URL, getToken?: TokenProvider, defaultRetries = 0) {
    this.base = base.replace(/\/$/, '')
    this.getToken = getToken
    this.defaultRetries = defaultRetries
  }

  private headers(extra?: HeadersInit): HeadersInit {
    const h: Record<string, string> = { 'content-type': 'application/json' }
    const token = this.getToken?.()
    if (token) h['authorization'] = `Bearer ${token}`
    return { ...h, ...(extra || {}) }
  }

  private async request<T>(path: string, init?: RequestInit, retries = this.defaultRetries): Promise<T> {
    const url = `${this.base}${path}`
    try {
      const res = await fetch(url, { ...init, headers: this.headers(init?.headers as HeadersInit) })
      const ct = res.headers.get('content-type') || ''
      const isJson = ct.includes('application/json') || ct.includes('json')
      const body = isJson ? await res.json().catch(() => null) : await res.text()
      if (!res.ok) {
        // Retry on 5xx
        if (retries > 0 && res.status >= 500) {
          await new Promise(r => setTimeout(r, 200 * (this.defaultRetries - retries + 1)))
          return this.request<T>(path, init, retries - 1)
        }
        throw new APIError(`Request failed: ${res.status}`, res.status, body)
      }
      return body as T
    } catch (err: any) {
      // Retry network errors
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 200 * (this.defaultRetries - retries + 1)))
        return this.request<T>(path, init, retries - 1)
      }
      throw err
    }
  }

  // Health
  health(): Promise<HealthResponse> {
    return this.request('/health')
  }

  // Auth (email)
  startEmailAuth(email: string): Promise<EmailStartResponse> {
    return this.request('/v1/auth/email/start', { method: 'POST', body: JSON.stringify({ email }) })
  }
  verifyEmailAuth(email: string, code: string): Promise<EmailVerifyResponse> {
    return this.request('/v1/auth/email/verify', { method: 'POST', body: JSON.stringify({ email, code }) })
  }

  // Auth (oauth)
  verifyOAuth(provider: 'google' | 'apple', providerId: string, email?: string): Promise<OAuthVerifyResponse> {
    return this.request('/v1/auth/oauth', { method: 'POST', body: JSON.stringify({ provider, providerId, email }) })
  }

  // Shipments
  listShipments(params?: { limit?: number; userId?: string | null }): Promise<ShipmentsListResponse> {
    const q = new URLSearchParams()
    if (params?.limit) q.set('limit', String(params.limit))
    if (params?.userId) q.set('userId', params.userId)
    const qs = q.toString()
    return this.request(`/v1/shipments${qs ? `?${qs}` : ''}`)
  }

  getShipment(id: string): Promise<ShipmentDetail> {
    return this.request(`/v1/shipments/${encodeURIComponent(id)}`)
  }

  getShipmentChain(id: string): Promise<ChainResponse> {
    return this.request(`/v1/shipments/${encodeURIComponent(id)}/chain`)
  }

  deleteShipment(id: string): Promise<{ deleted: boolean }> {
    return this.request(`/v1/shipments/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  refreshShipment(id: string): Promise<{ accepted: boolean }> {
    return this.request(`/v1/shipments/${encodeURIComponent(id)}/refresh`, { method: 'POST' })
  }

  resolveShipment(input: {
    trackingNumber: string
    hintCarrier?: string | null
    label?: string | null
    destination?: string | null
    userId?: string | null
    orderNumber?: string | null
  }): Promise<ShipmentSummary> {
    return this.request('/v1/shipments/resolve', { method: 'POST', body: JSON.stringify(input) })
  }

  detectCarrier(trackingNumber: string): Promise<CarrierDetectionResponse> {
    const qs = new URLSearchParams({ trackingNumber }).toString()
    return this.request(`/v1/carriers/detect?${qs}`)
  }

  probeCarrier(trackingNumber: string): Promise<CarrierDetectionResponse> {
    const qs = new URLSearchParams({ trackingNumber }).toString()
    return this.request(`/v1/carriers/probe?${qs}`)
  }

  // Loyalty
  getUserLoyalty(userId: string): Promise<LoyaltyResponse> {
    return this.request(`/v1/users/${encodeURIComponent(userId)}/loyalty`)
  }

  // SSE stats stream helper
  openStatsStream(onMessage: (data: unknown) => void): EventSource {
    const url = `${this.base}/v1/stats/stream`
    const es = new EventSource(url)
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        onMessage(data)
      } catch {
        onMessage(ev.data)
      }
    }
    return es
  }
}

export const api = new APIClient()
export const apiRetry = new APIClient(API_BASE_URL, undefined, 2)
