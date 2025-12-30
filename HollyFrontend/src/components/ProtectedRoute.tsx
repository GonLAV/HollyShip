import { Navigate, useLocation } from 'react-router-dom'
import { useSessionStore } from '../state/session'
import { ReactNode } from 'react'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useSessionStore(s => s.token)
  const loc = useLocation()
  if (!token) {
    return <Navigate to={`/login?from=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  }
  return <>{children}</>
}
