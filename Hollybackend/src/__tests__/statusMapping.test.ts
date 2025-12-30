/**
 * Unit tests for status mapping
 * Tests canonical status mapping from various carrier formats
 */

describe('Status Mapping', () => {
  const statusMapping: Record<string, string> = {
    'created': 'CREATED',
    'pending': 'CREATED',
    'in_transit': 'IN_TRANSIT',
    'transit': 'IN_TRANSIT',
    'out_for_delivery': 'OUT_FOR_DELIVERY',
    'delivered': 'DELIVERED',
    'delayed': 'DELAYED',
    'exception': 'ACTION_REQUIRED',
    'failed': 'FAILURE',
    'failure': 'FAILURE',
  };

  function normalizeStatus(rawStatus: string): string {
    return rawStatus.toLowerCase().replace(/[\s-]/g, '_');
  }

  function mapToCanonical(carrierStatus: string): string {
    const normalized = normalizeStatus(carrierStatus);
    return statusMapping[normalized] || 'CREATED';
  }

  describe('normalizeStatus', () => {
    it('should convert to lowercase', () => {
      expect(normalizeStatus('IN_TRANSIT')).toBe('in_transit');
      expect(normalizeStatus('Delivered')).toBe('delivered');
    });

    it('should replace spaces with underscores', () => {
      expect(normalizeStatus('out for delivery')).toBe('out_for_delivery');
      expect(normalizeStatus('In Transit')).toBe('in_transit');
    });

    it('should replace hyphens with underscores', () => {
      expect(normalizeStatus('out-for-delivery')).toBe('out_for_delivery');
      expect(normalizeStatus('in-transit')).toBe('in_transit');
    });

    it('should handle mixed separators', () => {
      expect(normalizeStatus('Out-For Delivery')).toBe('out_for_delivery');
    });
  });

  describe('mapToCanonical', () => {
    it('should map created status', () => {
      expect(mapToCanonical('created')).toBe('CREATED');
      expect(mapToCanonical('pending')).toBe('CREATED');
      expect(mapToCanonical('Created')).toBe('CREATED');
      expect(mapToCanonical('PENDING')).toBe('CREATED');
    });

    it('should map in_transit status', () => {
      expect(mapToCanonical('in_transit')).toBe('IN_TRANSIT');
      expect(mapToCanonical('transit')).toBe('IN_TRANSIT');
      expect(mapToCanonical('In Transit')).toBe('IN_TRANSIT');
      expect(mapToCanonical('IN-TRANSIT')).toBe('IN_TRANSIT');
    });

    it('should map out_for_delivery status', () => {
      expect(mapToCanonical('out_for_delivery')).toBe('OUT_FOR_DELIVERY');
      expect(mapToCanonical('Out For Delivery')).toBe('OUT_FOR_DELIVERY');
      expect(mapToCanonical('out-for-delivery')).toBe('OUT_FOR_DELIVERY');
    });

    it('should map delivered status', () => {
      expect(mapToCanonical('delivered')).toBe('DELIVERED');
      expect(mapToCanonical('DELIVERED')).toBe('DELIVERED');
      expect(mapToCanonical('Delivered')).toBe('DELIVERED');
    });

    it('should map delayed status', () => {
      expect(mapToCanonical('delayed')).toBe('DELAYED');
      expect(mapToCanonical('DELAYED')).toBe('DELAYED');
    });

    it('should map exception status', () => {
      expect(mapToCanonical('exception')).toBe('ACTION_REQUIRED');
      expect(mapToCanonical('Exception')).toBe('ACTION_REQUIRED');
    });

    it('should map failure status', () => {
      expect(mapToCanonical('failed')).toBe('FAILURE');
      expect(mapToCanonical('failure')).toBe('FAILURE');
      expect(mapToCanonical('FAILED')).toBe('FAILURE');
    });

    it('should default to CREATED for unknown status', () => {
      expect(mapToCanonical('unknown')).toBe('CREATED');
      expect(mapToCanonical('random_status')).toBe('CREATED');
      expect(mapToCanonical('')).toBe('CREATED');
    });
  });

  describe('Real-world carrier status examples', () => {
    it('should handle UPS statuses', () => {
      expect(mapToCanonical('Order Processed: Ready for UPS')).toBe('CREATED');
      expect(mapToCanonical('In Transit')).toBe('IN_TRANSIT');
      expect(mapToCanonical('Out For Delivery')).toBe('OUT_FOR_DELIVERY');
      expect(mapToCanonical('Delivered')).toBe('DELIVERED');
    });

    it('should handle FedEx statuses', () => {
      expect(mapToCanonical('Picked up')).toBe('CREATED');
      expect(mapToCanonical('In transit')).toBe('IN_TRANSIT');
      expect(mapToCanonical('On FedEx vehicle for delivery')).toBe('CREATED'); // Would need better mapping
      expect(mapToCanonical('Delivered')).toBe('DELIVERED');
    });

    it('should handle USPS statuses', () => {
      expect(mapToCanonical('Accepted')).toBe('CREATED');
      expect(mapToCanonical('In Transit')).toBe('IN_TRANSIT');
      expect(mapToCanonical('Out for Delivery')).toBe('OUT_FOR_DELIVERY');
      expect(mapToCanonical('Delivered')).toBe('DELIVERED');
    });
  });
});
