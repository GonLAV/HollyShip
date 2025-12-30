import { z } from 'zod';

/**
 * Email ingestion module for Gmail and Outlook
 * This is a stub implementation for MVP - connects OAuth flows to email parsing
 * 
 * For production:
 * - Gmail: Use googleapis library and set up OAuth2 client
 * - Outlook: Use @microsoft/microsoft-graph-client and MSAL
 */

// Gmail OAuth configuration
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:8080/v1/connect/email/gmail/callback';

// Outlook OAuth configuration  
const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID;
const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET;
const OUTLOOK_REDIRECT_URI = process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:8080/v1/connect/email/outlook/callback';

interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: Date;
}

interface TrackingInfo {
  trackingNumber: string;
  carrier?: string;
  merchantName?: string;
  orderNumber?: string;
}

/**
 * Generate Gmail OAuth authorization URL
 */
export function getGmailAuthUrl(state?: string): string {
  if (!GMAIL_CLIENT_ID) {
    throw new Error('GMAIL_CLIENT_ID not configured');
  }

  const params = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID,
    redirect_uri: GMAIL_REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    access_type: 'offline',
    prompt: 'consent',
  });

  if (state) {
    params.set('state', state);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange Gmail authorization code for tokens
 */
export async function exchangeGmailCode(code: string): Promise<OAuthTokens> {
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
    throw new Error('Gmail OAuth not configured');
  }

  // In production, call Google OAuth token endpoint
  // For MVP, return stub data
  console.log('[Email] Would exchange Gmail code:', code);
  
  return {
    accessToken: 'stub-gmail-token',
    refreshToken: 'stub-gmail-refresh',
    expiresAt: new Date(Date.now() + 3600 * 1000),
  };
}

/**
 * Generate Outlook OAuth authorization URL
 */
export function getOutlookAuthUrl(state?: string): string {
  if (!OUTLOOK_CLIENT_ID) {
    throw new Error('OUTLOOK_CLIENT_ID not configured');
  }

  const params = new URLSearchParams({
    client_id: OUTLOOK_CLIENT_ID,
    redirect_uri: OUTLOOK_REDIRECT_URI,
    response_type: 'code',
    scope: 'Mail.Read offline_access',
  });

  if (state) {
    params.set('state', state);
  }

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Exchange Outlook authorization code for tokens
 */
export async function exchangeOutlookCode(code: string): Promise<OAuthTokens> {
  if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET) {
    throw new Error('Outlook OAuth not configured');
  }

  // In production, call Microsoft OAuth token endpoint
  // For MVP, return stub data
  console.log('[Email] Would exchange Outlook code:', code);
  
  return {
    accessToken: 'stub-outlook-token',
    refreshToken: 'stub-outlook-refresh',
    expiresAt: new Date(Date.now() + 3600 * 1000),
  };
}

/**
 * Extract tracking information from email content
 * Uses regex patterns to identify tracking numbers and carriers
 */
export function extractTrackingFromEmail(email: EmailMessage): TrackingInfo[] {
  const results: TrackingInfo[] = [];
  const content = `${email.subject} ${email.body}`;

  // Common tracking number patterns - ordered by specificity to avoid conflicts
  const patterns = [
    // UPS: 1Z + 16 alphanumeric (always 18 characters total)
    { regex: /\b(1Z[0-9A-Z]{16})\b/gi, carrier: 'UPS' },
    // USPS: 20-22 digits or specific patterns (check before generic patterns)
    { regex: /\b(9[0-9]{19,21})\b/g, carrier: 'USPS' },
    { regex: /\b(94[0-9]{20})\b/g, carrier: 'USPS' },
    // FedEx: 12 or 14 digits (specific lengths to avoid DHL conflict)
    { regex: /\b(\d{12})\b/g, carrier: 'FedEx' },
    { regex: /\b(\d{14})\b/g, carrier: 'FedEx' },
    // DHL: 10-11 digits (checked after more specific patterns)
    { regex: /\b(\d{10,11})\b/g, carrier: 'DHL' },
  ];

  for (const pattern of patterns) {
    const matches = content.match(pattern.regex);
    if (matches) {
      for (const match of matches) {
        results.push({
          trackingNumber: match.trim(),
          carrier: pattern.carrier,
        });
      }
    }
  }

  // Extract merchant name from common patterns
  const merchantMatch = content.match(/(?:from|by)\s+([A-Z][a-zA-Z\s&]+?)(?:\s+has|,|\.|$)/i);
  if (merchantMatch && results.length > 0) {
    const merchantName = merchantMatch[1].trim();
    results.forEach(r => r.merchantName = merchantName);
  }

  // Extract order number
  const orderMatch = content.match(/order\s*#?\s*([A-Z0-9-]+)/i);
  if (orderMatch && results.length > 0) {
    const orderNumber = orderMatch[1].trim();
    results.forEach(r => r.orderNumber = orderNumber);
  }

  return results;
}

/**
 * Fetch recent emails from Gmail
 * In production, this would call the Gmail API
 */
export async function fetchGmailMessages(accessToken: string, maxResults = 10): Promise<EmailMessage[]> {
  console.log('[Email] Would fetch Gmail messages with token:', accessToken.substring(0, 20));
  
  // In production:
  // - Use googleapis library
  // - Call gmail.users.messages.list
  // - Parse and return messages
  
  return [];
}

/**
 * Fetch recent emails from Outlook
 * In production, this would call the Microsoft Graph API
 */
export async function fetchOutlookMessages(accessToken: string, maxResults = 10): Promise<EmailMessage[]> {
  console.log('[Email] Would fetch Outlook messages with token:', accessToken.substring(0, 20));
  
  // In production:
  // - Use @microsoft/microsoft-graph-client
  // - Call /me/messages
  // - Parse and return messages
  
  return [];
}

/**
 * Set up Gmail push notifications (watch)
 * In production, this would set up Gmail pub/sub notifications
 */
export async function setupGmailWatch(accessToken: string, userId: string): Promise<{ expiration: Date }> {
  console.log('[Email] Would setup Gmail watch for user:', userId);
  
  // In production:
  // - Call gmail.users.watch
  // - Set up Cloud Pub/Sub topic
  // - Store watch configuration
  
  return {
    expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  };
}

/**
 * Set up Outlook push notifications (subscription)
 * In production, this would set up Microsoft Graph subscriptions
 */
export async function setupOutlookSubscription(accessToken: string, userId: string): Promise<{ expiration: Date }> {
  console.log('[Email] Would setup Outlook subscription for user:', userId);
  
  // In production:
  // - Call POST /subscriptions
  // - Configure notification URL
  // - Store subscription ID
  
  return {
    expiration: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days (max for Outlook)
  };
}
