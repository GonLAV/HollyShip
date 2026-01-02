import { create } from 'zustand'

export type NotificationMethod = 'email' | 'push' | 'webhook' | 'sms'
export type NotificationFrequency = 'realtime' | 'daily' | 'weekly' | 'never'

export interface NotificationPreference {
  id: string
  method: NotificationMethod
  frequency: NotificationFrequency
  enabled: boolean
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface NotificationPreferencesState {
  preferences: NotificationPreference[]
  loading: boolean
  error: string | null
  
  // Actions
  setPreferences: (preferences: NotificationPreference[]) => void
  addPreference: (preference: NotificationPreference) => void
  updatePreference: (method: NotificationMethod, updates: Partial<NotificationPreference>) => void
  removePreference: (method: NotificationMethod) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  preferences: [],
  loading: false,
  error: null,
}

export const useNotificationPreferencesStore = create<NotificationPreferencesState>((set) => ({
  ...initialState,
  
  setPreferences: (preferences) => set({ preferences, error: null }),
  
  addPreference: (preference) =>
    set((state) => ({
      preferences: [...state.preferences, preference],
      error: null,
    })),
  
  updatePreference: (method, updates) =>
    set((state) => ({
      preferences: state.preferences.map((p) =>
        p.method === method ? { ...p, ...updates } : p
      ),
      error: null,
    })),
  
  removePreference: (method) =>
    set((state) => ({
      preferences: state.preferences.filter((p) => p.method !== method),
      error: null,
    })),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  reset: () => set(initialState),
}))
