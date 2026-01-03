import { Component, ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: any }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div 
          role="alert" 
          aria-live="assertive"
          style={{
            padding: '2rem',
            margin: '2rem auto',
            maxWidth: '600px',
            background: 'var(--card)',
            border: '2px solid var(--danger)',
            borderRadius: '12px',
            textAlign: 'center'
          }}
        >
          <h1 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>⚠️ Something went wrong</h1>
          <p style={{ marginBottom: '1rem', color: 'var(--muted)' }}>
            We encountered an unexpected error. Please try refreshing the page.
          </p>
          <details style={{ textAlign: 'left', marginTop: '1.5rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '0.5rem' }}>
              Error Details
            </summary>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              background: 'var(--bg)', 
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              overflow: 'auto'
            }}>
              {String(this.state.error)}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              padding: '10px 20px',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 600
            }}
            aria-label="Reload the page"
          >
            🔄 Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
