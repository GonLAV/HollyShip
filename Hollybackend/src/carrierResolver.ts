export type CarrierConfidence = 'high' | 'medium' | 'low'

export type CarrierGuess = {
  code: string
  name: string
  confidence: CarrierConfidence
  score: number
  matchedPattern: string
  description?: string
  example?: string
}

export type CarrierProbe = CarrierGuess & {
  validated: boolean
  probability: number
}

type CarrierCatalogEntry = {
  code: string
  name: string
  confidence: CarrierConfidence
  regex?: RegExp
  prefixes?: string[]
  lengths?: number[]
  priority?: number
  pattern?: string
  description?: string
  example?: string
}

const NORMALIZE_TRACKING = /[^A-Z0-9]/gi

const CARRIER_CATALOG: CarrierCatalogEntry[] = [
  {
    code: 'ups',
    name: 'UPS',
    confidence: 'high',
    regex: /^1Z[0-9A-Z]{16}$/i,
    prefixes: ['1Z'],
    lengths: [18],
    priority: 210,
    pattern: '1Z + 16 alphanumeric characters',
    description: 'UPS air and ground shipments',
    example: '1Z999AA10123456784',
  },
  {
    code: 'usps',
    name: 'USPS',
    confidence: 'high',
    regex: /^((94|93|92|95)\d{20}|420\d{27}|[A-Z]{2}\d{9}US)$/i,
    prefixes: ['92', '93', '94', '95', '420'],
    lengths: [13, 22, 26],
    priority: 190,
    pattern: 'US domestic (92/93/94/95 + 20 digits) or 420 + 27 digits or UPU US',
    description: 'USPS priority, ground, and international labels',
    example: '9400111897700000000000',
  },
  {
    code: 'fedex',
    name: 'FedEx',
    confidence: 'medium',
    regex: /^(\d{12}|\d{15}|\d{20})$/,
    prefixes: ['96', '61', '62', '63'],
    lengths: [12, 15, 20],
    priority: 170,
    pattern: '12, 15, or 20 digit numeric string',
    description: 'FedEx Express / Ground tracking numbers',
    example: '123456789012',
  },
  {
    code: 'dhl',
    name: 'DHL Express',
    confidence: 'medium',
    regex: /^(\d{10}|JJD\d{12})$/i,
    prefixes: ['JD', 'JJD'],
    lengths: [10, 13],
    priority: 160,
    pattern: '10 digit number or JJD + 12 digits',
    description: 'DHL Express international shipments',
    example: '1234567890',
  },
  {
    code: 'intl_post',
    name: 'International Post (UPU)',
    confidence: 'medium',
    regex: /^[A-Z]{2}\d{9}[A-Z]{2}$/i,
    lengths: [13],
    priority: 150,
    pattern: 'UPU S10 format (AA123456789BB)',
    description: 'Universal postal union format used by many national carriers',
    example: 'RA123456789CN',
  },
  {
    code: 'cainiao',
    name: 'Cainiao (Alibaba)',
    confidence: 'medium',
    regex: /^LP\d{12,}[A-Z]{0,2}$/i,
    prefixes: ['LP'],
    lengths: [14, 15, 16, 18],
    priority: 140,
    pattern: 'LP + 12+ digits (AliExpress / Cainiao)',
    description: 'Cainiao routing numbers from Alibaba Group',
    example: 'LP004665379CN',
  },
  {
    code: 'yunexpress',
    name: 'YunExpress',
    confidence: 'medium',
    regex: /^YT\d{12,}$/i,
    prefixes: ['YT'],
    lengths: [15, 16, 17],
    priority: 140,
    pattern: 'YT + 12+ digits',
    description: 'YunExpress e-commerce deliveries',
    example: 'YT2210085836454',
  },
  {
    code: '4px',
    name: '4PX',
    confidence: 'medium',
    regex: /^4PX\d{10,}$/i,
    prefixes: ['4PX'],
    lengths: [13, 14, 15],
    priority: 130,
    pattern: '4PX + 10+ digits',
    description: '4PX logistics network used by multiple marketplaces',
    example: '4PX1001023243',
  },
  {
    code: 'sf_express',
    name: 'SF Express',
    confidence: 'medium',
    regex: /^SF\d{10}$/i,
    prefixes: ['SF'],
    lengths: [12],
    priority: 130,
    pattern: 'SF + 10 digits',
    description: 'SF Express domestic and international shipments',
    example: 'SF1234567890',
  },
  {
    code: 'amazon_logistics',
    name: 'Amazon Logistics',
    confidence: 'medium',
    regex: /^TBA\d{12,}$/i,
    prefixes: ['TBA'],
    lengths: [15, 16],
    priority: 130,
    pattern: 'TBA + 12+ digits',
    description: 'Amazon last-mile / virtual carriers',
    example: 'TBA123456789012',
  },
  {
    code: 'canada_post',
    name: 'Canada Post',
    confidence: 'low',
    regex: /^CA\d{12}$/i,
    prefixes: ['CA'],
    lengths: [14],
    priority: 120,
    pattern: 'CA + 12 digits',
    description: 'Canada Post domestic tracking identifiers',
    example: 'CA123456789012',
  },
  {
    code: 'dpd',
    name: 'DPD / Europe parcel',
    confidence: 'low',
    regex: /^\d{14}$/,
    lengths: [14],
    priority: 110,
    pattern: '14 digit numeric code (DPD / DPDgroup)',
    description: 'DPD and DPDgroup affiliates in Europe',
    example: '12345678901234',
  },
  {
    code: 'aramex',
    name: 'Aramex',
    confidence: 'low',
    regex: /^AR\d{7,10}$/i,
    prefixes: ['AR'],
    lengths: [9, 10, 11, 12],
    priority: 100,
    pattern: 'AR + 7-10 digits',
    description: 'Aramex shipments across Middle East / global express',
    example: 'AR123456789',
  },
  {
    code: 'ontrac',
    name: 'OnTrac',
    confidence: 'low',
    regex: /^C\d{10}$/i,
    prefixes: ['C'],
    lengths: [11],
    priority: 100,
    pattern: 'C + 10 digits',
    description: 'OnTrac regional deliveries in North America',
    example: 'C1234567890',
  },
  {
    code: 'royal_mail',
    name: 'Royal Mail / Parcelforce',
    confidence: 'low',
    regex: /^(JJD|JD|RR|LX)\d{12,13}$/i,
    prefixes: ['JJD', 'JD', 'RR', 'LX'],
    lengths: [14, 15, 16],
    priority: 90,
    pattern: 'Royal Mail / Parcelforce identifier',
    description: 'UK postal services and international UK exports',
    example: 'JD0123456789012345',
  },
  // National posts (UPU S10 specific country codes)
  {
    code: 'postnl',
    name: 'PostNL',
    confidence: 'medium',
    regex: /^[A-Z]{2}\d{9}NL$/i,
    lengths: [13],
    priority: 175,
    pattern: 'UPU S10 ending NL',
    description: 'Netherlands national post (international UPU format)',
    example: 'RA123456789NL',
  },
  {
    code: 'laposte',
    name: 'La Poste (Colissimo)',
    confidence: 'medium',
    regex: /^[A-Z]{2}\d{9}FR$/i,
    lengths: [13],
    priority: 175,
    pattern: 'UPU S10 ending FR',
    description: 'France La Poste / Colissimo (UPU international)',
    example: 'LX123456789FR',
  },
  {
    code: 'auspost',
    name: 'Australia Post',
    confidence: 'medium',
    regex: /^[A-Z]{2}\d{9}AU$/i,
    lengths: [13],
    priority: 175,
    pattern: 'UPU S10 ending AU',
    description: 'Australia Post (UPU international)',
    example: 'RR123456789AU',
  },
  {
    code: 'china_post',
    name: 'China Post',
    confidence: 'medium',
    regex: /^[A-Z]{2}\d{9}CN$/i,
    lengths: [13],
    priority: 175,
    pattern: 'UPU S10 ending CN',
    description: 'China Post (UPU international)',
    example: 'RA123456789CN',
  },
  {
    code: 'canada_post_upu',
    name: 'Canada Post (UPU)',
    confidence: 'medium',
    regex: /^[A-Z]{2}\d{9}CA$/i,
    lengths: [13],
    priority: 175,
    pattern: 'UPU S10 ending CA',
    description: 'Canada Post international UPU format',
    example: 'LX123456789CA',
  },
  {
    code: 'usps_upu',
    name: 'USPS (UPU international)',
    confidence: 'medium',
    regex: /^[A-Z]{2}\d{9}US$/i,
    lengths: [13],
    priority: 180,
    pattern: 'UPU S10 ending US',
    description: 'USPS international shipments (UPU format)',
    example: 'CP123456789US',
  },
  {
    code: 'royal_mail_upu',
    name: 'Royal Mail (UPU)',
    confidence: 'medium',
    regex: /^[A-Z]{2}\d{9}GB$/i,
    lengths: [13],
    priority: 175,
    pattern: 'UPU S10 ending GB',
    description: 'Royal Mail international (UPU format)',
    example: 'RR123456789GB',
  },
  {
    code: 'postnord',
    name: 'PostNord',
    confidence: 'medium',
    regex: /^[A-Z]{2}\d{9}(SE|DK)$/i,
    lengths: [13],
    priority: 165,
    pattern: 'UPU S10 ending SE or DK',
    description: 'Nordic postal network (Sweden/Denmark)',
    example: 'LX123456789SE',
  },
  {
    code: 'postnl_parcel',
    name: 'PostNL Parcel (numeric)',
    confidence: 'low',
    regex: /^\d{9,12}$/,
    lengths: [9, 10, 12],
    priority: 120,
    pattern: '9-12 digit numeric (PostNL parcel heuristic)',
    description: 'Heuristic for domestic PostNL numeric codes',
    example: '1234567890',
  },
  // Parcel networks
  {
    code: 'gls',
    name: 'GLS',
    confidence: 'low',
    regex: /^\d{11}$/,
    lengths: [11],
    priority: 115,
    pattern: '11 digit numeric (GLS)',
    description: 'GLS Europe parcel network (heuristic)',
    example: '12345678901',
  },
  {
    code: 'evri',
    name: 'Evri (Hermes UK)',
    confidence: 'low',
    regex: /^\d{16}$/,
    lengths: [16],
    priority: 110,
    pattern: '16 digit numeric (Evri/Hermes)',
    description: 'Evri/Hermes UK domestic tracking numbers',
    example: '1234567890123456',
  },
  {
    code: 'dhl_ecommerce',
    name: 'DHL eCommerce',
    confidence: 'low',
    regex: /^(JVGL\d{9,}|GM\d{8,}|LX\d{8,})$/i,
    prefixes: ['JVGL', 'GM', 'LX'],
    lengths: [10, 12, 13, 14, 15],
    priority: 120,
    pattern: 'JVGL/GM/LX + digits (DHL eCommerce heuristic)',
    description: 'DHL eCommerce / Packet Plus routing numbers',
    example: 'JVGL123456789',
  },
]

function normalizeTrackingNumber(input: string) {
  return String(input ?? '').toUpperCase().replace(NORMALIZE_TRACKING, '')
}

type MatchResult = { score: number; matchedPattern: string }

function evaluateEntry(entry: CarrierCatalogEntry, normalized: string): MatchResult | null {
  let score = entry.priority ?? 10
  let matchedPattern: string | null = null

  if (entry.regex?.test(normalized)) {
    score += 360
    matchedPattern = entry.pattern ?? entry.regex.source
  }

  const prefix = entry.prefixes?.find((p) => normalized.startsWith(p))
  if (prefix) {
    score += 180
    if (!matchedPattern) matchedPattern = `prefix ${prefix}`
  }

  if (entry.lengths?.includes(normalized.length)) {
    score += 120
    if (!matchedPattern) matchedPattern = `length ${normalized.length}`
  }

  if (!matchedPattern) {
    return null
  }

  return { score, matchedPattern }
}

export function detectCarriers(trackingNumberRaw: string, limit = 5): CarrierGuess[] {
  const normalized = normalizeTrackingNumber(trackingNumberRaw)
  if (!normalized) return []

  const matches: CarrierGuess[] = []
  for (const entry of CARRIER_CATALOG) {
    const match = evaluateEntry(entry, normalized)
    if (match) {
      matches.push({
        code: entry.code,
        name: entry.name,
        confidence: entry.confidence,
        score: match.score,
        matchedPattern: match.matchedPattern,
        description: entry.description,
        example: entry.example,
      })
    }
  }

  matches.sort((a, b) => b.score - a.score)
  if (limit <= 0) return matches
  return matches.slice(0, limit)
}

export function guessCarrierFromTrackingNumber(trackingNumberRaw: string): CarrierGuess | null {
  return detectCarriers(trackingNumberRaw, 1)[0] ?? null
}

export function probeCarriers(trackingNumberRaw: string, limit = 5): CarrierProbe[] {
  const normalized = normalizeTrackingNumber(trackingNumberRaw)
  const candidates = detectCarriers(trackingNumberRaw, limit)
  if (!candidates.length) return []
  const maxScore = candidates[0].score
  return candidates.map(c => {
    let validated = /\b(?:^1Z|^LP|^YT|^SF|^TBA|^[A-Z]{2}\d{9}[A-Z]{2}|^4PX)\b/.test(c.matchedPattern) || /\d{10,}/.test(c.matchedPattern)

    // Apply check-digit validations for numeric formats when known
    const isNumeric = /^\d+$/.test(normalized)
    if (isNumeric) {
      if (c.code === 'dpd' && normalized.length === 14) {
        validated = validated || mod10_3_1Valid(normalized)
      } else if (c.code === 'evri' && normalized.length === 16) {
        validated = validated || luhnValid(normalized)
      } else if (c.code === 'gls' && normalized.length === 11) {
        validated = validated || mod10_3_1Valid(normalized)
      } else if (c.code === 'fedex' && (normalized.length === 12 || normalized.length === 15 || normalized.length === 20)) {
        // Heuristic: some FedEx numeric formats pass Luhn; not authoritative
        validated = validated || luhnValid(normalized)
      }
    }

    const probabilityBase = c.score / (maxScore + 200)
    const probability = Math.max(validated ? 0.8 : 0.5, Math.min(0.99, probabilityBase))
    return { ...c, validated, probability }
  })
}

// Check-digit helpers
function luhnValid(num: string): boolean {
  let sum = 0
  let dbl = false
  for (let i = num.length - 1; i >= 0; i--) {
    const d = num.charCodeAt(i) - 48
    if (d < 0 || d > 9) return false
    let add = d
    if (dbl) {
      add = d * 2
      if (add > 9) add -= 9
    }
    sum += add
    dbl = !dbl
  }
  return sum % 10 === 0
}

// Mod10 with alternating weights 3 and 1 across digits, last digit is check
function mod10_3_1Valid(num: string): boolean {
  if (!/^\d+$/.test(num) || num.length < 2) return false
  const digits = num.split('').map(d => d.charCodeAt(0) - 48)
  const check = digits[digits.length - 1]
  let sum = 0
  let weightThree = true
  for (let i = digits.length - 2; i >= 0; i--) {
    const w = weightThree ? 3 : 1
    sum += digits[i] * w
    weightThree = !weightThree
  }
  const calc = (10 - (sum % 10)) % 10
  return calc === check
}
