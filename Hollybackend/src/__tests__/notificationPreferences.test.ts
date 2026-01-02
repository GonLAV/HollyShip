import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  CreateNotificationPreferenceSchema,
  UpdateNotificationPreferenceSchema,
  NotificationMethodSchema,
  NotificationFrequencySchema,
} from '../notificationPreferences.js';

describe('Notification Preferences Schemas', () => {
  describe('NotificationMethodSchema', () => {
    it('should accept valid notification methods', () => {
      expect(NotificationMethodSchema.parse('email')).toBe('email');
      expect(NotificationMethodSchema.parse('push')).toBe('push');
      expect(NotificationMethodSchema.parse('webhook')).toBe('webhook');
      expect(NotificationMethodSchema.parse('sms')).toBe('sms');
    });

    it('should reject invalid notification methods', () => {
      expect(() => NotificationMethodSchema.parse('invalid')).toThrow();
      expect(() => NotificationMethodSchema.parse('slack')).toThrow();
      expect(() => NotificationMethodSchema.parse('')).toThrow();
    });
  });

  describe('NotificationFrequencySchema', () => {
    it('should accept valid frequencies', () => {
      expect(NotificationFrequencySchema.parse('realtime')).toBe('realtime');
      expect(NotificationFrequencySchema.parse('daily')).toBe('daily');
      expect(NotificationFrequencySchema.parse('weekly')).toBe('weekly');
      expect(NotificationFrequencySchema.parse('never')).toBe('never');
    });

    it('should reject invalid frequencies', () => {
      expect(() => NotificationFrequencySchema.parse('hourly')).toThrow();
      expect(() => NotificationFrequencySchema.parse('monthly')).toThrow();
      expect(() => NotificationFrequencySchema.parse('')).toThrow();
    });
  });

  describe('CreateNotificationPreferenceSchema', () => {
    it('should accept valid create input', () => {
      const input = {
        method: 'email',
        frequency: 'daily',
        enabled: true,
      };
      const result = CreateNotificationPreferenceSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept create input without enabled (defaults to true)', () => {
      const input = {
        method: 'push',
        frequency: 'realtime',
      };
      const result = CreateNotificationPreferenceSchema.parse(input);
      expect(result.enabled).toBe(true);
    });

    it('should accept create input with metadata', () => {
      const input = {
        method: 'webhook',
        frequency: 'realtime',
        enabled: true,
        metadata: { url: 'https://example.com/webhook' },
      };
      const result = CreateNotificationPreferenceSchema.parse(input);
      expect(result.metadata).toEqual({ url: 'https://example.com/webhook' });
    });

    it('should reject invalid method in create input', () => {
      const input = {
        method: 'invalid',
        frequency: 'daily',
      };
      expect(() => CreateNotificationPreferenceSchema.parse(input)).toThrow();
    });

    it('should reject invalid frequency in create input', () => {
      const input = {
        method: 'email',
        frequency: 'hourly',
      };
      expect(() => CreateNotificationPreferenceSchema.parse(input)).toThrow();
    });
  });

  describe('UpdateNotificationPreferenceSchema', () => {
    it('should accept partial update with frequency only', () => {
      const input = { frequency: 'weekly' };
      const result = UpdateNotificationPreferenceSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept partial update with enabled only', () => {
      const input = { enabled: false };
      const result = UpdateNotificationPreferenceSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept partial update with metadata only', () => {
      const input = { metadata: { customField: 'value' } };
      const result = UpdateNotificationPreferenceSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept empty update object', () => {
      const input = {};
      const result = UpdateNotificationPreferenceSchema.parse(input);
      expect(result).toEqual({});
    });

    it('should accept update with all fields', () => {
      const input = {
        frequency: 'daily',
        enabled: false,
        metadata: { key: 'value' },
      };
      const result = UpdateNotificationPreferenceSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should reject invalid frequency in update', () => {
      const input = { frequency: 'invalid' };
      expect(() => UpdateNotificationPreferenceSchema.parse(input)).toThrow();
    });
  });
});
