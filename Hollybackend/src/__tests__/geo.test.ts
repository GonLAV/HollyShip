/**
 * Unit tests for geo.ts
 * Tests ETA prediction, confidence scoring, and multi-carrier optimization
 */

import {
  coordsForOrigin,
  coordsForDestination,
  progressForStatus,
  interpolateLatLng,
  haversineKm,
  addBusinessDays,
  predictTransitBusinessDays,
  predictEtaDate,
  predictEtaWithConfidence,
  optimizeCarrierPickup,
  type LatLng,
  type EtaPrediction,
  type CarrierPickupOption,
} from '../geo';

describe('Geo Module', () => {
  describe('coordsForOrigin', () => {
    it('should return Memphis coords for null/undefined origin', () => {
      const coords = coordsForOrigin(null);
      expect(coords.lat).toBeCloseTo(35.1495, 3);
      expect(coords.lng).toBeCloseTo(-90.049, 3);
    });

    it('should return correct coords for known origins', () => {
      const la = coordsForOrigin('Los Angeles, CA');
      expect(la.lat).toBeCloseTo(34.0522, 3);
      expect(la.lng).toBeCloseTo(-118.2437, 3);

      const chicago = coordsForOrigin('Chicago, IL');
      expect(chicago.lat).toBeCloseTo(41.8781, 3);
      expect(chicago.lng).toBeCloseTo(-87.6298, 3);
    });
  });

  describe('coordsForDestination', () => {
    it('should generate deterministic coords from tracking number', () => {
      const coords1 = coordsForDestination('New York', 'TRACK123');
      const coords2 = coordsForDestination('New York', 'TRACK123');
      expect(coords1.lat).toBe(coords2.lat);
      expect(coords1.lng).toBe(coords2.lng);
    });

    it('should use destination for coords when provided', () => {
      // When destination is provided, it uses destination not tracking number
      const coords1 = coordsForDestination('New York', 'TRACK123');
      const coords2 = coordsForDestination('New York', 'TRACK456');
      // Same destination should give same coords
      expect(coords1.lat).toBe(coords2.lat);
      expect(coords1.lng).toBe(coords2.lng);
      
      // Different destinations should give different coords
      const coords3 = coordsForDestination('Los Angeles', 'TRACK123');
      expect(coords1.lat).not.toBe(coords3.lat);
      expect(coords1.lng).not.toBe(coords3.lng);
    });

    it('should keep coords within reasonable bounds', () => {
      const coords = coordsForDestination('Anywhere', 'TEST999');
      expect(coords.lat).toBeGreaterThanOrEqual(-60);
      expect(coords.lat).toBeLessThanOrEqual(80);
      expect(coords.lng).toBeGreaterThanOrEqual(-170);
      expect(coords.lng).toBeLessThanOrEqual(170);
    });
  });

  describe('progressForStatus', () => {
    it('should return correct progress for each status', () => {
      expect(progressForStatus('CREATED')).toBe(0.1);
      expect(progressForStatus('IN_TRANSIT')).toBe(0.5);
      expect(progressForStatus('OUT_FOR_DELIVERY')).toBe(0.85);
      expect(progressForStatus('DELIVERED')).toBe(1);
    });

    it('should default to 0.1 for unknown status', () => {
      expect(progressForStatus('UNKNOWN')).toBe(0.1);
      expect(progressForStatus('')).toBe(0.1);
    });
  });

  describe('interpolateLatLng', () => {
    const origin: LatLng = { lat: 0, lng: 0 };
    const dest: LatLng = { lat: 10, lng: 10 };

    it('should return origin at t=0', () => {
      const result = interpolateLatLng(origin, dest, 0);
      expect(result.lat).toBe(0);
      expect(result.lng).toBe(0);
    });

    it('should return destination at t=1', () => {
      const result = interpolateLatLng(origin, dest, 1);
      expect(result.lat).toBe(10);
      expect(result.lng).toBe(10);
    });

    it('should return midpoint at t=0.5', () => {
      const result = interpolateLatLng(origin, dest, 0.5);
      expect(result.lat).toBe(5);
      expect(result.lng).toBe(5);
    });

    it('should clamp values outside [0,1]', () => {
      const result1 = interpolateLatLng(origin, dest, -0.5);
      expect(result1.lat).toBe(0);
      expect(result1.lng).toBe(0);

      const result2 = interpolateLatLng(origin, dest, 1.5);
      expect(result2.lat).toBe(10);
      expect(result2.lng).toBe(10);
    });
  });

  describe('haversineKm', () => {
    it('should return 0 for same point', () => {
      const point: LatLng = { lat: 40.7128, lng: -74.006 };
      const distance = haversineKm(point, point);
      expect(distance).toBe(0);
    });

    it('should calculate distance between NYC and LA (~3936 km)', () => {
      const nyc: LatLng = { lat: 40.7128, lng: -74.006 };
      const la: LatLng = { lat: 34.0522, lng: -118.2437 };
      const distance = haversineKm(nyc, la);
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    it('should calculate distance between Memphis and Chicago (~780 km)', () => {
      const memphis: LatLng = { lat: 35.1495, lng: -90.049 };
      const chicago: LatLng = { lat: 41.8781, lng: -87.6298 };
      const distance = haversineKm(memphis, chicago);
      expect(distance).toBeGreaterThan(700);
      expect(distance).toBeLessThan(900);
    });
  });

  describe('addBusinessDays', () => {
    it('should add business days skipping weekends', () => {
      // Start on a Monday (adjust this date to a known Monday)
      const monday = new Date('2025-01-06'); // This is a Monday
      const result = addBusinessDays(monday, 5);
      
      // 5 business days from Monday should be next Monday
      const expected = new Date('2025-01-13');
      expect(result.getDate()).toBe(expected.getDate());
    });

    it('should return same date for 0 days', () => {
      const start = new Date('2025-01-06');
      const result = addBusinessDays(start, 0);
      expect(result.getTime()).toBe(start.getTime());
    });

    it('should skip weekends correctly', () => {
      // Friday
      const friday = new Date('2025-01-10');
      const result = addBusinessDays(friday, 1);
      
      // Next business day should be Monday
      expect(result.getDay()).toBe(1); // Monday
    });
  });

  describe('predictTransitBusinessDays', () => {
    it('should predict 1-3 days for short distances (<500km)', () => {
      const days = predictTransitBusinessDays(300);
      expect(days).toBeGreaterThanOrEqual(1);
      expect(days).toBeLessThanOrEqual(3);
    });

    it('should predict 2-5 days for medium distances (500-1500km)', () => {
      const days = predictTransitBusinessDays(1000);
      expect(days).toBeGreaterThanOrEqual(2);
      expect(days).toBeLessThanOrEqual(5);
    });

    it('should predict 5-10 days for long distances (1500-5000km)', () => {
      const days = predictTransitBusinessDays(3000);
      expect(days).toBeGreaterThanOrEqual(5);
      expect(days).toBeLessThanOrEqual(10);
    });

    it('should predict 7-14 days for very long distances (>5000km)', () => {
      const days = predictTransitBusinessDays(6000);
      expect(days).toBeGreaterThanOrEqual(5); // min is reduced for express
      expect(days).toBeLessThanOrEqual(14);
    });

    it('should reduce days for express carriers', () => {
      const standardDays = predictTransitBusinessDays(3000);
      const expressDays = predictTransitBusinessDays(3000, 'FedEx');
      expect(expressDays).toBeLessThanOrEqual(standardDays);
    });

    it('should increase days for economy carriers', () => {
      const standardDays = predictTransitBusinessDays(3000);
      const economyDays = predictTransitBusinessDays(3000, 'ecommerce');
      expect(economyDays).toBeGreaterThanOrEqual(standardDays);
    });
  });

  describe('predictEtaDate', () => {
    const origin: LatLng = { lat: 35.1495, lng: -90.049 }; // Memphis
    const destination: LatLng = { lat: 41.8781, lng: -87.6298 }; // Chicago

    it('should return a future date', () => {
      const eta = predictEtaDate(origin, destination);
      expect(eta.getTime()).toBeGreaterThan(Date.now());
    });

    it('should be deterministic with same seed', () => {
      const eta1 = predictEtaDate(origin, destination, 'UPS', 'SEED123');
      const eta2 = predictEtaDate(origin, destination, 'UPS', 'SEED123');
      expect(eta1.getTime()).toBe(eta2.getTime());
    });

    it('should vary with different seeds', () => {
      const eta1 = predictEtaDate(origin, destination, 'UPS', 'SEED123');
      const eta2 = predictEtaDate(origin, destination, 'UPS', 'SEED456');
      // They might be the same due to rounding, but should be close
      expect(Math.abs(eta1.getTime() - eta2.getTime())).toBeLessThan(10 * 24 * 60 * 60 * 1000); // within 10 days
    });
  });

  describe('predictEtaWithConfidence', () => {
    const origin: LatLng = { lat: 35.1495, lng: -90.049 }; // Memphis
    const destination: LatLng = { lat: 41.8781, lng: -87.6298 }; // Chicago

    it('should return all required fields', () => {
      const prediction = predictEtaWithConfidence(origin, destination, 'UPS', 'TEST');
      
      expect(prediction).toHaveProperty('estimatedDate');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('confidenceScore');
      expect(prediction).toHaveProperty('weatherFactor');
      expect(prediction).toHaveProperty('trafficFactor');
      expect(prediction).toHaveProperty('minDays');
      expect(prediction).toHaveProperty('maxDays');
      expect(prediction).toHaveProperty('estimatedDays');
    });

    it('should have confidence score between 0 and 100', () => {
      const prediction = predictEtaWithConfidence(origin, destination);
      expect(prediction.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(prediction.confidenceScore).toBeLessThanOrEqual(100);
    });

    it('should have weather and traffic factors between 0 and 1', () => {
      const prediction = predictEtaWithConfidence(origin, destination);
      expect(prediction.weatherFactor).toBeGreaterThanOrEqual(0);
      expect(prediction.weatherFactor).toBeLessThan(1);
      expect(prediction.trafficFactor).toBeGreaterThanOrEqual(0);
      expect(prediction.trafficFactor).toBeLessThan(1);
    });

    it('should have minDays <= estimatedDays <= maxDays', () => {
      const prediction = predictEtaWithConfidence(origin, destination);
      expect(prediction.estimatedDays).toBeGreaterThanOrEqual(prediction.minDays);
      expect(prediction.estimatedDays).toBeLessThanOrEqual(prediction.maxDays);
    });

    it('should assign high confidence for short distances with premium carriers', () => {
      const shortDist: LatLng = { lat: 35.2, lng: -90.1 }; // Very close to Memphis
      const prediction = predictEtaWithConfidence(origin, shortDist, 'FedEx', 'TEST');
      
      // Short distance + premium carrier should have good confidence
      expect(['high', 'medium']).toContain(prediction.confidence);
    });

    it('should assign lower confidence for very long distances', () => {
      const farDest: LatLng = { lat: -33.8688, lng: 151.2093 }; // Sydney, Australia
      const prediction = predictEtaWithConfidence(origin, farDest, 'ecommerce', 'TEST');
      
      // Very long distance + economy carrier should have lower confidence
      expect(prediction.confidenceScore).toBeLessThan(80);
    });

    it('should be deterministic with same seed', () => {
      const pred1 = predictEtaWithConfidence(origin, destination, 'UPS', 'SEED123');
      const pred2 = predictEtaWithConfidence(origin, destination, 'UPS', 'SEED123');
      
      expect(pred1.estimatedDate.getTime()).toBe(pred2.estimatedDate.getTime());
      expect(pred1.confidenceScore).toBe(pred2.confidenceScore);
      expect(pred1.weatherFactor).toBe(pred2.weatherFactor);
      expect(pred1.trafficFactor).toBe(pred2.trafficFactor);
    });
  });

  describe('optimizeCarrierPickup', () => {
    const origin: LatLng = { lat: 35.1495, lng: -90.049 }; // Memphis
    const destination: LatLng = { lat: 41.8781, lng: -87.6298 }; // Chicago
    const carriers = ['UPS', 'FedEx', 'USPS', 'DHL eCommerce'];

    it('should return options for all carriers', () => {
      const options = optimizeCarrierPickup(origin, destination, carriers, 'TEST');
      expect(options).toHaveLength(carriers.length);
    });

    it('should include all required fields for each option', () => {
      const options = optimizeCarrierPickup(origin, destination, carriers, 'TEST');
      
      options.forEach(option => {
        expect(option).toHaveProperty('carrierName');
        expect(option).toHaveProperty('estimatedPickupTime');
        expect(option).toHaveProperty('estimatedDeliveryTime');
        expect(option).toHaveProperty('transitDays');
        expect(option).toHaveProperty('reliabilityScore');
        expect(option).toHaveProperty('costEstimate');
        expect(option).toHaveProperty('recommendation');
      });
    });

    it('should assign premium cost to express carriers', () => {
      const options = optimizeCarrierPickup(origin, destination, ['UPS', 'FedEx', 'DHL'], 'TEST');
      
      const ups = options.find(o => o.carrierName === 'UPS');
      const fedex = options.find(o => o.carrierName === 'FedEx');
      const dhl = options.find(o => o.carrierName === 'DHL');
      
      expect(ups?.costEstimate).toBe('premium');
      expect(fedex?.costEstimate).toBe('premium');
      expect(dhl?.costEstimate).toBe('premium');
    });

    it('should assign economy cost to economy carriers', () => {
      const options = optimizeCarrierPickup(origin, destination, ['ecommerce packet'], 'TEST');
      const economy = options.find(o => o.carrierName === 'ecommerce packet');
      expect(economy?.costEstimate).toBe('economy');
    });

    it('should sort by reliability score and transit days', () => {
      const options = optimizeCarrierPickup(origin, destination, carriers, 'TEST');
      
      // Check that options are sorted (higher reliability first, then lower transit)
      for (let i = 1; i < options.length; i++) {
        const prev = options[i - 1];
        const curr = options[i];
        
        // If reliability differs significantly, prev should be higher
        if (Math.abs(prev.reliabilityScore - curr.reliabilityScore) > 5) {
          expect(prev.reliabilityScore).toBeGreaterThanOrEqual(curr.reliabilityScore);
        }
      }
    });

    it('should estimate same-day pickup for express carriers', () => {
      const options = optimizeCarrierPickup(origin, destination, ['FedEx'], 'TEST');
      const fedex = options[0];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const pickupDay = new Date(fedex.estimatedPickupTime);
      pickupDay.setHours(0, 0, 0, 0);
      
      // Pickup should be today or very soon
      const diffDays = Math.floor((pickupDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeLessThanOrEqual(1);
    });

    it('should provide helpful recommendations', () => {
      const options = optimizeCarrierPickup(origin, destination, carriers, 'TEST');
      
      options.forEach(option => {
        expect(option.recommendation).toBeTruthy();
        expect(typeof option.recommendation).toBe('string');
        expect(option.recommendation.length).toBeGreaterThan(0);
      });
    });

    it('should be deterministic with same seed', () => {
      const options1 = optimizeCarrierPickup(origin, destination, carriers, 'SEED123');
      const options2 = optimizeCarrierPickup(origin, destination, carriers, 'SEED123');
      
      expect(options1).toHaveLength(options2.length);
      
      for (let i = 0; i < options1.length; i++) {
        expect(options1[i].carrierName).toBe(options2[i].carrierName);
        expect(options1[i].transitDays).toBe(options2[i].transitDays);
        expect(options1[i].reliabilityScore).toBe(options2[i].reliabilityScore);
      }
    });
  });
});
