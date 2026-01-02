import { useCallback, useEffect } from 'react'
import { useNotificationPreferencesStore } from '../state/notificationPreferences'
import type { NotificationMethod, NotificationFrequency } from '../state/notificationPreferences'
import { api } from '../api/client'

export interface CreateNotificationPreferenceInput {
  method: NotificationMethod
  frequency: NotificationFrequency
  enabled?: boolean
  metadata?: Record<string, unknown>
}

export interface UpdateNotificationPreferenceInput {
  frequency?: NotificationFrequency
  enabled?: boolean
  metadata?: Record<string, unknown>
}

export function useNotificationPreferences() {
  const {
    preferences,
    loading,
    error,
    setPreferences,
    addPreference,
    updatePreference,
    removePreference,
    setLoading,
    setError,
  } = useNotificationPreferencesStore()

  const fetchPreferences = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await api.get<{
        ok: boolean
        preferences: Array<{
          id: string
          method: NotificationMethod
          frequency: NotificationFrequency
          enabled: boolean
          metadata?: Record<string, unknown>
          createdAt: string
          updatedAt: string
        }>
      }>('/v1/me/notification-preferences')
      
      if (response.ok && response.preferences) {
        setPreferences(response.preferences)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch notification preferences'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [setPreferences, setLoading, setError])

  const createPreference = useCallback(async (input: CreateNotificationPreferenceInput) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await api.post<{
        ok: boolean
        preference: {
          id: string
          method: NotificationMethod
          frequency: NotificationFrequency
          enabled: boolean
          metadata?: Record<string, unknown>
          createdAt: string
          updatedAt: string
        }
      }>('/v1/me/notification-preferences', input)
      
      if (response.ok && response.preference) {
        addPreference(response.preference)
        return response.preference
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create notification preference'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [addPreference, setLoading, setError])

  const updatePreferenceByMethod = useCallback(
    async (method: NotificationMethod, input: UpdateNotificationPreferenceInput) => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await api.patch<{
          ok: boolean
          preference: {
            id: string
            method: NotificationMethod
            frequency: NotificationFrequency
            enabled: boolean
            metadata?: Record<string, unknown>
            createdAt: string
            updatedAt: string
          }
        }>(`/v1/me/notification-preferences/${method}`, input)
        
        if (response.ok && response.preference) {
          updatePreference(method, response.preference)
          return response.preference
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update notification preference'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [updatePreference, setLoading, setError]
  )

  const deletePreference = useCallback(
    async (method: NotificationMethod) => {
      setLoading(true)
      setError(null)
      
      try {
        await api.delete(`/v1/me/notification-preferences/${method}`)
        removePreference(method)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete notification preference'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [removePreference, setLoading, setError]
  )

  return {
    preferences,
    loading,
    error,
    fetchPreferences,
    createPreference,
    updatePreference: updatePreferenceByMethod,
    deletePreference,
  }
}
