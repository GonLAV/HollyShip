import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { z } from 'zod';
import { prisma } from './prisma.js';
import type { Prisma } from '@prisma/client';
import { tierForPoints } from './loyalty.js';
import { guessCarrierFromTrackingNumber } from './carrierResolver.js';
import { coordsForDestination, coordsForOrigin, interpolateLatLng, progressForStatus } from './geo.js';
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

server.post('/v1/connect/email/gmail', async () => {
  return { ok: true, provider: 'gmail', message: 'OAuth flow not implemented in MVP scaffold' };
});

server.post('/v1/connect/email/outlook', async () => {
  return { ok: true, provider: 'outlook', message: 'OAuth flow not implemented in MVP scaffold' };
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

  return reply.send({ ok: true });
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
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

await main();
