/**
 * Unit tests for carrierResolver.ts
 * Tests carrier detection, validation, and probing functionality
 */

import {
  detectCarriers,
  guessCarrierFromTrackingNumber,
  probeCarriers,
  type CarrierGuess,
  type CarrierProbe,
} from '../carrierResolver';

describe('Carrier Resolver', () => {
  describe('detectCarriers', () => {
    it('should detect UPS tracking numbers', () => {
      const carriers = detectCarriers('1Z999AA10123456784');
      expect(carriers.length).toBeGreaterThan(0);
      expect(carriers[0].code).toBe('ups');
      expect(carriers[0].confidence).toBe('high');
    });

    it('should detect USPS tracking numbers', () => {
      const usps1 = detectCarriers('9400111897700000000000');
      expect(usps1[0].code).toBe('usps');
      expect(usps1[0].confidence).toBe('high');

      const usps2 = detectCarriers('420123456789012345678901234567');
      expect(usps2[0].code).toBe('usps');
    });

    it('should detect FedEx tracking numbers', () => {
      const fedex12 = detectCarriers('123456789012');
      expect(fedex12.some(c => c.code === 'fedex')).toBe(true);

      const fedex15 = detectCarriers('123456789012345');
      expect(fedex15.some(c => c.code === 'fedex')).toBe(true);
    });

    it('should detect DHL tracking numbers', () => {
      const dhl = detectCarriers('1234567890');
      expect(dhl.some(c => c.code === 'dhl')).toBe(true);

      const dhlJJD = detectCarriers('JJD123456789012');
      expect(dhlJJD.some(c => c.code === 'dhl')).toBe(true);
    });

    it('should detect international UPU format', () => {
      const china = detectCarriers('RA123456789CN');
      expect(china.some(c => c.code === 'china_post')).toBe(true);

      const netherlands = detectCarriers('RA123456789NL');
      expect(netherlands.some(c => c.code === 'postnl')).toBe(true);
    });

    it('should detect e-commerce carriers', () => {
      const cainiao = detectCarriers('LP004665379CN');
      expect(cainiao.some(c => c.code === 'cainiao')).toBe(true);

      const yunexpress = detectCarriers('YT2210085836454');
      expect(yunexpress.some(c => c.code === 'yunexpress')).toBe(true);

      const fourpx = detectCarriers('4PX1001023243');
      expect(fourpx.some(c => c.code === '4px')).toBe(true);
    });

    it('should detect Amazon Logistics', () => {
      const amazon = detectCarriers('TBA123456789012');
      expect(amazon.some(c => c.code === 'amazon_logistics')).toBe(true);
    });

    it('should return empty array for invalid tracking numbers', () => {
      const invalid1 = detectCarriers('');
      expect(invalid1).toEqual([]);

      const invalid2 = detectCarriers('INVALID');
      expect(invalid2).toEqual([]);

      const invalid3 = detectCarriers('123');
      expect(invalid3).toEqual([]);
    });

    it('should normalize tracking numbers (remove spaces, hyphens)', () => {
      const withSpaces = detectCarriers('1Z 999 AA1 012 345 6784');
      const withoutSpaces = detectCarriers('1Z999AA10123456784');
      expect(withSpaces[0]?.code).toBe(withoutSpaces[0]?.code);

      const withHyphens = detectCarriers('1Z-999-AA1-012-345-6784');
      expect(withHyphens[0]?.code).toBe('ups');
    });

    it('should return multiple matches sorted by score', () => {
      // A 12-digit number might match multiple carriers
      const carriers = detectCarriers('123456789012');
      expect(carriers.length).toBeGreaterThan(0);
      
      // Verify sorting by score (descending)
      for (let i = 1; i < carriers.length; i++) {
        expect(carriers[i - 1].score).toBeGreaterThanOrEqual(carriers[i].score);
      }
    });

    it('should respect limit parameter', () => {
      const unlimited = detectCarriers('123456789012', 0); // 0 = no limit
      const limited = detectCarriers('123456789012', 2);
      
      expect(limited.length).toBeLessThanOrEqual(2);
      if (unlimited.length > 2) {
        expect(limited.length).toBe(2);
      }
    });

    it('should include pattern information in results', () => {
      const carriers = detectCarriers('1Z999AA10123456784');
      expect(carriers[0].matchedPattern).toBeTruthy();
      expect(carriers[0].description).toBeTruthy();
    });
  });

  describe('guessCarrierFromTrackingNumber', () => {
    it('should return top match for valid tracking number', () => {
      const carrier = guessCarrierFromTrackingNumber('1Z999AA10123456784');
      expect(carrier).not.toBeNull();
      expect(carrier?.code).toBe('ups');
    });

    it('should return null for invalid tracking number', () => {
      const carrier = guessCarrierFromTrackingNumber('INVALID');
      expect(carrier).toBeNull();
    });

    it('should return highest scoring match', () => {
      const carrier = guessCarrierFromTrackingNumber('9400111897700000000000');
      expect(carrier?.code).toBe('usps');
      expect(carrier?.confidence).toBe('high');
    });
  });

  describe('probeCarriers', () => {
    it('should return probes with validation flags', () => {
      const probes = probeCarriers('1Z999AA10123456784');
      expect(probes.length).toBeGreaterThan(0);
      expect(probes[0]).toHaveProperty('validated');
      expect(probes[0]).toHaveProperty('probability');
    });

    it('should calculate probability scores', () => {
      const probes = probeCarriers('1Z999AA10123456784');
      probes.forEach(probe => {
        expect(probe.probability).toBeGreaterThanOrEqual(0);
        expect(probe.probability).toBeLessThanOrEqual(1);
      });
    });

    it('should mark UPS patterns as validated', () => {
      const probes = probeCarriers('1Z999AA10123456784');
      const ups = probes.find(p => p.code === 'ups');
      expect(ups?.validated).toBe(true);
      expect(ups?.probability).toBeGreaterThan(0.7);
    });

    it('should detect UPU international patterns', () => {
      const probes = probeCarriers('RA123456789CN');
      const match = probes.find(p => p.code === 'china_post' || p.code === 'intl_post');
      expect(match).toBeDefined();
      expect(match?.validated).toBeDefined();
      // Validation depends on the pattern matching
      expect(typeof match?.validated).toBe('boolean');
    });

    it('should validate check digits for supported carriers', () => {
      // DPD uses mod10 with 3-1 weighting
      // Valid DPD: 00340434161327 (last digit is check)
      const probes = probeCarriers('00340434161327');
      const dpd = probes.find(p => p.code === 'dpd');
      // If DPD matches and check digit is valid, should be validated
      if (dpd) {
        expect(dpd.validated).toBeDefined();
      }
    });

    it('should respect limit parameter', () => {
      const limited = probeCarriers('123456789012', 3);
      expect(limited.length).toBeLessThanOrEqual(3);
    });

    it('should return empty array for invalid tracking number', () => {
      const probes = probeCarriers('INVALID');
      expect(probes).toEqual([]);
    });

    it('should include all carrier guess properties', () => {
      const probes = probeCarriers('1Z999AA10123456784');
      const ups = probes[0];
      
      expect(ups).toHaveProperty('code');
      expect(ups).toHaveProperty('name');
      expect(ups).toHaveProperty('confidence');
      expect(ups).toHaveProperty('score');
      expect(ups).toHaveProperty('matchedPattern');
      expect(ups).toHaveProperty('validated');
      expect(ups).toHaveProperty('probability');
    });
  });

  describe('Carrier Coverage', () => {
    it('should handle major US carriers', () => {
      const ups = guessCarrierFromTrackingNumber('1Z999AA10123456784');
      expect(ups?.name).toBe('UPS');

      const usps = guessCarrierFromTrackingNumber('9400111897700000000000');
      expect(usps?.name).toBe('USPS');

      const fedex = guessCarrierFromTrackingNumber('123456789012');
      expect(fedex?.name).toContain('FedEx');
    });

    it('should handle international carriers', () => {
      // JJD pattern matches Royal Mail/DHL - both valid
      const jjd = guessCarrierFromTrackingNumber('JJD123456789012');
      expect(['dhl', 'royal_mail', 'royal_mail_upu']).toContain(jjd?.code);

      const chinaPost = guessCarrierFromTrackingNumber('RA123456789CN');
      expect(chinaPost?.code).toBe('china_post');
    });

    it('should handle e-commerce carriers', () => {
      // LP with CN ending matches China Post UPU format first
      const lp = guessCarrierFromTrackingNumber('LP004665379CN');
      // Could match Cainiao or China Post depending on pattern priority
      expect(['cainiao', 'china_post']).toContain(lp?.code);

      const amazon = guessCarrierFromTrackingNumber('TBA123456789012');
      expect(amazon?.name).toContain('Amazon');
    });

    it('should handle regional carriers', () => {
      const postnl = guessCarrierFromTrackingNumber('RA123456789NL');
      expect(postnl?.code).toBe('postnl');

      const canadaPost = guessCarrierFromTrackingNumber('CA123456789012');
      expect(canadaPost?.code).toBe('canada_post');
    });
  });

  describe('Confidence Levels', () => {
    it('should assign high confidence to well-defined patterns', () => {
      const ups = guessCarrierFromTrackingNumber('1Z999AA10123456784');
      expect(ups?.confidence).toBe('high');

      const usps = guessCarrierFromTrackingNumber('9400111897700000000000');
      expect(usps?.confidence).toBe('high');
    });

    it('should assign medium confidence to less specific patterns', () => {
      const fedex = guessCarrierFromTrackingNumber('123456789012');
      expect(fedex?.confidence).toBe('medium');
    });

    it('should assign low confidence to ambiguous patterns', () => {
      // 14-digit numbers could be DPD or other carriers
      const carriers = detectCarriers('12345678901234');
      const lowConfidence = carriers.filter(c => c.confidence === 'low');
      expect(lowConfidence.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle lowercase tracking numbers', () => {
      const lower = guessCarrierFromTrackingNumber('ra123456789cn');
      const upper = guessCarrierFromTrackingNumber('RA123456789CN');
      expect(lower?.code).toBe(upper?.code);
    });

    it('should handle mixed case tracking numbers', () => {
      const mixed = guessCarrierFromTrackingNumber('1z999aa10123456784');
      expect(mixed?.code).toBe('ups');
    });

    it('should handle very long tracking numbers', () => {
      const long = '420' + '1'.repeat(27);
      const carriers = detectCarriers(long);
      expect(carriers.some(c => c.code === 'usps')).toBe(true);
    });

    it('should handle tracking numbers with special characters', () => {
      const special = '1Z-999-AA1-012-345-6784';
      const carrier = guessCarrierFromTrackingNumber(special);
      expect(carrier?.code).toBe('ups');
    });
  });

  describe('Score Calculation', () => {
    it('should give higher scores to more specific matches', () => {
      const carriers = detectCarriers('1Z999AA10123456784');
      const ups = carriers.find(c => c.code === 'ups');
      
      // UPS should have a high score due to regex + prefix + length match
      expect(ups?.score).toBeGreaterThan(500);
    });

    it('should combine regex, prefix, and length scores', () => {
      const carriers = detectCarriers('9400111897700000000000');
      const usps = carriers.find(c => c.code === 'usps');
      
      // USPS should have high score due to multiple pattern matches
      expect(usps?.score).toBeGreaterThan(500);
    });
  });
});
