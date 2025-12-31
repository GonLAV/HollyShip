# Fireworks Animation Feature

## Overview

The Fireworks Animation feature enhances the user experience by displaying a celebratory fireworks animation when a package is marked as delivered. This provides visual feedback and creates a delightful moment for users when their package arrives.

## Implementation Details

### Front-End Components

#### 1. Animation Library
- **Library**: `canvas-confetti` (v1.9.4)
- **Location**: Already installed in `HollyFrontend/package.json`
- **Documentation**: https://www.npmjs.com/package/canvas-confetti

#### 2. Animation Functions
**File**: `HollyFrontend/src/ui/celebration.ts`

Two animation functions are available:
- `burstConfetti()`: Single burst of confetti (used for general updates)
- `fireworks(durationMs)`: Continuous fireworks animation (used for delivery)

```typescript
// Example: 5-second fireworks display
fireworks(5000)
```

#### 3. User Preferences Store
**File**: `HollyFrontend/src/state/preferences.ts`

A Zustand store manages user animation preferences with persistence:

```typescript
export type PreferencesState = {
  animationsEnabled: boolean
  setAnimationsEnabled: (enabled: boolean) => void
}
```

Features:
- Persists to localStorage under key `holly-preferences`
- Default: animations enabled (`true`)
- Can be toggled by user in settings

#### 4. Shipment Detail Page Integration
**File**: `HollyFrontend/src/pages/ShipmentDetailPage.tsx`

The page includes:
1. **Animation Toggle UI**: Checkbox to enable/disable animations
2. **Delivery Detection**: Monitors shipment status changes
3. **Conditional Trigger**: Only fires animations if user has them enabled

**Trigger Logic**:
```typescript
const wasDelivered = previous.status?.toLowerCase() === 'delivered'
const isDelivered = next.status?.toLowerCase() === 'delivered' || latestText.includes('delivered')

if (!wasDelivered && isDelivered) {
  show('Delivered! 🎉')
  if (animationsEnabled) fireworks(5000)
}
```

### User Interface

#### Settings Toggle
Located on the Shipment Detail page, below the email updates checkbox:

```
☑ Enable animations (confetti, fireworks)
```

This toggle:
- Is checked by default
- Persists across sessions
- Applies immediately to new delivery events

### Back-End Support

The backend already provides full support for delivery detection:

1. **Status Types**: `DELIVERED` is a canonical status in the system
2. **Event Detection**: Shipment events include `canonicalStatus` field
3. **Polling**: Frontend polls every 10 seconds for status updates
4. **Webhook Support**: Backend can receive delivery webhooks from carriers

**Relevant Backend Files**:
- `Hollybackend/src/index.ts`: Status mapping and event handling
- `Hollybackend/src/jobs.ts`: Background polling jobs
- `Hollybackend/src/geo.ts`: Location updates on delivery

## Testing

### Unit Tests
**File**: `HollyFrontend/src/state/preferences.test.ts`

Tests cover:
- Default state (animations enabled)
- Toggle functionality
- Persistence across sessions

Run tests:
```bash
cd HollyFrontend
npm test
```

### Manual Testing

1. **Start the application**:
   ```bash
   # Terminal 1: Start backend
   cd Hollybackend
   npm run dev

   # Terminal 2: Start frontend
   cd HollyFrontend
   npm run dev
   ```

2. **Create a test shipment**:
   - Log in to the application
   - Navigate to "Shipments"
   - Add a tracking number

3. **Simulate delivery**:
   - Use the backend API or database to change shipment status to "DELIVERED"
   - Wait for the 10-second polling interval
   - Observe the fireworks animation

4. **Test animation toggle**:
   - Navigate to the shipment detail page
   - Uncheck "Enable animations"
   - Trigger another delivery event
   - Verify no animation plays

## Cross-Browser Compatibility

The `canvas-confetti` library is compatible with:
- ✅ Chrome/Edge (Chromium-based)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Note**: Requires JavaScript enabled and HTML5 Canvas support.

## Accessibility Considerations

1. **Respects User Preferences**: Users can disable animations
2. **Non-Essential Visual**: Animation is purely decorative
3. **No Motion Required**: Users with motion sensitivity can disable
4. **Screen Readers**: Toast message "Delivered! 🎉" provides text alternative

## Performance

- **Lightweight**: canvas-confetti is ~4KB gzipped
- **GPU Accelerated**: Uses HTML5 Canvas for smooth performance
- **Non-Blocking**: Animations run on requestAnimationFrame
- **Auto-Cleanup**: Canvas elements are removed after animation completes

## Future Enhancements

Potential improvements:
1. **Customization**: Allow users to choose animation style
2. **Sound Effects**: Optional celebratory sound on delivery
3. **Theme Integration**: Match fireworks colors to user's theme
4. **Accessibility++**: Respect `prefers-reduced-motion` CSS media query
5. **Animation Variations**: Different animations for different milestones

## API Reference

### usePreferencesStore

```typescript
import { usePreferencesStore } from '../state/preferences'

// In component
const animationsEnabled = usePreferencesStore(s => s.animationsEnabled)
const setAnimationsEnabled = usePreferencesStore(s => s.setAnimationsEnabled)

// Toggle animations
setAnimationsEnabled(false) // Disable
setAnimationsEnabled(true)  // Enable
```

### Animation Functions

```typescript
import { fireworks, burstConfetti } from '../ui/celebration'

// Quick confetti burst
burstConfetti()

// Fireworks for specific duration
fireworks(3000)  // 3 seconds
fireworks(5000)  // 5 seconds (default for delivery)
```

## Troubleshooting

### Animation doesn't play
1. Check if animations are enabled in user preferences
2. Verify shipment status changed to "DELIVERED"
3. Ensure JavaScript is enabled
4. Check browser console for errors

### Animation is laggy
1. Close other browser tabs to free up GPU resources
2. Update browser to latest version
3. Check system GPU drivers

### Preference doesn't persist
1. Check browser localStorage is not disabled
2. Verify not in incognito/private mode
3. Check browser storage quota

## References

- [canvas-confetti GitHub](https://github.com/catdad/canvas-confetti)
- [canvas-confetti NPM](https://www.npmjs.com/package/canvas-confetti)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
