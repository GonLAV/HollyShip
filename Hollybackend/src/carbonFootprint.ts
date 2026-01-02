/**
 * Carbon Footprint Calculation Module
 * Estimates CO2 emissions for shipments based on carrier, distance, and package weight
 */

// Average CO2 emissions per km per kg for different transport modes (kg CO2)
const EMISSION_FACTORS = {
  air: 0.0005,      // Air freight: 0.5g CO2 per km per kg
  ground: 0.00010,  // Ground transport: 0.1g CO2 per km per kg
  express: 0.0003,  // Express delivery (mixed): 0.3g CO2 per km per kg
  ocean: 0.00001,   // Sea freight: 0.01g CO2 per km per kg
};

// Default package weight if not specified (kg)
const DEFAULT_PACKAGE_WEIGHT = 1.0;

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Get emission factor based on carrier code
 */
function getEmissionFactor(carrierCode?: string): number {
  if (!carrierCode) return EMISSION_FACTORS.ground;

  const code = carrierCode.toLowerCase();
  
  // Air freight carriers
  if (code.includes('fedex') && code.includes('express')) return EMISSION_FACTORS.air;
  if (code.includes('ups') && code.includes('air')) return EMISSION_FACTORS.air;
  if (code.includes('dhl') && code.includes('express')) return EMISSION_FACTORS.express;
  
  // Ground carriers
  if (code.includes('ups')) return EMISSION_FACTORS.ground;
  if (code.includes('fedex')) return EMISSION_FACTORS.ground;
  if (code.includes('usps')) return EMISSION_FACTORS.ground;
  
  // Ocean freight
  if (code.includes('maersk')) return EMISSION_FACTORS.ocean;
  if (code.includes('msc')) return EMISSION_FACTORS.ocean;
  
  // Default to ground transport
  return EMISSION_FACTORS.ground;
}

/**
 * Calculate carbon footprint for a shipment
 * @param originLat Origin latitude
 * @param originLng Origin longitude
 * @param destLat Destination latitude
 * @param destLng Destination longitude
 * @param carrierCode Carrier code (e.g., 'UPS', 'FEDEX')
 * @param weightKg Package weight in kg (optional)
 * @returns Carbon footprint in kg CO2
 */
export function calculateCarbonFootprint(
  originLat?: number | null,
  originLng?: number | null,
  destLat?: number | null,
  destLng?: number | null,
  carrierCode?: string | null,
  weightKg?: number
): number | null {
  // Need both origin and destination to calculate
  if (!originLat || !originLng || !destLat || !destLng) {
    return null;
  }

  const distance = calculateDistance(originLat, originLng, destLat, destLng);
  const weight = weightKg || DEFAULT_PACKAGE_WEIGHT;
  const emissionFactor = getEmissionFactor(carrierCode || undefined);

  // Calculate total emissions: distance (km) × weight (kg) × emission factor (kg CO2 per km per kg)
  const carbonFootprint = distance * weight * emissionFactor;

  // Round to 2 decimal places
  return Math.round(carbonFootprint * 100) / 100;
}

/**
 * Get a human-readable description of the carbon footprint
 */
export function getCarbonFootprintDescription(carbonKg: number): string {
  if (carbonKg < 0.1) {
    return 'Very low carbon footprint';
  } else if (carbonKg < 0.5) {
    return 'Low carbon footprint';
  } else if (carbonKg < 2) {
    return 'Moderate carbon footprint';
  } else if (carbonKg < 5) {
    return 'High carbon footprint';
  } else {
    return 'Very high carbon footprint';
  }
}

/**
 * Calculate carbon offset cost (rough estimate)
 * @param carbonKg Carbon footprint in kg CO2
 * @returns Offset cost in USD (assumes $15 per ton CO2)
 */
export function calculateCarbonOffsetCost(carbonKg: number): number {
  const costPerTon = 15; // USD per ton CO2
  const costPerKg = costPerTon / 1000;
  return Math.round(carbonKg * costPerKg * 100) / 100;
}
