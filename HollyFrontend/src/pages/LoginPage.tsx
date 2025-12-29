import { FormEvent, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useSessionStore } from '../state/session'
import { useToast } from '../ui/toaster'

export default function LoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setSession = useSessionStore(s => s.setSession)

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [serverCode, setServerCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { show } = useToast()

  async function start(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await api.startEmailAuth(email)
      setServerCode(res.code)
      setCode(res.code) // for MVP convenience
      show('Verification code sent')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to start auth')
      show('Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await api.verifyEmailAuth(email, code)
      setSession({ token: res.token, userId: res.userId, email: res.email })
      const dest = params.get('from') || '/shipments'
      navigate(dest, { replace: true })
      show('Signed in')
    } catch (err: any) {
      setError(err?.message ?? 'Verification failed')
      show('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Sign in</h1>
      <p>Enter your email to receive a 6-digit code. For MVP, the server returns the code directly.</p>

      <form onSubmit={start} className="login-form">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </label>
        <button type="submit" disabled={loading || !email}>Send code</button>
      </form>

      {serverCode && (
        <div className="notice">Code for demo: <strong>{serverCode}</strong></div>
      )}

      <form onSubmit={verify} className="login-form">
        <label>
          Code
          <input inputMode="numeric" pattern="[0-9]*" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" required />
        </label>
        <button type="submit" disabled={loading || !code}>Verify</button>
      </form>

      {error && <div className="error" role="alert">{error}</div>}
    </div>
  )
}
