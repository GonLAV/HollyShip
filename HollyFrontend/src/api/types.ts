export type UUID = string

export type CanonicalStatus =
  | 'CREATED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELAYED'
  | 'ACTION_REQUIRED'
  | 'FAILURE'

export type CarrierConfidence = 'high' | 'medium' | 'low'

export interface CarrierCandidate {
  code: string
  name: string
  confidence: CarrierConfidence
  score: number
  matchedPattern: string
  description?: string
  example?: string
  validated?: boolean
  probability?: number
}

export interface CarrierDetectionResponse {
  trackingNumber: string
  candidates: CarrierCandidate[]
}

export interface ShipmentEvent {
  id: string
  canonicalStatus: CanonicalStatus
  carrierStatus: string | null
  location: string | null
  eventTime: string // ISO string
}

export interface ShipmentSummary {
  id: UUID
  label: string | null
  trackingNumber: string
  carrier: string | null
  status: CanonicalStatus
  userId: UUID | null
  eta: string | null
  origin: string | null
  originLat: number | null
  originLng: number | null
  destination: string | null
  destinationLat: number | null
  destinationLng: number | null
  currentLat: number | null
  currentLng: number | null
  lastEventAt: string | null
  createdAt: string
  events?: ShipmentEvent[]
}

export interface ShipmentDetail extends ShipmentSummary {
  events: ShipmentEvent[]
}

export interface ShipmentChainItem {
  id: string
  carrier: string | null
  trackingNumber: string
  handoffIndex: number
  isCurrent: boolean
  createdAt: string
}

export interface ShipmentsListResponse {
  items: ShipmentSummary[]
}

export interface ChainResponse {
  ok: boolean
  shipmentId: UUID
  items: ShipmentChainItem[]
}

export interface HealthResponse {
  ok: boolean
  service: string
  time: string
}

export interface EmailStartResponse {
  ok: boolean
  code: string
  expiresAt: string
}

export interface EmailVerifyResponse {
  ok: boolean
  userId: UUID
  email: string
  token: string
  expiresAt: string
}

export interface OAuthVerifyResponse {
  ok: boolean
  userId: UUID
  email: string | null
  provider: 'google' | 'apple'
  token: string
  expiresAt: string
}

export interface LoyaltyResponse {
  userId: UUID
  points: number
  tier: string
}
