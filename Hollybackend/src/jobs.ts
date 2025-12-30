import { prisma } from './prisma.js';
import type { Prisma } from '@prisma/client';

/**
 * Background job system for polling undelivered shipments
 * This is a minimal implementation suitable for MVP
 * For production, consider using a proper job queue like BullMQ with Redis
 */

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 60 * 1000; // 1 minute

interface JobContext {
  isRunning: boolean;
  intervalId: NodeJS.Timeout | null;
}

const jobContext: JobContext = {
  isRunning: false,
  intervalId: null,
};

/**
 * Poll a single shipment for updates
 * In a real implementation, this would call the tracking provider API
 */
async function pollShipment(shipmentId: string, attempt = 0): Promise<void> {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { carrier: true },
    });

    if (!shipment) {
      console.log(`Shipment ${shipmentId} not found`);
      return;
    }

    // Skip if already delivered
    if (shipment.status === 'DELIVERED') {
      return;
    }

    // In a real implementation, we would:
    // 1. Call the tracking provider API (e.g., AfterShip, EasyPost, etc.)
    // 2. Parse the response
    // 3. Update the shipment status and create tracking events
    // 4. Award loyalty points if status changed to IN_TRANSIT or DELIVERED

    // For MVP, we log that we would poll
    console.log(`[Job] Would poll shipment ${shipmentId} (${shipment.trackingNumber}) via ${shipment.carrier?.name || 'unknown carrier'}`);

    // Update last polled timestamp (we'll add this field if needed in production)
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: { lastEventAt: new Date() },
    });

  } catch (error) {
    console.error(`[Job] Error polling shipment ${shipmentId}:`, error);

    // Retry with backoff
    if (attempt < MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_BACKOFF_MS * Math.pow(2, attempt);
      console.log(`[Job] Retrying shipment ${shipmentId} in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`);
      setTimeout(() => pollShipment(shipmentId, attempt + 1), delay);
    }
  }
}

/**
 * Main polling job that runs on an interval
 */
async function runPollingJob(): Promise<void> {
  try {
    // Find all shipments that are not delivered and haven't been polled recently
    const shipments = await prisma.shipment.findMany({
      where: {
        status: {
          notIn: ['DELIVERED', 'FAILURE'],
        },
        // Only poll shipments that haven't been updated in the last 10 minutes
        OR: [
          { lastEventAt: null },
          { lastEventAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } },
        ],
      },
      select: { id: true },
      take: 50, // Limit batch size to avoid overwhelming the system
    });

    console.log(`[Job] Found ${shipments.length} shipments to poll`);

    // Poll each shipment (staggered to avoid rate limits)
    shipments.forEach((shipment, index) => {
      // Stagger requests by 100ms to avoid rate limits
      setTimeout(() => pollShipment(shipment.id), index * 100);
    });

  } catch (error) {
    console.error('[Job] Error in polling job:', error);
  }
}

/**
 * Start the background polling job
 */
export function startPollingJob(): void {
  if (jobContext.isRunning) {
    console.log('[Job] Polling job already running');
    return;
  }

  console.log(`[Job] Starting polling job (interval: ${POLL_INTERVAL_MS}ms)`);
  jobContext.isRunning = true;

  // Run immediately on start
  runPollingJob();

  // Then run on interval
  jobContext.intervalId = setInterval(runPollingJob, POLL_INTERVAL_MS);
}

/**
 * Stop the background polling job
 */
export function stopPollingJob(): void {
  if (!jobContext.isRunning) {
    console.log('[Job] Polling job not running');
    return;
  }

  console.log('[Job] Stopping polling job');
  jobContext.isRunning = false;

  if (jobContext.intervalId) {
    clearInterval(jobContext.intervalId);
    jobContext.intervalId = null;
  }
}

/**
 * Get job status
 */
export function getJobStatus(): { isRunning: boolean; pollIntervalMs: number } {
  return {
    isRunning: jobContext.isRunning,
    pollIntervalMs: POLL_INTERVAL_MS,
  };
}
