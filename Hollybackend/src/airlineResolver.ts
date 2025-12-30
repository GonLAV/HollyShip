export type AirlineConfidence = 'high' | 'medium' | 'low'

export type AirlineGuess = {
  iata: string
  icao?: string
  name: string
  confidence: AirlineConfidence
  matchedPattern: string
  score: number
  example?: string
}

export type FlightProbe = AirlineGuess & {
  probability: number
  flightNumber?: number
}

export type AirlineCatalogEntry = {
  iata: string
  icao?: string
  name: string
  confidence: AirlineConfidence
  example?: string
}

// Compact catalog for common global airlines; easily extensible.
export const AIRLINE_CATALOG: AirlineCatalogEntry[] = [
  { iata: 'AA', icao: 'AAL', name: 'American Airlines', confidence: 'high', example: 'AA1234' },
  { iata: 'DL', icao: 'DAL', name: 'Delta Air Lines', confidence: 'high', example: 'DL456' },
  { iata: 'UA', icao: 'UAL', name: 'United Airlines', confidence: 'high', example: 'UA789' },
  { iata: 'WN', icao: 'SWA', name: 'Southwest Airlines', confidence: 'high', example: 'WN123' },
  { iata: 'B6', icao: 'JBU', name: 'JetBlue', confidence: 'high', example: 'B6 234' },
  { iata: 'AS', icao: 'ASA', name: 'Alaska Airlines', confidence: 'high', example: 'AS 345' },
  { iata: 'BA', icao: 'BAW', name: 'British Airways', confidence: 'high', example: 'BA217' },
  { iata: 'AF', icao: 'AFR', name: 'Air France', confidence: 'high', example: 'AF008' },
  { iata: 'KL', icao: 'KLM', name: 'KLM', confidence: 'high', example: 'KL602' },
  { iata: 'LH', icao: 'DLH', name: 'Lufthansa', confidence: 'high', example: 'LH 401' },
  { iata: 'LX', icao: 'SWR', name: 'SWISS', confidence: 'medium', example: 'LX 19' },
  { iata: 'IB', icao: 'IBE', name: 'Iberia', confidence: 'medium', example: 'IB 6251' },
  { iata: 'AZ', icao: 'ITY', name: 'ITA Airways', confidence: 'medium', example: 'AZ 610' },
  { iata: 'TK', icao: 'THY', name: 'Turkish Airlines', confidence: 'high', example: 'TK12' },
  { iata: 'QR', icao: 'QTR', name: 'Qatar Airways', confidence: 'high', example: 'QR 701' },
  { iata: 'EK', icao: 'UAE', name: 'Emirates', confidence: 'high', example: 'EK 205' },
  { iata: 'SQ', icao: 'SIA', name: 'Singapore Airlines', confidence: 'high', example: 'SQ 26' },
  { iata: 'NH', icao: 'ANA', name: 'All Nippon Airways', confidence: 'high', example: 'NH10' },
  { iata: 'JL', icao: 'JAL', name: 'Japan Airlines', confidence: 'high', example: 'JL 6' },
  { iata: 'QF', icao: 'QFA', name: 'Qantas', confidence: 'high', example: 'QF 11' },
  { iata: 'AC', icao: 'ACA', name: 'Air Canada', confidence: 'high', example: 'AC 33' },
  { iata: 'FR', icao: 'RYR', name: 'Ryanair', confidence: 'medium', example: 'FR 1234' },
  { iata: 'U2', icao: 'EZY', name: 'easyJet', confidence: 'medium', example: 'U2 1234' },
]

const IATA_INDEX = new Map(AIRLINE_CATALOG.map((a) => [a.iata, a]))

const FLIGHT_PATTERN = /^(?<code>[A-Z0-9]{2})(?:\s|-)?(?<num>\d{1,4})$/i

export function detectAirlines(flight: string, limit = 5): AirlineGuess[] {
  const s = String(flight || '').trim().toUpperCase()
  const m = s.match(FLIGHT_PATTERN)
  if (!m || !m.groups) return []
  const code = m.groups['code']
  const entry = IATA_INDEX.get(code)
  if (!entry) return []
  const guess: AirlineGuess = {
    iata: entry.iata,
    icao: entry.icao,
    name: entry.name,
    confidence: entry.confidence,
    matchedPattern: 'IATA + 1-4 digit flight number',
    score: entry.confidence === 'high' ? 500 : entry.confidence === 'medium' ? 380 : 250,
    example: entry.example,
  }
  return [guess].slice(0, limit)
}

export function probeFlight(flight: string, limit = 5): FlightProbe[] {
  const s = String(flight || '').trim().toUpperCase()
  const m = s.match(FLIGHT_PATTERN)
  if (!m || !m.groups) return []
  const code = m.groups['code']
  const num = Number(m.groups['num'])
  const base = detectAirlines(s, limit)
  if (!base.length) return []
  const maxScore = base[0].score + 100
  return base.map((b) => ({
    ...b,
    probability: Math.min(0.99, b.score / maxScore),
    flightNumber: Number.isFinite(num) ? num : undefined,
  }))
}

export function listAirlines(): Array<Pick<AirlineCatalogEntry, 'iata' | 'icao' | 'name' | 'confidence' | 'example'>> {
  return AIRLINE_CATALOG.map(({ iata, icao, name, confidence, example }) => ({ iata, icao, name, confidence, example }))
}
