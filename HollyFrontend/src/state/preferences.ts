import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PreferencesState = {
  animationsEnabled: boolean
  setAnimationsEnabled: (enabled: boolean) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      animationsEnabled: true,
      setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
    }),
    { name: 'holly-preferences' }
  )
)
