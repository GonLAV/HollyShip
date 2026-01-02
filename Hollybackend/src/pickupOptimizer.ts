import { haversineKm, predictEtaWithConfidence, type LatLng } from './geo.js';

export interface CarrierOption {
  carrier: string;
  estimatedCost: number;
  estimatedDays: number;
  eta: Date;
  confidence: number;
  score: number;
  pickupTimes: string[];
  availability: 'high' | 'medium' | 'low';
}

export interface PickupOptimizationResult {
  recommended: CarrierOption;
  alternatives: CarrierOption[];
  optimizationFactors: {
    costWeight: number;
    speedWeight: number;
    reliabilityWeight: number;
  };
}

/**
 * Estimates shipping cost based on distance, carrier, and service level.
 */
function estimateShippingCost(distanceKm: number, carrier: string): number {
  const baseCostPerKm = 0.15; // Base cost in USD
  let multiplier = 1.0;
  
  const carrierLower = carrier.toLowerCase();
  
  // Carrier-specific cost multipliers
  if (/(fedex|dhl|express)/.test(carrierLower)) {
    multiplier = 1.5; // Premium carriers cost more
  } else if (/(ups)/.test(carrierLower)) {
    multiplier = 1.3;
  } else if (/(usps|post)/.test(carrierLower)) {
    multiplier = 0.9; // Postal services are cheaper
  } else if (/(amazon)/.test(carrierLower)) {
    multiplier = 1.0;
  } else {
    multiplier = 1.2; // Unknown carriers
  }
  
  // Distance-based cost calculation with economies of scale
  let cost = distanceKm * baseCostPerKm * multiplier;
  
  // Add base handling fee
  cost += 5.0;
  
  // Long distances get better per-km rates
  if (distanceKm > 1000) {
    cost *= 0.9;
  }
  
  return Math.round(cost * 100) / 100;
}

/**
 * Determines carrier availability based on various factors.
 */
function getCarrierAvailability(carrier: string, distanceKm: number): 'high' | 'medium' | 'low' {
  const carrierLower = carrier.toLowerCase();
  
  // Premium carriers have high availability
  if (/(fedex|ups|dhl)/.test(carrierLower)) {
    return 'high';
  }
  
  // USPS has medium availability for long distances
  if (/(usps|post)/.test(carrierLower)) {
    return distanceKm > 2000 ? 'medium' : 'high';
  }
  
  // Amazon has high availability for short distances
  if (/(amazon)/.test(carrierLower)) {
    return distanceKm < 500 ? 'high' : 'medium';
  }
  
  // Unknown carriers default to medium
  return 'medium';
}

/**
 * Generates pickup time windows for a carrier.
 */
function generatePickupTimes(carrier: string): string[] {
  const carrierLower = carrier.toLowerCase();
  
  // Premium carriers offer more flexible pickup times
  if (/(fedex|dhl|ups|express)/.test(carrierLower)) {
    return [
      '8:00 AM - 10:00 AM',
      '10:00 AM - 12:00 PM',
      '1:00 PM - 3:00 PM',
      '3:00 PM - 5:00 PM',
      '5:00 PM - 7:00 PM',
    ];
  }
  
  // Standard carriers have fewer pickup windows
  if (/(usps|post)/.test(carrierLower)) {
    return [
      '9:00 AM - 12:00 PM',
      '2:00 PM - 5:00 PM',
    ];
  }
  
  // Amazon and others have standard windows
  return [
    '9:00 AM - 11:00 AM',
    '12:00 PM - 3:00 PM',
    '4:00 PM - 7:00 PM',
  ];
}

/**
 * Calculates a composite score for carrier option based on optimization preferences.
 */
function calculateCarrierScore(
  option: Omit<CarrierOption, 'score'>,
  preferences: {
    costWeight: number;
    speedWeight: number;
    reliabilityWeight: number;
  }
): number {
  // Normalize cost (lower is better, scale to 0-100)
  const maxCost = 100; // Assume $100 is max reasonable cost
  const costScore = Math.max(0, 100 - (option.estimatedCost / maxCost) * 100);
  
  // Normalize speed (lower days is better, scale to 0-100)
  const maxDays = 14; // Assume 14 days is max reasonable delivery
  const speedScore = Math.max(0, 100 - (option.estimatedDays / maxDays) * 100);
  
  // Confidence is already 0-100
  const reliabilityScore = option.confidence;
  
  // Calculate weighted score
  const totalWeight = preferences.costWeight + preferences.speedWeight + preferences.reliabilityWeight;
  const normalizedCostWeight = preferences.costWeight / totalWeight;
  const normalizedSpeedWeight = preferences.speedWeight / totalWeight;
  const normalizedReliabilityWeight = preferences.reliabilityWeight / totalWeight;
  
  const score =
    costScore * normalizedCostWeight +
    speedScore * normalizedSpeedWeight +
    reliabilityScore * normalizedReliabilityWeight;
  
  return Math.round(score * 10) / 10;
}

/**
 * Optimizes pickup time across multiple carriers.
 */
export function optimizePickupTime(
  origin: LatLng,
  destination: LatLng,
  carriers: string[],
  preferences?: {
    costWeight?: number;
    speedWeight?: number;
    reliabilityWeight?: number;
  }
): PickupOptimizationResult {
  const defaultPreferences = {
    costWeight: preferences?.costWeight ?? 1.0,
    speedWeight: preferences?.speedWeight ?? 1.5,
    reliabilityWeight: preferences?.reliabilityWeight ?? 1.0,
  };
  
  const distanceKm = haversineKm(origin, destination);
  const seed = `${origin.lat},${origin.lng}->${destination.lat},${destination.lng}`;
  
  // Generate options for each carrier
  const options: CarrierOption[] = carriers.map((carrier) => {
    const prediction = predictEtaWithConfidence(origin, destination, carrier, 'CREATED', seed);
    const estimatedCost = estimateShippingCost(distanceKm, carrier);
    const availability = getCarrierAvailability(carrier, distanceKm);
    const pickupTimes = generatePickupTimes(carrier);
    
    const option: Omit<CarrierOption, 'score'> = {
      carrier,
      estimatedCost,
      estimatedDays: prediction.factors.adjustedDays,
      eta: prediction.eta,
      confidence: prediction.confidence,
      pickupTimes,
      availability,
    };
    
    const score = calculateCarrierScore(option, defaultPreferences);
    
    return {
      ...option,
      score,
    };
  });
  
  // Sort by score descending
  options.sort((a, b) => b.score - a.score);
  
  // Best option is the highest scored
  const recommended = options[0];
  const alternatives = options.slice(1);
  
  return {
    recommended: recommended!,
    alternatives,
    optimizationFactors: defaultPreferences,
  };
}
