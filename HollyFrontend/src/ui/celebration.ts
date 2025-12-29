import confetti from 'canvas-confetti'

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
