import { prisma } from './prisma.js';
import crypto from 'crypto';

const CODE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const pendingEmailCodes = new Map<string, { code: string; expiresAt: number }>();
const oauthUserMap = new Map<string, string>();
const sessions = new Map<string, { userId: string; expiresAt: number; lastSeenAt: number }>();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken() {
  // 32 bytes = 256 bits
  return crypto.randomBytes(32).toString('base64url');
}

export function createEmailCode(email: string) {
  const normalized = normalizeEmail(email);
  const code = generateCode();
  const expiresAt = Date.now() + CODE_TTL_MS;
  pendingEmailCodes.set(normalized, { code, expiresAt });
  return { code, expiresAt: new Date(expiresAt).toISOString() };
}

export function verifyEmailCode(email: string, code: string) {
  const normalized = normalizeEmail(email);
  const record = pendingEmailCodes.get(normalized);
  if (!record) return false;
  if (record.expiresAt < Date.now()) {
    pendingEmailCodes.delete(normalized);
    return false;
  }
  if (record.code !== code) return false;
  pendingEmailCodes.delete(normalized);
  return true;
}

export async function ensureUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const user = await prisma.user.upsert({
    where: { email: normalized },
    create: { email: normalized },
    update: {},
  });
  return user;
}

export async function ensureOAuthUser(provider: 'google' | 'apple', providerId: string, email?: string) {
  const key = `${provider}:${providerId}`;
  const cachedId = oauthUserMap.get(key);
  if (cachedId) {
    const existing = await prisma.user.findUnique({ where: { id: cachedId } });
    if (existing) return existing;
  }

  let user;
  if (email) {
    const normalized = normalizeEmail(email);
    user = await prisma.user.upsert({
      where: { email: normalized },
      create: { email: normalized },
      update: {},
    });
  } else {
    user = await prisma.user.create({ data: {} });
  }

  oauthUserMap.set(key, user.id);
  return user;
}

export function createSession(userId: string) {
  const token = generateToken();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, { userId, expiresAt, lastSeenAt: Date.now() });
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

export function getUserIdForSessionToken(token: string) {
  const record = sessions.get(token);
  if (!record) return null;
  if (record.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }

  record.lastSeenAt = Date.now();
  sessions.set(token, record);
  return record.userId;
}

export function revokeSessionsForUser(userId: string) {
  for (const [token, record] of sessions.entries()) {
    if (record.userId === userId) sessions.delete(token);
  }
}

export { CODE_TTL_MS };