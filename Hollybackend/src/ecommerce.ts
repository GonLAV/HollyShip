import { z } from 'zod';
import { extractTrackingFromEmail } from './emailIngestion.js';

/**
 * E-commerce webhook integration for Shopify and WooCommerce
 * Supports automatic shipment tracking from order fulfillment events
 */

// Shopify webhook payload schema
const ShopifyOrderSchema = z.object({
  id: z.number(),
  order_number: z.number(),
  email: z.string().email().optional(),
  fulfillment_status: z.string().nullable(),
  fulfillments: z.array(z.object({
    tracking_number: z.string().optional(),
    tracking_company: z.string().optional(),
    tracking_url: z.string().optional(),
    status: z.string().optional(),
  })).optional(),
  line_items: z.array(z.object({
    id: z.number(),
    name: z.string(),
    quantity: z.number(),
  })).optional(),
  total_price: z.string().optional(),
  currency: z.string().optional(),
});

// WooCommerce webhook payload schema
const WooCommerceOrderSchema = z.object({
  id: z.number(),
  order_key: z.string(),
  billing: z.object({
    email: z.string().email().optional(),
  }).optional(),
  status: z.string(),
  meta_data: z.array(z.object({
    key: z.string(),
    value: z.unknown(),
  })).optional(),
  line_items: z.array(z.object({
    id: z.number(),
    name: z.string(),
    quantity: z.number(),
  })).optional(),
  total: z.string().optional(),
  currency: z.string().optional(),
});

export type ShopifyOrder = z.infer<typeof ShopifyOrderSchema>;
export type WooCommerceOrder = z.infer<typeof WooCommerceOrderSchema>;

export interface ExtractedShipment {
  trackingNumber: string;
  carrier?: string;
  orderNumber: string;
  merchantName: string;
  userEmail?: string;
  items?: Array<{ name: string; quantity: number }>;
  totalAmount?: string;
  currency?: string;
}

/**
 * Extract tracking information from Shopify order/fulfillment webhook
 */
export function extractFromShopify(payload: unknown): ExtractedShipment[] {
  const order = ShopifyOrderSchema.parse(payload);
  const results: ExtractedShipment[] = [];

  if (order.fulfillments && order.fulfillments.length > 0) {
    for (const fulfillment of order.fulfillments) {
      if (fulfillment.tracking_number) {
        results.push({
          trackingNumber: fulfillment.tracking_number,
          carrier: fulfillment.tracking_company,
          orderNumber: `SHOP-${order.order_number}`,
          merchantName: 'Shopify Store',
          userEmail: order.email,
          items: order.line_items?.map(item => ({
            name: item.name,
            quantity: item.quantity,
          })),
          totalAmount: order.total_price,
          currency: order.currency,
        });
      }
    }
  }

  return results;
}

/**
 * Extract tracking information from WooCommerce order webhook
 */
export function extractFromWooCommerce(payload: unknown): ExtractedShipment[] {
  const order = WooCommerceOrderSchema.parse(payload);
  const results: ExtractedShipment[] = [];

  // WooCommerce stores tracking in meta_data
  if (order.meta_data && order.meta_data.length > 0) {
    const trackingMeta = order.meta_data.find(
      meta => meta.key === '_tracking_number' || meta.key === 'tracking_number'
    );
    const carrierMeta = order.meta_data.find(
      meta => meta.key === '_tracking_provider' || meta.key === 'tracking_provider'
    );

    if (trackingMeta && typeof trackingMeta.value === 'string') {
      results.push({
        trackingNumber: trackingMeta.value,
        carrier: carrierMeta && typeof carrierMeta.value === 'string' ? carrierMeta.value : undefined,
        orderNumber: `WC-${order.id}`,
        merchantName: 'WooCommerce Store',
        userEmail: order.billing?.email,
        items: order.line_items?.map(item => ({
          name: item.name,
          quantity: item.quantity,
        })),
        totalAmount: order.total,
        currency: order.currency,
      });
    }
  }

  return results;
}

/**
 * Validate Shopify webhook signature
 * Shopify uses HMAC-SHA256 with base64 encoding
 */
export function validateShopifyWebhook(
  payload: string,
  hmacHeader: string,
  secret: string
): boolean {
  if (!secret) {
    console.warn('[Shopify] No secret configured, skipping validation');
    return true;
  }

  try {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64');

    // Timing-safe comparison
    const expectedBuffer = Buffer.from(hash);
    const actualBuffer = Buffer.from(hmacHeader);

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (error) {
    console.error('[Shopify] Webhook validation error:', error);
    return false;
  }
}

/**
 * Validate WooCommerce webhook signature
 * WooCommerce uses HMAC-SHA256 with base64 encoding
 */
export function validateWooCommerceWebhook(
  payload: string,
  signatureHeader: string,
  secret: string
): boolean {
  if (!secret) {
    console.warn('[WooCommerce] No secret configured, skipping validation');
    return true;
  }

  try {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64');

    // Timing-safe comparison
    const expectedBuffer = Buffer.from(hash);
    const actualBuffer = Buffer.from(signatureHeader);

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (error) {
    console.error('[WooCommerce] Webhook validation error:', error);
    return false;
  }
}

/**
 * Detect platform from webhook payload structure
 */
export function detectPlatform(payload: unknown): 'shopify' | 'woocommerce' | 'unknown' {
  if (!payload || typeof payload !== 'object') {
    return 'unknown';
  }

  const obj = payload as Record<string, unknown>;

  // Shopify typically has 'fulfillments' array and specific structure
  if ('fulfillments' in obj && 'order_number' in obj) {
    return 'shopify';
  }

  // WooCommerce has 'order_key' and 'billing' object
  if ('order_key' in obj && 'billing' in obj) {
    return 'woocommerce';
  }

  return 'unknown';
}
