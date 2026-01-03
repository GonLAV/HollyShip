import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

// Mock the session store
vi.mock('./state/session', () => ({
  useSessionStore: vi.fn((selector) => {
    const state = {
      token: null,
      clear: vi.fn(),
    }
    return selector ? selector(state) : state
  }),
}))

// Mock child components to simplify testing
vi.mock('./pages/FeaturesPage', () => ({
  default: () => <div>Features Page</div>,
}))

vi.mock('./components/StatsBanner', () => ({
  default: () => <div>Stats Banner</div>,
}))

describe('App Accessibility', () => {
  it('has proper navigation landmarks', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
    
    // Check for banner role (header)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    
    // Check for navigation
    expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBeInTheDocument()
    
    // Check for main content
    expect(screen.getByRole('main')).toBeInTheDocument()
    
    // Check for contentinfo (footer)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('has skip to content link', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
    
    const skipLink = screen.getByText('Skip to content')
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute('href', '#main')
  })

  it('has accessible navigation links', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
    
    expect(screen.getByRole('link', { name: /hollyship home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /features page/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /shipments page/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /starters page/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /about page/i })).toBeInTheDocument()
  })

  it('has accessible theme toggle button', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
    
    const themeButton = screen.getByRole('button', { name: /switch to dark mode/i })
    expect(themeButton).toBeInTheDocument()
    expect(themeButton).toHaveAttribute('aria-pressed')
  })

  it('has accessible language selector', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
    
    const langSelect = screen.getByRole('combobox', { name: /select language/i })
    expect(langSelect).toBeInTheDocument()
    expect(langSelect).toHaveAttribute('title', 'Change language')
  })

  it('theme toggle button changes aria-label based on current theme', async () => {
    const user = userEvent.setup()
    
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
    
    // Initially should show "Switch to dark mode" (in light mode)
    const themeButton = screen.getByRole('button', { name: /switch to dark mode/i })
    expect(themeButton).toBeInTheDocument()
    
    // Click to toggle
    await user.click(themeButton)
    
    // After clicking, should show "Switch to light mode"
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument()
  })

  it('has accessible login/logout button', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
    
    // When not logged in (token is null in mock), should show login link
    expect(screen.getByRole('link', { name: /login page/i })).toBeInTheDocument()
  })
})
