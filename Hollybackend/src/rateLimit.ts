type Bucket = { tokens: number; lastRefill: number }

const buckets = new Map<string, Bucket>()

function nowSec() { return Math.floor(Date.now() / 1000) }

export function allowRequest(key: string, capacity = 60, refillPerSec = 1): boolean {
  const t = nowSec()
  let b = buckets.get(key)
  if (!b) { b = { tokens: capacity, lastRefill: t }; buckets.set(key, b) }
  if (t > b.lastRefill) {
    const delta = t - b.lastRefill
    b.tokens = Math.min(capacity, b.tokens + delta * refillPerSec)
    b.lastRefill = t
  }
  if (b.tokens >= 1) { b.tokens -= 1; return true }
  return false
}

export function keyFromReq(req: { ip?: string; headers?: Record<string, unknown> }, prefix = 'rl'): string {
  const xf = typeof req?.headers?.['x-forwarded-for'] === 'string' ? (req.headers!['x-forwarded-for'] as string) : ''
  const ip = (xf.split(',')[0] || (req.ip || 'unknown')).trim()
  return `${prefix}:${ip}`
}
