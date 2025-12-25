type LatLng = { lat: number; lng: number };

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
