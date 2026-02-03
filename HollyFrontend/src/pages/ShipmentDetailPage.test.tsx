import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ShipmentDetailPage from './ShipmentDetailPage'
import { usePreferencesStore } from '../state/preferences'
import * as apiClient from '../api/client'

// Mock the API client
vi.mock('../api/client', () => ({
  api: {
    getShipment: vi.fn(),
    getShipmentChain: vi.fn(),
  }
}))

// Mock the celebration module
vi.mock('../ui/celebration', () => ({
  fireworks: vi.fn(),
  burstConfetti: vi.fn(),
}))

// Mock the toaster
vi.mock('../ui/toaster', () => ({
  useToast: () => ({
    show: vi.fn(),
  })
}))

// Mock MiniMap component
vi.mock('../ui/MiniMap', () => ({
  default: () => null,
}))

describe('ShipmentDetailPage Fireworks Animation', () => {
  const mockShipment = {
    id: '123',
    label: 'Test Package',
    trackingNumber: 'TEST123',
    carrier: 'UPS',
    status: 'IN_TRANSIT',
    userId: 'user1',
    eta: null,
    origin: 'New York',
    originLat: 40.7128,
    originLng: -74.0060,
    destination: 'Los Angeles',
    destinationLat: 34.0522,
    destinationLng: -118.2437,
    currentLat: 40.7128,
    currentLng: -74.0060,
    lastEventAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    events: [
      {
        id: '1',
        canonicalStatus: 'IN_TRANSIT',
        carrierStatus: 'In Transit',
        location: 'New York',
        eventTime: new Date().toISOString(),
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    usePreferencesStore.setState({ 
      animationsEnabled: true,
      animationStyle: 'fireworks',
      soundEnabled: false,
      respectReducedMotion: true,
    })
    
    // Setup default API mocks
    vi.mocked(apiClient.api.getShipment).mockResolvedValue(mockShipment)
    vi.mocked(apiClient.api.getShipmentChain).mockResolvedValue({ 
      ok: true, 
      shipmentId: '123', 
      items: [] 
    })
  })

  it('should render animation toggle checkbox', async () => {
    render(
      <MemoryRouter initialEntries={['/shipments/123']}>
        <Routes>
          <Route path="/shipments/:id" element={<ShipmentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Check for animation toggle
    await waitFor(() => {
      const toggle = screen.getByLabelText(/Enable animations/)
      expect(toggle).toBeInTheDocument()
      expect(toggle).toBeChecked() // Default is enabled
    })
    
    // Check for animation style dropdown when animations are enabled
    await waitFor(() => {
      const styleSelect = screen.getByDisplayValue('🎆 Fireworks')
      expect(styleSelect).toBeInTheDocument()
    })
  })

  it('should toggle animations preference when checkbox is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <MemoryRouter initialEntries={['/shipments/123']}>
        <Routes>
          <Route path="/shipments/:id" element={<ShipmentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Package')).toBeInTheDocument()
    })

    // Find and click the animation toggle
    const toggle = screen.getByLabelText(/Enable animations/) as HTMLInputElement
    expect(toggle.checked).toBe(true)

    await user.click(toggle)
    
    // Verify preference store was updated
    expect(usePreferencesStore.getState().animationsEnabled).toBe(false)
    expect(toggle.checked).toBe(false)

    // Click again to re-enable
    await user.click(toggle)
    expect(usePreferencesStore.getState().animationsEnabled).toBe(true)
    expect(toggle.checked).toBe(true)
  })

  it('should reflect initial preference state in checkbox', async () => {
    // Set animations to disabled before rendering
    usePreferencesStore.setState({ animationsEnabled: false })
    
    render(
      <MemoryRouter initialEntries={['/shipments/123']}>
        <Routes>
          <Route path="/shipments/:id" element={<ShipmentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Verify toggle reflects disabled state
    await waitFor(() => {
      const toggle = screen.getByLabelText(/Enable animations/) as HTMLInputElement
      expect(toggle.checked).toBe(false)
    })
  })
})

