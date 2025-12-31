export type LatLng = { lat: number; lng: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hash32(input: string) {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function unitFromHash(seed: string, salt: string) {
  const h = hash32(`${salt}:${seed}`);
  return (h % 1_000_000) / 1_000_000;
}

const ORIGIN_COORDS: Record<string, LatLng> = {
  'Memphis, TN Hub': { lat: 35.1495, lng: -90.049 },
  'Los Angeles, CA': { lat: 34.0522, lng: -118.2437 },
  'Chicago, IL': { lat: 41.8781, lng: -87.6298 },
  'Dallas, TX': { lat: 32.7767, lng: -96.797 },
  'Atlanta, GA': { lat: 33.749, lng: -84.388 },
};

export function coordsForOrigin(origin: string | null | undefined): LatLng {
  if (origin && ORIGIN_COORDS[origin]) return ORIGIN_COORDS[origin];
  // default: Memphis
  return ORIGIN_COORDS['Memphis, TN Hub']!;
}

export function coordsForDestination(destination: string | null | undefined, trackingNumber: string): LatLng {
  const seed = (destination && destination.trim()) ? destination.trim() : trackingNumber;

  // Keep within reasonable bounds so marker doesn't sit on poles.
  const lat = -60 + unitFromHash(seed, 'lat') * 140; // [-60, 80]
  const lng = -170 + unitFromHash(seed, 'lng') * 340; // [-170, 170]

  return { lat: clamp(lat, -60, 80), lng: clamp(lng, -170, 170) };
}

export function progressForStatus(status: string): number {
  switch (status) {
    case 'CREATED':
      return 0.1;
    case 'IN_TRANSIT':
      return 0.5;
    case 'OUT_FOR_DELIVERY':
      return 0.85;
    case 'DELIVERED':
      return 1;
    default:
      return 0.1;
  }
}

export function interpolateLatLng(a: LatLng, b: LatLng, tRaw: number): LatLng {
  const t = clamp(tRaw, 0, 1);
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

export function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start);
  let remaining = Math.max(0, Math.floor(days));
  if (remaining === 0) return d;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return d;
}

export function predictTransitBusinessDays(distanceKm: number, carrierName?: string | null): number {
  // Buckets by distance (rough heuristics)
  // <500km: 1-3 days; <1500: 2-5; <5000: 5-10; >=5000: 7-14
  let min = 1, max = 3;
  if (distanceKm < 500) { min = 1; max = 3; }
  else if (distanceKm < 1500) { min = 2; max = 5; }
  else if (distanceKm < 5000) { min = 5; max = 10; }
  else { min = 7; max = 14; }

  const carrier = (carrierName || '').toLowerCase();
  // Express carriers bias faster
  if (/(dhl|fedex|ups|express)/.test(carrier)) {
    max = Math.max(min, max - 2);
  }
  // Economy networks may be slower
  if (/(ecommerce|packet|economy|post)/.test(carrier)) {
    max += 2;
  }

  const avg = (min + max) / 2;
  return Math.round(avg);
}

export function predictEtaDate(origin: LatLng, destination: LatLng, carrierName?: string | null, seed?: string): Date {
  const distance = haversineKm(origin, destination);
  let days = predictTransitBusinessDays(distance, carrierName);
  // Deterministic jitter +/-20% to simulate historical variance
  const jitterUnit = unitFromHash(seed ?? `${origin.lat},${origin.lng}->${destination.lat},${destination.lng}`, 'eta');
  const jitter = (jitterUnit - 0.5) * 0.4; // -0.2 .. +0.2
  days = Math.max(1, Math.round(days * (1 + jitter)));
  return addBusinessDays(new Date(), days);
}

/**
 * Simulates traffic impact based on distance and time.
 * Returns a multiplier (0.9 - 1.2) representing traffic conditions.
 */
function getTrafficMultiplier(distanceKm: number, seed: string): number {
  const trafficUnit = unitFromHash(seed, 'traffic');
  
  // Urban areas (<200km) have more traffic variability
  if (distanceKm < 200) {
    return 0.95 + trafficUnit * 0.25; // 0.95 - 1.20
  }
  // Medium distances have moderate variability
  if (distanceKm < 1000) {
    return 0.97 + trafficUnit * 0.15; // 0.97 - 1.12
  }
  // Long distances have minimal traffic impact
  return 0.98 + trafficUnit * 0.08; // 0.98 - 1.06
}

/**
 * Simulates weather impact based on geographic location.
 * Returns a multiplier (0.95 - 1.15) representing weather conditions.
 */
function getWeatherMultiplier(origin: LatLng, destination: LatLng, seed: string): number {
  const weatherUnit = unitFromHash(seed, 'weather');
  
  // Calculate average latitude to determine climate zone
  const avgLat = Math.abs((origin.lat + destination.lat) / 2);
  
  // Higher latitudes (closer to poles) have more weather variability
  if (avgLat > 50) {
    return 0.95 + weatherUnit * 0.20; // 0.95 - 1.15 (winter storms, etc.)
  }
  if (avgLat > 30) {
    return 0.97 + weatherUnit * 0.12; // 0.97 - 1.09 (moderate weather)
  }
  // Tropical/equatorial regions have less weather impact
  return 0.98 + weatherUnit * 0.08; // 0.98 - 1.06
}

/**
 * Calculates ETA confidence score based on multiple factors.
 * Returns a confidence percentage (0-100).
 */
export function calculateEtaConfidence(
  origin: LatLng,
  destination: LatLng,
  carrierName: string | null | undefined,
  status: string,
  distanceKm?: number
): number {
  const distance = distanceKm ?? haversineKm(origin, destination);
  
  // Base confidence starts at 70%
  let confidence = 70;
  
  // Status-based confidence
  switch (status) {
    case 'DELIVERED':
      return 100; // Already delivered, 100% certain
    case 'OUT_FOR_DELIVERY':
      confidence += 20; // Very high confidence when out for delivery
      break;
    case 'IN_TRANSIT':
      confidence += 10; // Good confidence with tracking updates
      break;
    case 'CREATED':
      confidence -= 10; // Lower confidence at start
      break;
    default:
      confidence -= 5;
  }
  
  // Carrier reliability (based on carrier type)
  const carrier = (carrierName || '').toLowerCase();
  if (/(fedex|ups|dhl|express)/.test(carrier)) {
    confidence += 10; // Premium carriers are more reliable
  } else if (/(usps|post)/.test(carrier)) {
    confidence += 5; // Standard carriers
  } else {
    confidence -= 5; // Unknown carriers have lower confidence
  }
  
  // Distance-based confidence
  if (distance < 500) {
    confidence += 5; // Short distances are more predictable
  } else if (distance > 5000) {
    confidence -= 10; // Long distances have more variables
  }
  
  // Clamp confidence to 0-100 range
  return clamp(Math.round(confidence), 0, 100);
}

/**
 * Predicts ETA with confidence score and factors (traffic, weather).
 */
export function predictEtaWithConfidence(
  origin: LatLng,
  destination: LatLng,
  carrierName?: string | null,
  status?: string,
  seed?: string
): {
  eta: Date;
  confidence: number;
  factors: {
    traffic: number;
    weather: number;
    baselineDays: number;
    adjustedDays: number;
  };
} {
  const distance = haversineKm(origin, destination);
  const effectiveSeed = seed ?? `${origin.lat},${origin.lng}->${destination.lat},${destination.lng}`;
  const effectiveStatus = status ?? 'CREATED';
  
  // Calculate baseline days
  const baselineDays = predictTransitBusinessDays(distance, carrierName);
  
  // Apply traffic and weather multipliers
  const trafficMult = getTrafficMultiplier(distance, effectiveSeed);
  const weatherMult = getWeatherMultiplier(origin, destination, effectiveSeed);
  
  // Combined multiplier with jitter
  const jitterUnit = unitFromHash(effectiveSeed, 'eta');
  const jitter = (jitterUnit - 0.5) * 0.4; // -0.2 .. +0.2
  const totalMult = trafficMult * weatherMult * (1 + jitter);
  
  const adjustedDays = Math.max(1, Math.round(baselineDays * totalMult));
  const eta = addBusinessDays(new Date(), adjustedDays);
  
  // Calculate confidence
  const confidence = calculateEtaConfidence(origin, destination, carrierName, effectiveStatus, distance);
  
  return {
    eta,
    confidence,
    factors: {
      traffic: Math.round(trafficMult * 100) / 100,
      weather: Math.round(weatherMult * 100) / 100,
      baselineDays,
      adjustedDays,
    },
  };
}
