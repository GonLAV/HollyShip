import confetti from 'canvas-confetti'
import type { AnimationStyle } from '../state/preferences'

export function burstConfetti() {
  confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })
}

export function fireworks(durationMs = 4000) {
  const end = Date.now() + durationMs
  const colors = ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
  ;(function frame() {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: Math.random() * 0.2 + 0.1, y: Math.random() * 0.3 + 0.1 },
      colors,
    })
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: Math.random() * 0.2 + 0.7, y: Math.random() * 0.3 + 0.1 },
      colors,
    })
    if (Date.now() < end) {
      requestAnimationFrame(frame)
    } else {
      confetti({ particleCount: 200, spread: 90, startVelocity: 40 })
    }
  })()
}

export function stars(durationMs = 4000) {
  const end = Date.now() + durationMs
  const colors = ['#FFD700', '#FFA500', '#FFFF00', '#FFFFFF']
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }
  
  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min
  }
  
  ;(function frame() {
    confetti({
      ...defaults,
      particleCount: 3,
      origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
      colors,
      shapes: ['star'],
      scalar: randomInRange(0.8, 1.2),
    })
    
    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  })()
}

export function rainbowConfetti(durationMs = 4000) {
  const end = Date.now() + durationMs
  
  ;(function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'],
    })
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'],
    })
    
    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  })()
}

export function schoolPride(durationMs = 4000) {
  const end = Date.now() + durationMs
  const colors = ['#4BA3FF', '#8ED1FC', '#1F2A44']
  
  ;(function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors,
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors,
    })
    
    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  })()
}

// Play celebration sound
export function playDeliverySound() {
  try {
    // Create a simple celebratory beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    // Create a sequence of notes
    const notes = [523.25, 659.25, 783.99, 1046.50] // C, E, G, C (major chord)
    let startTime = audioContext.currentTime
    
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = frequency
      oscillator.type = 'sine'
      
      // Create envelope
      const noteStart = startTime + (index * 0.15)
      gainNode.gain.setValueAtTime(0, noteStart)
      gainNode.gain.linearRampToValueAtTime(0.3, noteStart + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.15)
      
      oscillator.start(noteStart)
      oscillator.stop(noteStart + 0.15)
    })
  } catch (error) {
    // Silently fail if Web Audio API is not supported
    console.debug('Audio playback not supported:', error)
  }
}

// Helper to check if user prefers reduced motion
export function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Main celebration function that respects preferences
export type CelebrationOptions = {
  style?: AnimationStyle
  duration?: number
  sound?: boolean
  respectReducedMotion?: boolean
}

export function celebrate(options: CelebrationOptions = {}) {
  const {
    style = 'fireworks',
    duration = 4000,
    sound = false,
    respectReducedMotion = true,
  } = options
  
  // Skip if style is 'none'
  if (style === 'none') {
    if (sound) playDeliverySound()
    return
  }
  
  // Check if we should skip animation due to reduced motion preference
  if (respectReducedMotion && shouldReduceMotion()) {
    // Just show a simple burst instead of full animation
    burstConfetti()
    if (sound) playDeliverySound()
    return
  }
  
  // Play animation based on style
  switch (style) {
    case 'stars':
      stars(duration)
      break
    case 'rainbow':
      rainbowConfetti(duration)
      break
    case 'pride':
      schoolPride(duration)
      break
    case 'confetti':
      // Simple confetti burst repeated
      const confettiEnd = Date.now() + duration
      ;(function confettiFrame() {
        burstConfetti()
        if (Date.now() < confettiEnd) {
          setTimeout(confettiFrame, 300)
        }
      })()
      break
    case 'fireworks':
    default:
      fireworks(duration)
      break
  }
  
  // Play sound if enabled
  if (sound) {
    playDeliverySound()
  }
}
