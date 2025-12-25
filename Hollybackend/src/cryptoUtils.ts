import crypto from 'crypto';

let cachedKey: Buffer | null | undefined;

function getKey() {
  if (cachedKey !== undefined) return cachedKey;

  const secret = process.env.AES_SECRET?.trim();
  if (!secret || secret.length < 32) {
    cachedKey = null;
    return cachedKey;
  }

  cachedKey = crypto.scryptSync(secret, 'hollyship-salt', 32);
  return cachedKey;
}

export function isCryptoConfigured() {
  return Boolean(getKey());
}

export function encryptField(value: string) {
  const key = getKey();
  if (!key) {
    throw new Error('AES_SECRET is not configured (must be at least 32 characters)');
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptField(payload: string) {
  const key = getKey();
  if (!key) {
    throw new Error('AES_SECRET is not configured (must be at least 32 characters)');
  }

  const buffer = Buffer.from(payload, 'base64');
  const iv = buffer.subarray(0, 16);
  const tag = buffer.subarray(16, 32);
  const encrypted = buffer.subarray(32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const result = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return result.toString('utf8');
}