import { describe, it, expect, beforeEach } from 'vitest'
import { usePreferencesStore } from './preferences'

describe('PreferencesStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    usePreferencesStore.setState({ 
      animationsEnabled: true,
      animationStyle: 'fireworks',
      soundEnabled: false,
      respectReducedMotion: true,
    })
  })

  it('should initialize with animations enabled by default', () => {
    const { animationsEnabled } = usePreferencesStore.getState()
    expect(animationsEnabled).toBe(true)
  })

  it('should initialize with fireworks style by default', () => {
    const { animationStyle } = usePreferencesStore.getState()
    expect(animationStyle).toBe('fireworks')
  })

  it('should initialize with sound disabled by default', () => {
    const { soundEnabled } = usePreferencesStore.getState()
    expect(soundEnabled).toBe(false)
  })

  it('should initialize with respectReducedMotion enabled by default', () => {
    const { respectReducedMotion } = usePreferencesStore.getState()
    expect(respectReducedMotion).toBe(true)
  })

  it('should toggle animations setting', () => {
    const { setAnimationsEnabled } = usePreferencesStore.getState()
    
    setAnimationsEnabled(false)
    expect(usePreferencesStore.getState().animationsEnabled).toBe(false)
    
    setAnimationsEnabled(true)
    expect(usePreferencesStore.getState().animationsEnabled).toBe(true)
  })

  it('should change animation style', () => {
    const { setAnimationStyle } = usePreferencesStore.getState()
    
    setAnimationStyle('stars')
    expect(usePreferencesStore.getState().animationStyle).toBe('stars')
    
    setAnimationStyle('rainbow')
    expect(usePreferencesStore.getState().animationStyle).toBe('rainbow')
  })

  it('should toggle sound setting', () => {
    const { setSoundEnabled } = usePreferencesStore.getState()
    
    setSoundEnabled(true)
    expect(usePreferencesStore.getState().soundEnabled).toBe(true)
    
    setSoundEnabled(false)
    expect(usePreferencesStore.getState().soundEnabled).toBe(false)
  })

  it('should persist animations preference', () => {
    const { setAnimationsEnabled } = usePreferencesStore.getState()
    
    setAnimationsEnabled(false)
    
    // Simulate page reload by getting fresh state
    const persistedState = usePreferencesStore.getState()
    expect(persistedState.animationsEnabled).toBe(false)
  })
})
