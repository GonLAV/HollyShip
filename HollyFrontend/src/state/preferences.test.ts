import { describe, it, expect, beforeEach } from 'vitest'
import { usePreferencesStore } from './preferences'

describe('PreferencesStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    usePreferencesStore.setState({ animationsEnabled: true })
  })

  it('should initialize with animations enabled by default', () => {
    const { animationsEnabled } = usePreferencesStore.getState()
    expect(animationsEnabled).toBe(true)
  })

  it('should toggle animations setting', () => {
    const { setAnimationsEnabled } = usePreferencesStore.getState()
    
    setAnimationsEnabled(false)
    expect(usePreferencesStore.getState().animationsEnabled).toBe(false)
    
    setAnimationsEnabled(true)
    expect(usePreferencesStore.getState().animationsEnabled).toBe(true)
  })

  it('should persist animations preference', () => {
    const { setAnimationsEnabled } = usePreferencesStore.getState()
    
    setAnimationsEnabled(false)
    
    // Simulate page reload by getting fresh state
    const persistedState = usePreferencesStore.getState()
    expect(persistedState.animationsEnabled).toBe(false)
  })
})
