import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { z } from 'zod';
import { prisma } from './prisma.js';
import type { Prisma } from '@prisma/client';
import { tierForPoints } from './loyalty.js';
import { guessCarrierFromTrackingNumber, detectCarriers, probeCarriers } from './carrierResolver.js';
import { aggregateCarriers } from './aggregator.js';
import { coordsForDestination, coordsForOrigin, interpolateLatLng, progressForStatus, predictEtaDate } from './geo.js';
import { allowRequest, keyFromReq } from './rateLimit.js';
import {
  createEmailCode,
  verifyEmailCode,
  ensureUserByEmail,
  ensureOAuthUser,
  createSession,
  getUserIdForSessionToken,
  revokeSessionsForUser,
} from './auth.js';
import { decryptField, encryptField, isCryptoConfigured } from './cryptoUtils.js';
import { startPollingJob, getJobStatus } from './jobs.js';
import {
  getGmailAuthUrl,
  getOutlookAuthUrl,
  exchangeGmailCode,
  exchangeOutlookCode,
  setupGmailWatch,
  setupOutlookSubscription,
} from './emailIngestion.js';
import {
  extractFromShopify,
  extractFromWooCommerce,
  validateShopifyWebhook,
  validateWooCommerceWebhook,
  detectPlatform,
} from './ecommerce.js';
import {
  getNotificationPreferences,
  getNotificationPreference,
  upsertNotificationPreference,
  updateNotificationPreference,
  deleteNotificationPreference,
  CreateNotificationPreferenceSchema,
  UpdateNotificationPreferenceSchema,
  NotificationMethodSchema,
} from './notificationPreferences.js';

const PORT = Number(process.env.PORT || 8080);

const CanonicalStatus = z.enum([
  'CREATED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELAYED',
  'ACTION_REQUIRED',
  'FAILURE',
]);

type CanonicalStatus = z.infer<typeof CanonicalStatus>;

const CREATED_EVENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const createdShipmentTimes: number[] = [];

function trackShipmentCreated(ts: number) {
  createdShipmentTimes.push(ts);
  const cutoff = ts - CREATED_EVENT_WINDOW_MS;
  while (createdShipmentTimes.length && createdShipmentTimes[0] < cutoff) {
    createdShipmentTimes.shift();
  }
}

function countCreatedSince(msAgo: number) {
  const now = Date.now();
  const cutoff = now - msAgo;
  let count = 0;
  for (let i = createdShipmentTimes.length - 1; i >= 0; i -= 1) {
    if (createdShipmentTimes[i] >= cutoff) count += 1;
    else break;
  }
  return count;
}

function startOfDayUtc(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function startOfWeekUtc(now: Date) {
  // Monday-start week (ISO-like)
  const day = now.getUTCDay();
  const diff = (day + 6) % 7;
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function monthStartUtc(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function truncateToMinuteUtc(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), 0, 0));
}

async function checkDailyAccrualCap(userId: string, pointsToAdd: number): Promise<boolean> {
  const dailyCap = Number(process.env.DAILY_POINTS_CAP || 500);
  const today = startOfDayUtc(new Date());
  
  const dailyTotal = await prisma.loyaltyLedger.aggregate({
    where: {
      userId,
      createdAt: { gte: today },
    },
    _sum: { points: true },
  });

  const currentPoints = dailyTotal._sum.points ?? 0;
  return (currentPoints + pointsToAdd) <= dailyCap;
}

async function computeStatsSnapshot() {
  const now = new Date();
  const startDay = startOfDayUtc(now);
  const startWeek = startOfWeekUtc(now);
  const startMau = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [today, week, mauGroups] = await prisma.$transaction([
    prisma.shipment.count({ where: { createdAt: { gte: startDay } } }),
    prisma.shipment.count({ where: { createdAt: { gte: startWeek } } }),
    prisma.shipment.groupBy({
      by: ['userId'],
      where: { userId: { not: null }, createdAt: { gte: startMau } },
      orderBy: { userId: 'asc' },
    }),
  ]);

  return {
    ts: now.toISOString(),
    shipmentsPerMinute: countCreatedSince(60_000),
    shipmentsPerHour: countCreatedSince(60 * 60_000),
    shipmentsToday: today,
    shipmentsWeek: week,
    mau: Array.isArray(mauGroups) ? mauGroups.length : 0,
  };
}

function extractNewTrackingFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  const candidates = [
    p.newTracking,
    p.newTrackingNumber,
    p.handoffTracking,
    p.handoffTrackingNumber,
    p.nextTracking,
    p.nextTrackingNumber,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length >= 3) return c.trim();
  }
  return null;
}

async function ensureCarrierByName(tx: Prisma.TransactionClient, carrierName: string) {
  const carrierCode = carrierName.toLowerCase().replace(/\s+/g, '_');
  return tx.carrier.upsert({
    where: { code: carrierCode },
    create: { code: carrierCode, name: carrierName, apiSource: 'manual' },
    update: { name: carrierName },
  });
}

async function addTrackingChainLink(
  tx: Prisma.TransactionClient,
  shipmentId: string,
  carrierId: string | null,
  trackingNumber: string,
) {
  const existingCurrent = await tx.trackingChain.findFirst({
    where: { shipmentId, isCurrent: true },
    orderBy: { handoffIndex: 'desc' },
  });

  const nextIndex = existingCurrent ? existingCurrent.handoffIndex + 1 : 0;

  // Mark all as not current, then mark the new one current.
  await tx.trackingChain.updateMany({ where: { shipmentId, isCurrent: true }, data: { isCurrent: false } });

  // Prisma unique inputs don't accept `null` for nullable fields in composite keys.
  // Handle the null-carrier case manually.
  if (!carrierId) {
    const existing = await tx.trackingChain.findFirst({ where: { shipmentId, carrierId: null, trackingNumber } });
    if (existing) {
      return tx.trackingChain.update({ where: { id: existing.id }, data: { isCurrent: true } });
    }

    return tx.trackingChain.create({
      data: {
        shipmentId,
        carrierId: null,
        trackingNumber,
        handoffIndex: nextIndex,
        isCurrent: true,
      },
    });
  }

  return tx.trackingChain.upsert({
    where: {
      shipmentId_carrierId_trackingNumber: {
        shipmentId,
        carrierId,
        trackingNumber,
      },
    },
    create: {
      shipmentId,
      carrierId,
      trackingNumber,
      handoffIndex: nextIndex,
      isCurrent: true,
    },
    update: {
      isCurrent: true,
    },
  });
}

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

await server.register(cors, {
  origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
});

await server.register(swagger, {
  openapi: {
    info: {
      title: 'HollyShip API',
      version: '0.1.0',
    },
  },
});

await server.register(swaggerUi, {
  routePrefix: '/docs',
});

server.get('/health', async () => {
  return { ok: true, service: 'hollyship-backend', time: new Date().toISOString() };
});

server.get('/v1/jobs/status', async () => {
  const status = getJobStatus();
  return {
    ok: true,
    jobs: {
      polling: status,
    },
  };
});

server.get('/v1/stats/stream', async (req, reply) => {
  reply.raw.setHeader('content-type', 'text/event-stream; charset=utf-8');
  reply.raw.setHeader('cache-control', 'no-cache, no-transform');
  reply.raw.setHeader('connection', 'keep-alive');
  reply.raw.setHeader('x-accel-buffering', 'no');

  const writeEvent = (data: unknown) => {
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Initial payload
  try {
    writeEvent(await computeStatsSnapshot());
  } catch {
    writeEvent({ ok: false });
  }

  const interval = setInterval(async () => {
    try {
      writeEvent(await computeStatsSnapshot());
    } catch {
      // keep connection open
    }
  }, 2000);

  req.raw.on('close', () => {
    clearInterval(interval);
  });

  return reply;
});

function parseBearerToken(req: { headers: Record<string, unknown> }) {
  const raw = req.headers['authorization'];
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (typeof header !== 'string') return null;

  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return match[1] ?? null;
}

function getAuthUserId(req: { headers: Record<string, unknown> }) {
  const token = parseBearerToken(req);
  if (!token) return null;
  return getUserIdForSessionToken(token);
}

function requireAuthUserId(req: { headers: Record<string, unknown> }, reply: any) {
  const userId = getAuthUserId(req);
  if (!userId) {
    reply.code(401).send({ ok: false, error: 'Unauthorized' });
    return null;
  }
  return userId;
}

server.post('/v1/auth/email/start', async (req, reply) => {
  const body = z.object({ email: z.string().min(3).email().max(254) }).parse(req.body);
  const payload = createEmailCode(body.email);
  return reply.send({ ok: true, code: payload.code, expiresAt: payload.expiresAt });
});

server.post('/v1/auth/email/verify', async (req, reply) => {
  const body = z
    .object({ email: z.string().min(3).email().max(254), code: z.string().regex(/^\d{6}$/) })
    .parse(req.body);

  const isValid = verifyEmailCode(body.email, body.code);
  if (!isValid) {
    return reply.code(400).send({ ok: false, error: 'Invalid or expired code' });
  }

  const user = await ensureUserByEmail(body.email);
  const session = createSession(user.id);
  return reply.send({ ok: true, userId: user.id, email: user.email, token: session.token, expiresAt: session.expiresAt });
});

server.post('/v1/auth/oauth', async (req, reply) => {
  const body = z
    .object({
      provider: z.enum(['google', 'apple']),
      providerId: z.string().min(3),
      email: z.string().email().max(254).optional(),
    })
    .parse(req.body);

  const user = await ensureOAuthUser(body.provider, body.providerId, body.email);
  const session = createSession(user.id);
  return reply.send({
    ok: true,
    userId: user.id,
    email: user.email ?? null,
    provider: body.provider,
    token: session.token,
    expiresAt: session.expiresAt,
  });
});

server.post('/v1/shipments/resolve', async (req, reply) => {
  const bodySchema = z.object({
    trackingNumber: z.string().min(3),
    hintCarrier: z.string().min(1).nullable().optional(),
    label: z.string().min(1).max(120).nullable().optional(),
    destination: z.string().min(2).max(120).nullable().optional(),
    userId: z.string().uuid().optional(),
    orderNumber: z.string().min(1).max(64).nullable().optional(),
  });

  const body = bodySchema.parse(req.body);
  const authUserId = getAuthUserId(req);

  if (authUserId && body.userId && body.userId !== authUserId) {
    return reply.code(403).send({ ok: false, error: 'Forbidden' });
  }

  const effectiveUserId = authUserId ?? body.userId ?? null;

  const origins = ['Memphis, TN Hub', 'Los Angeles, CA', 'Chicago, IL', 'Dallas, TX', 'Atlanta, GA'];
  const origin = origins[Math.floor(Math.random() * origins.length)] ?? 'Memphis, TN Hub';

  const originCoords = coordsForOrigin(origin);
  const destCoords = coordsForDestination(body.destination ?? null, body.trackingNumber);

  // Minimal resolver:
  // - If hintCarrier is provided and not AUTO, trust it.
  // - If hintCarrier is AUTO (or null), try regex-based guessing.
  const hint = body.hintCarrier ?? null;
  const normalizedHint = hint ? hint.trim() : null;
  const isAuto = !normalizedHint || normalizedHint.toUpperCase() === 'AUTO';

  const guessed = isAuto ? guessCarrierFromTrackingNumber(body.trackingNumber) : null;
  const carrierName = isAuto ? (guessed?.name ?? null) : normalizedHint;

  const now = new Date();
  const periodStart = monthStartUtc(now);

  const shipment = await prisma.$transaction(async (tx) => {
    // Quota enforcement is only for authenticated users.
    if (authUserId) {
      const user = await tx.user.findUnique({ where: { id: authUserId } });
      if (!user) {
        // Shouldn't happen, but keep it safe.
        throw Object.assign(new Error('Unauthorized'), { code: 'UNAUTH' });
      }

      const meter = await tx.usageMeter.upsert({
        where: { userId_periodStart: { userId: authUserId, periodStart } },
        create: { userId: authUserId, periodStart, shipmentsTracked: 0 },
        update: {},
      });

      if (meter.shipmentsTracked >= user.quotaMonth) {
        throw Object.assign(new Error('Quota exceeded. Upgrade plan.'), { code: 'QUOTA' });
      }

      await tx.usageMeter.update({
        where: { userId_periodStart: { userId: authUserId, periodStart } },
        data: { shipmentsTracked: { increment: 1 } },
      });
    }

    let carrierId: string | null = null;
    if (carrierName) {
      const carrier = await ensureCarrierByName(tx, carrierName);
      carrierId = carrier.id;
    }

    // Predict ETA at creation when possible
    const predictedEta = predictEtaDate(originCoords, destCoords, carrierName, body.trackingNumber)

    const created = await tx.shipment.create({
      data: {
        userId: effectiveUserId,
        label: body.label ?? null,
        trackingNumber: body.trackingNumber,
        carrierId,
        status: 'CREATED',
        origin,
        originLat: originCoords.lat,
        originLng: originCoords.lng,
        destination: body.destination ?? null,
        destinationLat: destCoords.lat,
        destinationLng: destCoords.lng,
        currentLat: originCoords.lat,
        currentLng: originCoords.lng,
        lastEventAt: now,
        eta: predictedEta,
        orderNumberEncrypted:
          body.orderNumber && isCryptoConfigured() ? encryptField(body.orderNumber) : (body.orderNumber ?? null),
      },
      include: { carrier: true },
    });

    await tx.trackingEvent.create({
      data: {
        shipmentId: created.id,
        canonicalStatus: 'CREATED',
        eventTime: now,
        carrierStatus: null,
        location: origin,
      },
    });

    await tx.trackingChain.create({
      data: {
        shipmentId: created.id,
        carrierId,
        trackingNumber: created.trackingNumber,
        handoffIndex: 0,
        isCurrent: true,
      },
    });

    return created;
  });

  trackShipmentCreated(Date.now());

  return reply.send({
    id: shipment.id,
    label: shipment.label ?? null,
    trackingNumber: shipment.trackingNumber,
    carrier: shipment.carrier?.name ?? null,
    status: shipment.status,
    userId: shipment.userId ?? null,
    eta: shipment.eta?.toISOString() ?? null,
    origin: shipment.origin ?? null,
    originLat: shipment.originLat ?? null,
    originLng: shipment.originLng ?? null,
    destination: shipment.destination ?? null,
    destinationLat: shipment.destinationLat ?? null,
    destinationLng: shipment.destinationLng ?? null,
    currentLat: shipment.currentLat ?? null,
    currentLng: shipment.currentLng ?? null,
    lastEventAt: shipment.lastEventAt?.toISOString() ?? null,
    createdAt: shipment.createdAt.toISOString(),
  });
});

server.get('/v1/carriers/detect', async (req, reply) => {
  if (!allowRequest(keyFromReq(req, 'rl:detect'), 120, 2)) {
    return reply.code(429).send({ ok: false, error: 'Too many requests' });
  }
  const querySchema = z.object({
    trackingNumber: z.string().min(3),
    limit: z.coerce.number().int().min(1).max(10).optional(),
  });

  const { trackingNumber, limit } = querySchema.parse(req.query);
  const candidates = detectCarriers(trackingNumber, limit ?? 5);

  return reply.send({
    ok: true,
    trackingNumber: trackingNumber.trim(),
    candidates,
  });
});

server.get('/v1/carriers/probe', async (req, reply) => {
  if (!allowRequest(keyFromReq(req, 'rl:probe'), 90, 1)) {
    return reply.code(429).send({ ok: false, error: 'Too many requests' });
  }
  const querySchema = z.object({
    trackingNumber: z.string().min(3),
    limit: z.coerce.number().int().min(1).max(10).optional(),
  });

  const { trackingNumber, limit } = querySchema.parse(req.query);
  const candidates = probeCarriers(trackingNumber, limit ?? 5);

  return reply.send({
    ok: true,
    trackingNumber: trackingNumber.trim(),
    candidates,
  });
});
// Per-carrier fallback probe: query aggregator with a carrier hint; fallback to local filtered by code
server.get('/v1/carriers/:code/probe', async (req, reply) => {
  if (!allowRequest(keyFromReq(req, 'rl:probe:code'), 60, 1)) {
    return reply.code(429).send({ ok: false, error: 'Too many requests' });
  }
  const paramsSchema = z.object({ code: z.string().min(2).max(40) })
  const querySchema = z.object({
    trackingNumber: z.string().min(3),
    limit: z.coerce.number().int().min(1).max(10).optional(),
  })
  const { code } = paramsSchema.parse(req.params)
  const { trackingNumber, limit } = querySchema.parse(req.query)

  const result = await aggregateCarriers(trackingNumber, limit ?? 5, code)
  let candidates = result.candidates
  // Local fallback filter: restrict to code match when using local
  if (result.source === 'local') {
    const lc = code.toLowerCase()
    candidates = candidates.filter(c => (c.code || '').toLowerCase() === lc)
  }
  return reply.send({ ok: true, source: result.source, trackingNumber: trackingNumber.trim(), code, candidates })
})

// Per-carrier detect (regex-only) restricted filter
server.get('/v1/carriers/:code/detect', async (req, reply) => {
  if (!allowRequest(keyFromReq(req, 'rl:detect:code'), 120, 2)) {
    return reply.code(429).send({ ok: false, error: 'Too many requests' });
  }
  const paramsSchema = z.object({ code: z.string().min(2).max(40) })
  const querySchema = z.object({
    trackingNumber: z.string().min(3),
    limit: z.coerce.number().int().min(1).max(10).optional(),
  })
  const { code } = paramsSchema.parse(req.params)
  const { trackingNumber, limit } = querySchema.parse(req.query)
  const lc = code.toLowerCase()
  const all = detectCarriers(trackingNumber, limit ?? 5)
  const candidates = all.filter(c => (c.code || '').toLowerCase() === lc)
  return reply.send({ ok: true, trackingNumber: trackingNumber.trim(), code, candidates })
})

// Optional external aggregator — falls back to local probe if not configured
server.get('/v1/carriers/aggregate', async (req, reply) => {
  if (!allowRequest(keyFromReq(req, 'rl:aggregate'), 60, 1)) {
    return reply.code(429).send({ ok: false, error: 'Too many requests' });
  }
  const querySchema = z.object({
    trackingNumber: z.string().min(3),
    limit: z.coerce.number().int().min(1).max(10).optional(),
  });

  const { trackingNumber, limit } = querySchema.parse(req.query);
  const result = await aggregateCarriers(trackingNumber, limit ?? 5);
  return reply.send({ ok: result.ok, source: result.source, trackingNumber: trackingNumber.trim(), candidates: result.candidates });
});

server.get('/v1/shipments/:id/chain', async (req, reply) => {
  const paramsSchema = z.object({ id: z.string().uuid() });
  const { id } = paramsSchema.parse(req.params);

  const authUserId = getAuthUserId(req);

  const shipment = await prisma.shipment.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!shipment) return reply.code(404).send({ ok: false, error: 'Not found' });
  if (authUserId && shipment.userId && shipment.userId !== authUserId) {
    return reply.code(403).send({ ok: false, error: 'Forbidden' });
  }

  const links = await prisma.trackingChain.findMany({
    where: { shipmentId: id },
    orderBy: [{ handoffIndex: 'asc' }],
    include: { carrier: true },
  });

  return reply.send({
    ok: true,
    shipmentId: id,
    items: links.map((l) => ({
      id: l.id.toString(),
      carrier: l.carrier?.name ?? null,
      trackingNumber: l.trackingNumber,
      handoffIndex: l.handoffIndex,
      isCurrent: l.isCurrent,
      createdAt: l.createdAt.toISOString(),
    })),
  });
});

server.get('/v1/shipments', async (req, reply) => {
  const querySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(30),
    userId: z.string().uuid().optional(),
  });

  const { limit, userId } = querySchema.parse(req.query);
  const authUserId = getAuthUserId(req);

  if (authUserId && userId && userId !== authUserId) {
    return reply.code(403).send({ ok: false, error: 'Forbidden' });
  }

  const effectiveUserId = authUserId ?? userId;

  const shipments = await prisma.shipment.findMany({
    where: effectiveUserId ? { userId: effectiveUserId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      carrier: true,
      events: { orderBy: { eventTime: 'desc' }, take: 10 },
    },
  });

  return reply.send({
    items: shipments.map((s) => ({
      id: s.id,
      label: s.label ?? null,
      trackingNumber: s.trackingNumber,
      carrier: s.carrier?.name ?? null,
      status: s.status,
      userId: s.userId ?? null,
      eta: s.eta?.toISOString() ?? null,
      origin: s.origin ?? null,
      originLat: s.originLat ?? null,
      originLng: s.originLng ?? null,
      destination: s.destination ?? null,
      destinationLat: s.destinationLat ?? null,
      destinationLng: s.destinationLng ?? null,
      currentLat: s.currentLat ?? null,
      currentLng: s.currentLng ?? null,
      lastEventAt: s.lastEventAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      events: s.events.map((e) => ({
        id: e.id.toString(),
        canonicalStatus: e.canonicalStatus,
        carrierStatus: e.carrierStatus ?? null,
        location: e.location ?? null,
        eventTime: e.eventTime.toISOString(),
      })),
    })),
  });
});

server.get('/v1/shipments/:id', async (req, reply) => {
  const paramsSchema = z.object({ id: z.string().uuid() });
  const { id } = paramsSchema.parse(req.params);

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: { carrier: true, events: { orderBy: { eventTime: 'desc' }, take: 20 } },
  });

  if (!shipment) return reply.code(404).send({ error: 'Not found' });

  return reply.send({
    id: shipment.id,
    label: shipment.label ?? null,
    trackingNumber: shipment.trackingNumber,
    carrier: shipment.carrier?.name ?? null,
    status: shipment.status,
    eta: shipment.eta?.toISOString() ?? null,
    origin: shipment.origin ?? null,
    originLat: shipment.originLat ?? null,
    originLng: shipment.originLng ?? null,
    destination: shipment.destination ?? null,
    destinationLat: shipment.destinationLat ?? null,
    destinationLng: shipment.destinationLng ?? null,
    currentLat: shipment.currentLat ?? null,
    currentLng: shipment.currentLng ?? null,
    lastEventAt: shipment.lastEventAt?.toISOString() ?? null,
    createdAt: shipment.createdAt.toISOString(),
    events: shipment.events.map((e) => ({
      id: e.id.toString(),
      canonicalStatus: e.canonicalStatus,
      carrierStatus: e.carrierStatus ?? null,
      location: e.location ?? null,
      eventTime: e.eventTime.toISOString(),
    })),
  });
});

server.delete('/v1/shipments/:id', async (req, reply) => {
  const paramsSchema = z.object({ id: z.string().uuid() });
  const { id } = paramsSchema.parse(req.params);

  const authUserId = getAuthUserId(req);

  const existing = await prisma.shipment.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!existing) return reply.code(404).send({ error: 'Not found' });
  if (authUserId && existing.userId && existing.userId !== authUserId) {
    return reply.code(403).send({ ok: false, error: 'Forbidden' });
  }

  await prisma.$transaction([
    prisma.trackingEvent.deleteMany({ where: { shipmentId: id } }),
    prisma.loyaltyLedger.deleteMany({ where: { shipmentId: id } }),
    prisma.shipment.delete({ where: { id } }),
  ]);

  return reply.send({ deleted: true });
});

server.post('/v1/shipments/:id/refresh', async (req, reply) => {
  const paramsSchema = z.object({ id: z.string().uuid() });
  paramsSchema.parse(req.params);

  // MVP stub: accept request; later enqueue job.
  return reply.code(202).send({ accepted: true });
});

server.get('/v1/users/:id/loyalty', async (req, reply) => {
  const paramsSchema = z.object({ id: z.string().uuid() });
  const { id } = paramsSchema.parse(req.params);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return reply.code(404).send({ error: 'Not found' });

  const agg = await prisma.loyaltyLedger.aggregate({
    where: { userId: id },
    _sum: { points: true },
  });

  const points = agg._sum.points ?? 0;
  const tier = tierForPoints(points);

  return reply.send({ userId: id, points, tier });
});

server.post('/v1/loyalty/redeem', async (req, reply) => {
  const bodySchema = z.object({ couponId: z.string().uuid() });
  bodySchema.parse(req.body);

  // MVP stub: implement points check + redemption later.
  return reply.send({ redeemed: false });
});

server.post('/v1/connect/email/gmail', async (req, reply) => {
  const authUserId = getAuthUserId(req);
  
  try {
    // Generate state parameter for CSRF protection
    const state = authUserId || 'anonymous';
    const authUrl = getGmailAuthUrl(state);
    
    return reply.send({
      ok: true,
      provider: 'gmail',
      authUrl,
      message: 'Redirect user to authUrl to complete OAuth flow',
    });
  } catch (error: any) {
    return reply.code(500).send({
      ok: false,
      provider: 'gmail',
      error: error.message || 'Gmail OAuth not configured',
    });
  }
});

server.get('/v1/connect/email/gmail/callback', async (req, reply) => {
  const querySchema = z.object({
    code: z.string().min(1),
    state: z.string().optional(),
  });

  try {
    const { code, state } = querySchema.parse(req.query);
    const tokens = await exchangeGmailCode(code);
    
    // In production, we would:
    // 1. Store tokens securely in database
    // 2. Set up Gmail watch/webhook
    // 3. Start fetching and parsing emails
    
    return reply.send({
      ok: true,
      provider: 'gmail',
      message: 'Gmail connected successfully (stub)',
      expiresAt: tokens.expiresAt.toISOString(),
    });
  } catch (error: any) {
    return reply.code(400).send({
      ok: false,
      provider: 'gmail',
      error: error.message || 'Invalid authorization code',
    });
  }
});

server.post('/v1/connect/email/outlook', async (req, reply) => {
  const authUserId = getAuthUserId(req);
  
  try {
    // Generate state parameter for CSRF protection
    const state = authUserId || 'anonymous';
    const authUrl = getOutlookAuthUrl(state);
    
    return reply.send({
      ok: true,
      provider: 'outlook',
      authUrl,
      message: 'Redirect user to authUrl to complete OAuth flow',
    });
  } catch (error: any) {
    return reply.code(500).send({
      ok: false,
      provider: 'outlook',
      error: error.message || 'Outlook OAuth not configured',
    });
  }
});

server.get('/v1/connect/email/outlook/callback', async (req, reply) => {
  const querySchema = z.object({
    code: z.string().min(1),
    state: z.string().optional(),
  });

  try {
    const { code, state } = querySchema.parse(req.query);
    const tokens = await exchangeOutlookCode(code);
    
    // In production, we would:
    // 1. Store tokens securely in database
    // 2. Set up Outlook subscription/webhook
    // 3. Start fetching and parsing emails
    
    return reply.send({
      ok: true,
      provider: 'outlook',
      message: 'Outlook connected successfully (stub)',
      expiresAt: tokens.expiresAt.toISOString(),
    });
  } catch (error: any) {
    return reply.code(400).send({
      ok: false,
      provider: 'outlook',
      error: error.message || 'Invalid authorization code',
    });
  }
});

// Demo endpoint to simulate a status transition + points accrual.
// This helps wire UI quickly without a real carrier provider.
server.post('/v1/shipments/:id/simulate-status', async (req, reply) => {
  const paramsSchema = z.object({ id: z.string().uuid() });
  const bodySchema = z.object({
    status: CanonicalStatus,
    userId: z.string().uuid().optional(),
    payload: z.unknown().optional(),
  });

  const { id } = paramsSchema.parse(req.params);
  const { status, userId, payload } = bodySchema.parse(req.body);

  const authUserId = getAuthUserId(req);
  if (authUserId && userId && userId !== authUserId) {
    return reply.code(403).send({ ok: false, error: 'Forbidden' });
  }

  const existing = await prisma.shipment.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      originLat: true,
      originLng: true,
      destinationLat: true,
      destinationLng: true,
    },
  });

  if (authUserId && existing?.userId && existing.userId !== authUserId) {
    return reply.code(403).send({ ok: false, error: 'Forbidden' });
  }

  const shipmentCoords =
    existing?.originLat != null &&
    existing?.originLng != null &&
    existing?.destinationLat != null &&
    existing?.destinationLng != null
      ? interpolateLatLng(
          { lat: existing.originLat, lng: existing.originLng },
          { lat: existing.destinationLat, lng: existing.destinationLng },
          progressForStatus(status),
        )
      : null;

  const now = new Date();

  const shipment = await prisma.$transaction(async (tx) => {
    const updated = await tx.shipment.update({
      where: { id },
      data: {
        status: status as unknown as CanonicalStatus,
        currentLat: shipmentCoords?.lat ?? undefined,
        currentLng: shipmentCoords?.lng ?? undefined,
        lastEventAt: now,
      },
    });

    const normalizedPayload = payload == null ? undefined : (payload as Prisma.InputJsonValue);

    const event = await tx.trackingEvent.create({
      data: {
        shipmentId: updated.id,
        canonicalStatus: status as unknown as CanonicalStatus,
        eventTime: now,
        carrierStatus: null,
        location: null,
        ...(normalizedPayload !== undefined ? { payload: normalizedPayload } : {}),
      },
    });

    const newTracking = extractNewTrackingFromPayload(event.payload);
    if (newTracking) {
      const guessedCarrier = guessCarrierFromTrackingNumber(newTracking);
      const nextCarrierName = guessedCarrier?.name ?? null;
      const nextCarrierId = nextCarrierName ? (await ensureCarrierByName(tx, nextCarrierName)).id : null;

      await addTrackingChainLink(tx, updated.id, nextCarrierId, newTracking);

      await tx.shipment.update({
        where: { id: updated.id },
        data: {
          trackingNumber: newTracking,
          carrierId: nextCarrierId,
        },
      });
    }

    return updated;
  });

  // Minimal rewards accrual:
  // - +25 IN_TRANSIT
  // - +50 DELIVERED
  // Requires userId for now.
  const effectiveUserId = authUserId ?? userId;
  if (effectiveUserId && (status === 'IN_TRANSIT' || status === 'DELIVERED')) {
    const points = status === 'IN_TRANSIT' ? 25 : 50;
    const reason = status;

    await prisma.user.upsert({
      where: { id: effectiveUserId },
      create: { id: effectiveUserId },
      update: {},
    });

    // Check daily accrual cap before awarding points
    const canAccrue = await checkDailyAccrualCap(effectiveUserId, points);
    if (canAccrue) {
      await prisma.loyaltyLedger.upsert({
        where: {
          userId_shipmentId_reason: {
            userId: effectiveUserId,
            shipmentId: shipment.id,
            reason,
          },
        },
        create: { userId: effectiveUserId, shipmentId: shipment.id, reason, points },
        update: {},
      });
    }
  }

  return reply.send({ ok: true });
});

// Webhook receiver for tracking updates from external providers
// Supports generic payload format from aggregators like AfterShip, 17TRACK, EasyPost, Shippo
server.post('/v1/webhooks/tracking', async (req, reply) => {
  // Validate webhook signature if configured
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers['x-webhook-signature'];
    // Use timing-safe comparison to prevent timing attacks
    if (!signature || typeof signature !== 'string') {
      return reply.code(401).send({ ok: false, error: 'Invalid signature' });
    }
    
    // Import crypto for timing-safe comparison
    const crypto = await import('crypto');
    const expectedBuffer = Buffer.from(webhookSecret);
    const actualBuffer = Buffer.from(signature);
    
    // Ensure same length to prevent timing attacks
    if (expectedBuffer.length !== actualBuffer.length) {
      return reply.code(401).send({ ok: false, error: 'Invalid signature' });
    }
    
    if (!crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
      return reply.code(401).send({ ok: false, error: 'Invalid signature' });
    }
  }

  const bodySchema = z.object({
    trackingNumber: z.string().min(3),
    carrier: z.string().optional(),
    status: z.string(),
    location: z.string().optional(),
    timestamp: z.string().optional(),
    metadata: z.unknown().optional(),
  });

  const body = bodySchema.parse(req.body);
  
  // Find shipment by tracking number
  const shipment = await prisma.shipment.findFirst({
    where: { trackingNumber: body.trackingNumber },
    include: { carrier: true },
  });

  if (!shipment) {
    return reply.code(404).send({ ok: false, error: 'Shipment not found' });
  }

  // Map carrier status to canonical status
  const statusMapping: Record<string, CanonicalStatus> = {
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

  const normalizedStatus = body.status.toLowerCase().replace(/[\s-]/g, '_');
  const canonicalStatus = statusMapping[normalizedStatus] || 'CREATED';
  
  // Validate and parse timestamp to prevent Invalid Date
  let eventTime = new Date();
  if (body.timestamp) {
    const parsedTime = new Date(body.timestamp);
    if (!isNaN(parsedTime.getTime())) {
      eventTime = parsedTime;
    }
  }

  // Update shipment and create event
  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        status: canonicalStatus,
        lastEventAt: eventTime,
      },
    });

    await tx.trackingEvent.create({
      data: {
        shipmentId: shipment.id,
        canonicalStatus,
        carrierStatus: body.status,
        location: body.location ?? null,
        eventTime,
        payload: body.metadata as any,
      },
    });

    // Award loyalty points if applicable (with daily cap check)
    if (shipment.userId && (canonicalStatus === 'IN_TRANSIT' || canonicalStatus === 'DELIVERED')) {
      const points = canonicalStatus === 'IN_TRANSIT' ? 25 : 50;
      const reason = canonicalStatus;

      // Check daily cap before awarding
      const canAccrue = await checkDailyAccrualCap(shipment.userId, points);
      if (canAccrue) {
        await tx.loyaltyLedger.upsert({
          where: {
            userId_shipmentId_reason: {
              userId: shipment.userId,
              shipmentId: shipment.id,
              reason,
            },
          },
          create: { userId: shipment.userId, shipmentId: shipment.id, reason, points },
          update: {},
        });
      }
    }
  });

  return reply.send({ ok: true, status: canonicalStatus });
});

// Shopify webhook receiver
server.post('/v1/webhooks/shopify/orders', async (req, reply) => {
  const shopifySecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  
  // Validate webhook signature
  if (shopifySecret) {
    const hmac = req.headers['x-shopify-hmac-sha256'];
    if (!hmac || typeof hmac !== 'string') {
      return reply.code(401).send({ ok: false, error: 'Missing signature' });
    }

    const rawBody = JSON.stringify(req.body);
    if (!validateShopifyWebhook(rawBody, hmac, shopifySecret)) {
      return reply.code(401).send({ ok: false, error: 'Invalid signature' });
    }
  }

  try {
    const shipments = extractFromShopify(req.body);
    
    if (shipments.length === 0) {
      return reply.send({ ok: true, message: 'No tracking information found', created: 0 });
    }

    const created = [];
    for (const shipmentData of shipments) {
      // Find or create user by email
      let userId: string | null = null;
      if (shipmentData.userEmail) {
        const user = await ensureUserByEmail(shipmentData.userEmail);
        userId = user.id;
      }

      // Create shipment
      const guessed = guessCarrierFromTrackingNumber(shipmentData.trackingNumber);
      const carrierName = shipmentData.carrier || guessed?.name || null;
      
      let carrierId: string | null = null;
      if (carrierName) {
        const carrier = await prisma.carrier.upsert({
          where: { code: carrierName.toLowerCase().replace(/\s+/g, '_') },
          create: { code: carrierName.toLowerCase().replace(/\s+/g, '_'), name: carrierName, apiSource: 'shopify' },
          update: { name: carrierName },
        });
        carrierId = carrier.id;
      }

      const shipment = await prisma.shipment.create({
        data: {
          userId,
          label: shipmentData.items?.[0]?.name || shipmentData.orderNumber,
          trackingNumber: shipmentData.trackingNumber,
          carrierId,
          status: 'CREATED',
          lastEventAt: new Date(),
        },
      });

      await prisma.trackingEvent.create({
        data: {
          shipmentId: shipment.id,
          canonicalStatus: 'CREATED',
          eventTime: new Date(),
          carrierStatus: null,
          location: null,
        },
      });

      created.push(shipment.id);
    }

    return reply.send({ ok: true, created: created.length, shipmentIds: created });
  } catch (error: any) {
    console.error('[Shopify] Webhook processing error:', error);
    return reply.code(400).send({ ok: false, error: error.message || 'Invalid payload' });
  }
});

// WooCommerce webhook receiver
server.post('/v1/webhooks/woocommerce/orders', async (req, reply) => {
  const wooSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;
  
  // Validate webhook signature
  if (wooSecret) {
    const signature = req.headers['x-wc-webhook-signature'];
    if (!signature || typeof signature !== 'string') {
      return reply.code(401).send({ ok: false, error: 'Missing signature' });
    }

    const rawBody = JSON.stringify(req.body);
    if (!validateWooCommerceWebhook(rawBody, signature, wooSecret)) {
      return reply.code(401).send({ ok: false, error: 'Invalid signature' });
    }
  }

  try {
    const shipments = extractFromWooCommerce(req.body);
    
    if (shipments.length === 0) {
      return reply.send({ ok: true, message: 'No tracking information found', created: 0 });
    }

    const created = [];
    for (const shipmentData of shipments) {
      // Find or create user by email
      let userId: string | null = null;
      if (shipmentData.userEmail) {
        const user = await ensureUserByEmail(shipmentData.userEmail);
        userId = user.id;
      }

      // Create shipment
      const guessed = guessCarrierFromTrackingNumber(shipmentData.trackingNumber);
      const carrierName = shipmentData.carrier || guessed?.name || null;
      
      let carrierId: string | null = null;
      if (carrierName) {
        const carrier = await prisma.carrier.upsert({
          where: { code: carrierName.toLowerCase().replace(/\s+/g, '_') },
          create: { code: carrierName.toLowerCase().replace(/\s+/g, '_'), name: carrierName, apiSource: 'woocommerce' },
          update: { name: carrierName },
        });
        carrierId = carrier.id;
      }

      const shipment = await prisma.shipment.create({
        data: {
          userId,
          label: shipmentData.items?.[0]?.name || shipmentData.orderNumber,
          trackingNumber: shipmentData.trackingNumber,
          carrierId,
          status: 'CREATED',
          lastEventAt: new Date(),
        },
      });

      await prisma.trackingEvent.create({
        data: {
          shipmentId: shipment.id,
          canonicalStatus: 'CREATED',
          eventTime: new Date(),
          carrierStatus: null,
          location: null,
        },
      });

      created.push(shipment.id);
    }

    return reply.send({ ok: true, created: created.length, shipmentIds: created });
  } catch (error: any) {
    console.error('[WooCommerce] Webhook processing error:', error);
    return reply.code(400).send({ ok: false, error: error.message || 'Invalid payload' });
  }
});

// Persist stats rollups every minute (best-effort)
setInterval(async () => {
  try {
    const snapshot = await computeStatsSnapshot();
    const now = new Date();
    const ts = truncateToMinuteUtc(now);
    await prisma.statsRollup.upsert({
      where: { ts },
      create: {
        ts,
        shipmentsPerMinute: snapshot.shipmentsPerMinute,
        shipmentsPerHour: snapshot.shipmentsPerHour,
        shipmentsToday: snapshot.shipmentsToday,
        shipmentsWeek: snapshot.shipmentsWeek,
        mau: snapshot.mau,
      },
      update: {
        shipmentsPerMinute: snapshot.shipmentsPerMinute,
        shipmentsPerHour: snapshot.shipmentsPerHour,
        shipmentsToday: snapshot.shipmentsToday,
        shipmentsWeek: snapshot.shipmentsWeek,
        mau: snapshot.mau,
      },
    });
  } catch {
    // ignore
  }
}, 60_000);

// Consent management endpoints

// Get user's consent status for all types
server.get('/v1/me/consents', async (req, reply) => {
  const userId = requireAuthUserId(req, reply);
  if (!userId) return;

  const consents = await prisma.consent.findMany({
    where: { userId },
    orderBy: { consentType: 'asc' },
  });

  return reply.send({
    ok: true,
    consents: consents.map(c => ({
      type: c.consentType,
      granted: c.granted,
      grantedAt: c.grantedAt?.toISOString() ?? null,
      revokedAt: c.revokedAt?.toISOString() ?? null,
    })),
  });
});

// Grant or revoke consent
server.post('/v1/me/consents', async (req, reply) => {
  const userId = requireAuthUserId(req, reply);
  if (!userId) return;

  const bodySchema = z.object({
    consentType: z.enum(['email_scanning', 'data_processing', 'marketing']),
    granted: z.boolean(),
  });

  const { consentType, granted } = bodySchema.parse(req.body);

  // Extract IP and user agent for audit trail
  const ipAddress = req.headers['x-forwarded-for'] || req.ip || null;
  const userAgent = req.headers['user-agent'] || null;

  const now = new Date();

  const consent = await prisma.consent.upsert({
    where: {
      userId_consentType: { userId, consentType },
    },
    create: {
      userId,
      consentType,
      granted,
      grantedAt: granted ? now : null,
      revokedAt: granted ? null : now,
      ipAddress: typeof ipAddress === 'string' ? ipAddress : null,
      userAgent: typeof userAgent === 'string' ? userAgent : null,
    },
    update: {
      granted,
      grantedAt: granted ? now : undefined,
      revokedAt: !granted ? now : undefined,
      ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    },
  });

  return reply.send({
    ok: true,
    consent: {
      type: consent.consentType,
      granted: consent.granted,
      grantedAt: consent.grantedAt?.toISOString() ?? null,
      revokedAt: consent.revokedAt?.toISOString() ?? null,
    },
  });
});

// ============================================================================
// Notification Preferences
// ============================================================================

server.get('/v1/me/notification-preferences', async (req, reply) => {
  const rlKey = keyFromReq(req, 'rl:notif:list');
  if (!allowRequest(rlKey, 60, 1)) {
    return reply.status(429).send({ error: 'Rate limit exceeded' });
  }

  const userId = requireAuthUserId(req, reply);
  if (!userId) return;

  const preferences = await getNotificationPreferences(userId);

  return reply.send({
    ok: true,
    preferences: preferences.map((p) => ({
      id: p.id,
      method: p.method,
      frequency: p.frequency,
      enabled: p.enabled,
      metadata: p.metadata,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
});

server.get('/v1/me/notification-preferences/:method', async (req, reply) => {
  const rlKey = keyFromReq(req, 'rl:notif:get');
  if (!allowRequest(rlKey, 60, 1)) {
    return reply.status(429).send({ error: 'Rate limit exceeded' });
  }

  const userId = requireAuthUserId(req, reply);
  if (!userId) return;

  const methodParam = (req.params as { method?: string }).method;
  const parseResult = NotificationMethodSchema.safeParse(methodParam);
  if (!parseResult.success) {
    return reply.status(400).send({ error: 'Invalid notification method' });
  }

  const preference = await getNotificationPreference(userId, parseResult.data);
  if (!preference) {
    return reply.status(404).send({ error: 'Notification preference not found' });
  }

  return reply.send({
    ok: true,
    preference: {
      id: preference.id,
      method: preference.method,
      frequency: preference.frequency,
      enabled: preference.enabled,
      metadata: preference.metadata,
      createdAt: preference.createdAt.toISOString(),
      updatedAt: preference.updatedAt.toISOString(),
    },
  });
});

server.post('/v1/me/notification-preferences', async (req, reply) => {
  const rlKey = keyFromReq(req, 'rl:notif:create');
  if (!allowRequest(rlKey, 30, 0.5)) {
    return reply.status(429).send({ error: 'Rate limit exceeded' });
  }

  const userId = requireAuthUserId(req, reply);
  if (!userId) return;

  const parseResult = CreateNotificationPreferenceSchema.safeParse(req.body);
  if (!parseResult.success) {
    return reply.status(400).send({ 
      error: 'Invalid request body',
      details: parseResult.error.errors,
    });
  }

  try {
    const preference = await upsertNotificationPreference(
      userId,
      parseResult.data.method,
      parseResult.data
    );

    return reply.status(201).send({
      ok: true,
      preference: {
        id: preference.id,
        method: preference.method,
        frequency: preference.frequency,
        enabled: preference.enabled,
        metadata: preference.metadata,
        createdAt: preference.createdAt.toISOString(),
        updatedAt: preference.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create notification preference';
    return reply.status(400).send({ error: message });
  }
});

server.patch('/v1/me/notification-preferences/:method', async (req, reply) => {
  const rlKey = keyFromReq(req, 'rl:notif:update');
  if (!allowRequest(rlKey, 30, 0.5)) {
    return reply.status(429).send({ error: 'Rate limit exceeded' });
  }

  const userId = requireAuthUserId(req, reply);
  if (!userId) return;

  const methodParam = (req.params as { method?: string }).method;
  const methodParseResult = NotificationMethodSchema.safeParse(methodParam);
  if (!methodParseResult.success) {
    return reply.status(400).send({ error: 'Invalid notification method' });
  }

  const parseResult = UpdateNotificationPreferenceSchema.safeParse(req.body);
  if (!parseResult.success) {
    return reply.status(400).send({ 
      error: 'Invalid request body',
      details: parseResult.error.errors,
    });
  }

  try {
    const preference = await updateNotificationPreference(
      userId,
      methodParseResult.data,
      parseResult.data
    );

    return reply.send({
      ok: true,
      preference: {
        id: preference.id,
        method: preference.method,
        frequency: preference.frequency,
        enabled: preference.enabled,
        metadata: preference.metadata,
        createdAt: preference.createdAt.toISOString(),
        updatedAt: preference.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return reply.status(404).send({ error: 'Notification preference not found' });
    }
    const message = error instanceof Error ? error.message : 'Failed to update notification preference';
    return reply.status(400).send({ error: message });
  }
});

server.delete('/v1/me/notification-preferences/:method', async (req, reply) => {
  const rlKey = keyFromReq(req, 'rl:notif:delete');
  if (!allowRequest(rlKey, 30, 0.5)) {
    return reply.status(429).send({ error: 'Rate limit exceeded' });
  }

  const userId = requireAuthUserId(req, reply);
  if (!userId) return;

  const methodParam = (req.params as { method?: string }).method;
  const parseResult = NotificationMethodSchema.safeParse(methodParam);
  if (!parseResult.success) {
    return reply.status(400).send({ error: 'Invalid notification method' });
  }

  try {
    await deleteNotificationPreference(userId, parseResult.data);
    return reply.send({ ok: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return reply.status(404).send({ error: 'Notification preference not found' });
    }
    return reply.status(500).send({ error: 'Failed to delete notification preference' });
  }
});


server.get('/v1/me/export', async (req, reply) => {
  const userId = requireAuthUserId(req, reply);
  if (!userId) return;

  const [user, shipments, orders, loyaltyEntries] = await prisma.$transaction([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.shipment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        carrier: true,
        events: { orderBy: { eventTime: 'desc' }, take: 50 },
      },
    }),
    prisma.order.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.loyaltyLedger.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
  ]);

  if (!user) return reply.code(404).send({ ok: false, error: 'Not found' });

  const exportShipments = shipments.map((s) => {
    let orderNumber = null as string | null;

    // Backward compatible:
    // - When AES is configured, `orderNumberEncrypted` is encrypted.
    // - When AES is not configured, we store the plaintext in the same column.
    if (s.orderNumberEncrypted) {
      if (isCryptoConfigured()) {
        try {
          orderNumber = decryptField(s.orderNumberEncrypted);
        } catch {
          orderNumber = null;
        }
      } else {
        orderNumber = s.orderNumberEncrypted;
      }
    }

    return {
      id: s.id,
      label: s.label ?? null,
      trackingNumber: s.trackingNumber,
      carrier: s.carrier?.name ?? null,
      status: s.status,
      origin: s.origin ?? null,
      originLat: s.originLat ?? null,
      originLng: s.originLng ?? null,
      destination: s.destination ?? null,
      destinationLat: s.destinationLat ?? null,
      destinationLng: s.destinationLng ?? null,
      currentLat: s.currentLat ?? null,
      currentLng: s.currentLng ?? null,
      lastEventAt: s.lastEventAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      orderNumber,
      events: s.events.map((e) => ({
        id: e.id.toString(),
        canonicalStatus: e.canonicalStatus,
        carrierStatus: e.carrierStatus ?? null,
        location: e.location ?? null,
        eventTime: e.eventTime.toISOString(),
      })),
    };
  });

  return reply.send({
    ok: true,
    generatedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email ?? null,
      locale: user.locale ?? null,
      tz: user.tz ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    orders,
    shipments: exportShipments,
    loyaltyEntries,
  });
});

server.delete('/v1/me', async (req, reply) => {
  const userId = requireAuthUserId(req, reply);
  if (!userId) return;

  const shipmentIds = (await prisma.shipment.findMany({ where: { userId }, select: { id: true } })).map((s) => s.id);
  const orderIds = (await prisma.order.findMany({ where: { userId }, select: { id: true } })).map((o) => o.id);

  await prisma.$transaction([
    prisma.trackingEvent.deleteMany({ where: shipmentIds.length ? { shipmentId: { in: shipmentIds } } : { shipmentId: '__none__' } }),
    prisma.loyaltyLedger.deleteMany({ where: { userId } }),
    prisma.shipment.deleteMany({
      where: {
        OR: [
          { userId },
          ...(orderIds.length ? [{ orderId: { in: orderIds } }] : []),
        ],
      },
    }),
    prisma.order.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  revokeSessionsForUser(userId);
  return reply.send({ ok: true, deleted: true });
});

async function main() {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    
    // Start background polling job for shipment updates
    startPollingJob();
    
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

await main();
