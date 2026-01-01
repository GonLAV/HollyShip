# Fireworks Animation - Quick Start Guide

## How It Works

```
User visits Shipment Detail Page
         |
         v
    [Settings]
         |
    ☑ Enable animations (confetti, fireworks)
         |
         v
   Shipment Status Changes
         |
    IN_TRANSIT → DELIVERED
         |
         v
    Animation Enabled?
    /              \
  YES              NO
   |                |
   v                v
🎆 FIREWORKS!   (silent update)
```

## Feature Overview

### What You Get
- 🎆 **Fireworks Animation**: 5-second celebration when package is delivered
- 🎊 **Confetti Burst**: Quick celebration for other updates
- ⚙️ **User Control**: Toggle animations on/off
- 💾 **Persistent Settings**: Your choice is remembered
- ♿ **Accessible**: Respects user preferences for motion

### How to Use

1. **Navigate to a Shipment**
   - Go to Shipments page
   - Click on any shipment to view details

2. **Enable/Disable Animations**
   - Scroll to the settings area
   - Check/uncheck "Enable animations (confetti, fireworks)"
   - Your preference is saved automatically

3. **Watch It Work**
   - When a package is delivered, enjoy the fireworks!
   - If animations are disabled, you'll just see a text notification

## Animation Triggers

| Event | Animation | Duration | Can Disable? |
|-------|-----------|----------|-------------|
| Package Delivered | 🎆 Fireworks | 5 seconds | ✅ Yes |
| New Update | 🎊 Confetti | Instant | ✅ Yes |
| Out for Delivery | 🎊 Confetti | Instant | ✅ Yes |

## Technical Details

### Animation Library
- **Name**: canvas-confetti
- **Type**: Lightweight JavaScript animation
- **Size**: ~4KB gzipped
- **Performance**: GPU-accelerated via HTML5 Canvas

### Browser Support
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

### Accessibility
- Animations can be disabled by user
- Future: Will respect `prefers-reduced-motion` CSS media query
- Text notifications always shown
- No information lost when animations are off

## Example Code

### Triggering Fireworks Manually
```typescript
import { fireworks } from './ui/celebration'

// Display fireworks for 3 seconds
fireworks(3000)

// Display fireworks for 5 seconds (default for delivery)
fireworks(5000)
```

### Checking Animation Preference
```typescript
import { usePreferencesStore } from './state/preferences'

function MyComponent() {
  const animationsEnabled = usePreferencesStore(s => s.animationsEnabled)
  
  if (animationsEnabled) {
    fireworks(5000)
  }
}
```

### Toggling Preference
```typescript
const setAnimationsEnabled = usePreferencesStore(s => s.setAnimationsEnabled)

// Disable animations
setAnimationsEnabled(false)

// Enable animations
setAnimationsEnabled(true)
```

## FAQ

**Q: Do I need to enable animations for the feature to work?**  
A: The feature always works! Animations are enabled by default, but you can disable them if you prefer silent updates.

**Q: Will animations affect performance?**  
A: No! The canvas-confetti library is highly optimized and uses GPU acceleration. Animations run smoothly even on older devices.

**Q: Can I customize the animation?**  
A: Currently, the animation style is fixed. Future updates may add customization options.

**Q: What if I have motion sensitivity?**  
A: Simply uncheck "Enable animations" in the shipment detail page. You'll still receive text notifications.

**Q: Are animations shown for all status updates?**  
A: Confetti shows for any new event. Fireworks only show when a package is delivered.

**Q: Does this work on mobile?**  
A: Yes! The animations work great on mobile browsers too.

## Troubleshooting

### Animation doesn't play
1. Check if "Enable animations" is checked
2. Make sure JavaScript is enabled in your browser
3. Try refreshing the page
4. Check browser console for errors

### Animation is laggy
1. Close unnecessary browser tabs
2. Update your browser to the latest version
3. Try disabling browser extensions
4. Check if your device is in power-saving mode

### Setting doesn't save
1. Make sure cookies/localStorage are enabled
2. Not in incognito/private browsing mode
3. Clear browser cache and try again

## More Information

See the full documentation at `docs/FIREWORKS_ANIMATION_FEATURE.md` for:
- Complete API reference
- Testing guidelines
- Architecture details
- Integration examples
