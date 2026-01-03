import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from './ErrorBoundary'

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('displays error UI when an error is thrown', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
    expect(screen.getByText(/Test error message/)).toBeInTheDocument()
    
    consoleSpy.mockRestore()
  })

  it('has proper accessibility attributes', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    const errorContainer = screen.getByRole('alert')
    expect(errorContainer).toHaveAttribute('aria-live', 'assertive')
    
    consoleSpy.mockRestore()
  })

  it('shows reload button that is keyboard accessible', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    const reloadButton = screen.getByRole('button', { name: /reload the page/i })
    expect(reloadButton).toBeInTheDocument()
    expect(reloadButton).toHaveAttribute('aria-label', 'Reload the page')
    
    consoleSpy.mockRestore()
  })

  it('shows error details in an expandable section', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    const detailsSummary = screen.getByText('Error Details')
    expect(detailsSummary).toBeInTheDocument()
    expect(screen.getByText(/Test error message/)).toBeInTheDocument()
    
    consoleSpy.mockRestore()
  })
})
