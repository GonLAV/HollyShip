export type CarrierGuess = {
  code: string;
  name: string;
  confidence: 'high' | 'medium' | 'low';
} | null;

// Regex-first resolver stub.
// This is intentionally conservative: when unsure, returns null and we fall back to manual selection.
export function guessCarrierFromTrackingNumber(trackingNumberRaw: string): CarrierGuess {
  const trackingNumber = String(trackingNumberRaw || '').trim().toUpperCase();
  if (!trackingNumber) return null;

  // UPS: 1Z + 16 alphanumerics
  if (/\b1Z[0-9A-Z]{16}\b/.test(trackingNumber)) {
    return { code: 'ups', name: 'UPS', confidence: 'high' };
  }

  // USPS common formats (very incomplete but useful)
  if (/\b(94|93|92|95)\d{20}\b/.test(trackingNumber) || /\b420\d{27}\b/.test(trackingNumber)) {
    return { code: 'usps', name: 'USPS', confidence: 'high' };
  }

  // FedEx: 12/15/20 digits (ambiguous, so medium)
  if (/\b\d{12}\b/.test(trackingNumber) || /\b\d{15}\b/.test(trackingNumber) || /\b\d{20}\b/.test(trackingNumber)) {
    return { code: 'fedex', name: 'FedEx', confidence: 'medium' };
  }

  // UPU S10 (very common internationally, incl. CN/EU): e.g. RA123456789CN
  if (/\b[A-Z]{2}\d{9}[A-Z]{2}\b/.test(trackingNumber)) {
    return { code: 'upu', name: 'International Post (UPU)', confidence: 'medium' };
  }

  // YunExpress (common for TEMU/SHEIN/DHgate shipments): YT + digits
  if (/\bYT\d{16,}\b/i.test(trackingNumber)) {
    return { code: 'yunexpress', name: 'YunExpress', confidence: 'medium' };
  }

  // Cainiao / AliExpress standard LP* format (often LPxxxxxxxxxxxxxCN)
  if (/\bLP\d{12,}[A-Z]{0,2}\b/.test(trackingNumber)) {
    return { code: 'cainiao', name: 'Cainiao', confidence: 'medium' };
  }

  // 4PX often appears as 4PX* or "4PX" + digits
  if (/\b4PX\d{10,}\b/.test(trackingNumber)) {
    return { code: '4px', name: '4PX', confidence: 'medium' };
  }

  // Yanwen commonly includes "UV" prefix (formats vary widely)
  if (/\bU?V\d{8,}[A-Z]{0,2}\b/.test(trackingNumber) && trackingNumber.includes('Y')) {
    return { code: 'yanwen', name: 'Yanwen', confidence: 'low' };
  }

  // SF Express often starts with SF + digits
  if (/\bSF\d{10,}\b/.test(trackingNumber)) {
    return { code: 'sf_express', name: 'SF Express', confidence: 'low' };
  }

  // DHL: 10 digits (very ambiguous)
  if (/\b\d{10}\b/.test(trackingNumber)) {
    return { code: 'dhl', name: 'DHL', confidence: 'low' };
  }

  // DPD (EU) often 14 digits (still ambiguous)
  if (/\b\d{14}\b/.test(trackingNumber)) {
    return { code: 'dpd', name: 'DPD', confidence: 'low' };
  }

  // Hermes/Evri (UK) has many numeric formats; keep very low confidence
  if (/\b\d{16}\b/.test(trackingNumber)) {
    return { code: 'evri', name: 'Evri (Hermes)', confidence: 'low' };
  }

  // Amazon Logistics (common prefixes like TBA)
  if (/\bTBA\d{12,}\b/.test(trackingNumber)) {
    return { code: 'amazon_logistics', name: 'Amazon Logistics', confidence: 'medium' };
  }

  // AliExpress isn't a carrier; treat as "unknown" when users pick it.
  return null;
}
