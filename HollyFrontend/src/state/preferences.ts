import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AnimationStyle = 'fireworks' | 'confetti' | 'stars' | 'none'

export type PreferencesState = {
  animationsEnabled: boolean
  setAnimationsEnabled: (enabled: boolean) => void
  animationStyle: AnimationStyle
  setAnimationStyle: (style: AnimationStyle) => void
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
  respectReducedMotion: boolean
  setRespectReducedMotion: (respect: boolean) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      animationsEnabled: true,
      setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
      animationStyle: 'fireworks',
      setAnimationStyle: (style) => set({ animationStyle: style }),
      soundEnabled: false,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      respectReducedMotion: true,
      setRespectReducedMotion: (respect) => set({ respectReducedMotion: respect }),
    }),
    { name: 'holly-preferences' }
  )
)
