import { z } from 'zod';
import type { FastifyRequest } from 'fastify';
import { prisma } from './prisma.js';
import type { Prisma } from '@prisma/client';

// Validation schemas
export const NotificationMethodSchema = z.enum(['email', 'push', 'webhook', 'sms']);
export const NotificationFrequencySchema = z.enum(['realtime', 'daily', 'weekly', 'never']);

export const CreateNotificationPreferenceSchema = z.object({
  method: NotificationMethodSchema,
  frequency: NotificationFrequencySchema,
  enabled: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateNotificationPreferenceSchema = z.object({
  frequency: NotificationFrequencySchema.optional(),
  enabled: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type NotificationMethod = z.infer<typeof NotificationMethodSchema>;
export type NotificationFrequency = z.infer<typeof NotificationFrequencySchema>;
export type CreateNotificationPreferenceInput = z.infer<typeof CreateNotificationPreferenceSchema>;
export type UpdateNotificationPreferenceInput = z.infer<typeof UpdateNotificationPreferenceSchema>;

/**
 * Get all notification preferences for a user
 */
export async function getNotificationPreferences(userId: string) {
  return prisma.notificationPreference.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get a specific notification preference by method
 */
export async function getNotificationPreference(userId: string, method: NotificationMethod) {
  return prisma.notificationPreference.findUnique({
    where: {
      userId_method: {
        userId,
        method,
      },
    },
  });
}

/**
 * Create or update a notification preference
 */
export async function upsertNotificationPreference(
  userId: string,
  method: NotificationMethod,
  data: CreateNotificationPreferenceInput
) {
  // Validate metadata based on method
  if (method === 'webhook' && data.metadata) {
    const url = data.metadata.url;
    if (typeof url !== 'string' || !url.startsWith('https://')) {
      throw new Error('Webhook method requires a valid HTTPS URL in metadata.url');
    }
  }

  return prisma.notificationPreference.upsert({
    where: {
      userId_method: {
        userId,
        method,
      },
    },
    create: {
      userId,
      method: data.method,
      frequency: data.frequency,
      enabled: data.enabled,
      metadata: (data.metadata ?? null) as Prisma.InputJsonValue,
    },
    update: {
      frequency: data.frequency,
      enabled: data.enabled,
      metadata: (data.metadata ?? null) as Prisma.InputJsonValue,
    },
  });
}

/**
 * Update an existing notification preference
 */
export async function updateNotificationPreference(
  userId: string,
  method: NotificationMethod,
  data: UpdateNotificationPreferenceInput
) {
  // Validate metadata based on method if provided
  if (method === 'webhook' && data.metadata) {
    const url = data.metadata.url;
    if (typeof url !== 'string' || !url.startsWith('https://')) {
      throw new Error('Webhook method requires a valid HTTPS URL in metadata.url');
    }
  }

  return prisma.notificationPreference.update({
    where: {
      userId_method: {
        userId,
        method,
      },
    },
    data: {
      ...(data.frequency !== undefined && { frequency: data.frequency }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
      ...(data.metadata !== undefined && { metadata: (data.metadata ?? null) as Prisma.InputJsonValue }),
    },
  });
}

/**
 * Delete a notification preference
 */
export async function deleteNotificationPreference(userId: string, method: NotificationMethod) {
  return prisma.notificationPreference.delete({
    where: {
      userId_method: {
        userId,
        method,
      },
    },
  });
}
