import { describe, it, expect, beforeEach } from 'vitest'
import { useNotificationPreferencesStore } from './notificationPreferences'
import type { NotificationPreference } from './notificationPreferences'

describe('NotificationPreferencesStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useNotificationPreferencesStore.getState().reset()
  })

  it('should initialize with empty preferences', () => {
    const { preferences, loading, error } = useNotificationPreferencesStore.getState()
    expect(preferences).toEqual([])
    expect(loading).toBe(false)
    expect(error).toBeNull()
  })

  it('should set preferences', () => {
    const mockPreferences: NotificationPreference[] = [
      {
        id: '1',
        method: 'email',
        frequency: 'daily',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        method: 'push',
        frequency: 'realtime',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    useNotificationPreferencesStore.getState().setPreferences(mockPreferences)
    
    const { preferences } = useNotificationPreferencesStore.getState()
    expect(preferences).toEqual(mockPreferences)
    expect(preferences).toHaveLength(2)
  })

  it('should add a new preference', () => {
    const newPreference: NotificationPreference = {
      id: '1',
      method: 'email',
      frequency: 'daily',
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    useNotificationPreferencesStore.getState().addPreference(newPreference)
    
    const { preferences } = useNotificationPreferencesStore.getState()
    expect(preferences).toHaveLength(1)
    expect(preferences[0]).toEqual(newPreference)
  })

  it('should update an existing preference', () => {
    const initialPreference: NotificationPreference = {
      id: '1',
      method: 'email',
      frequency: 'daily',
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    useNotificationPreferencesStore.getState().addPreference(initialPreference)
    useNotificationPreferencesStore.getState().updatePreference('email', {
      frequency: 'weekly',
      enabled: false,
    })
    
    const { preferences } = useNotificationPreferencesStore.getState()
    expect(preferences[0].frequency).toBe('weekly')
    expect(preferences[0].enabled).toBe(false)
    expect(preferences[0].method).toBe('email') // unchanged
  })

  it('should remove a preference by method', () => {
    const preference1: NotificationPreference = {
      id: '1',
      method: 'email',
      frequency: 'daily',
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const preference2: NotificationPreference = {
      id: '2',
      method: 'push',
      frequency: 'realtime',
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    useNotificationPreferencesStore.getState().addPreference(preference1)
    useNotificationPreferencesStore.getState().addPreference(preference2)
    
    expect(useNotificationPreferencesStore.getState().preferences).toHaveLength(2)
    
    useNotificationPreferencesStore.getState().removePreference('email')
    
    const { preferences } = useNotificationPreferencesStore.getState()
    expect(preferences).toHaveLength(1)
    expect(preferences[0].method).toBe('push')
  })

  it('should set loading state', () => {
    useNotificationPreferencesStore.getState().setLoading(true)
    expect(useNotificationPreferencesStore.getState().loading).toBe(true)
    
    useNotificationPreferencesStore.getState().setLoading(false)
    expect(useNotificationPreferencesStore.getState().loading).toBe(false)
  })

  it('should set error state', () => {
    const errorMessage = 'Failed to load preferences'
    useNotificationPreferencesStore.getState().setError(errorMessage)
    expect(useNotificationPreferencesStore.getState().error).toBe(errorMessage)
    
    useNotificationPreferencesStore.getState().setError(null)
    expect(useNotificationPreferencesStore.getState().error).toBeNull()
  })

  it('should reset to initial state', () => {
    // Populate store with data
    const mockPreference: NotificationPreference = {
      id: '1',
      method: 'email',
      frequency: 'daily',
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    useNotificationPreferencesStore.getState().addPreference(mockPreference)
    useNotificationPreferencesStore.getState().setLoading(true)
    useNotificationPreferencesStore.getState().setError('Some error')
    
    // Reset
    useNotificationPreferencesStore.getState().reset()
    
    const { preferences, loading, error } = useNotificationPreferencesStore.getState()
    expect(preferences).toEqual([])
    expect(loading).toBe(false)
    expect(error).toBeNull()
  })

  it('should clear error when setting preferences', () => {
    useNotificationPreferencesStore.getState().setError('Some error')
    expect(useNotificationPreferencesStore.getState().error).toBe('Some error')
    
    useNotificationPreferencesStore.getState().setPreferences([])
    expect(useNotificationPreferencesStore.getState().error).toBeNull()
  })

  it('should clear error when adding preference', () => {
    useNotificationPreferencesStore.getState().setError('Some error')
    
    const newPreference: NotificationPreference = {
      id: '1',
      method: 'email',
      frequency: 'daily',
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    useNotificationPreferencesStore.getState().addPreference(newPreference)
    expect(useNotificationPreferencesStore.getState().error).toBeNull()
  })
})
