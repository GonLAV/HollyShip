import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SessionState = {
  token: string | null
  userId: string | null
  email: string | null
  setSession: (s: { token: string; userId: string; email: string | null }) => void
  clear: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      email: null,
      setSession: ({ token, userId, email }) => set({ token, userId, email }),
      clear: () => set({ token: null, userId: null, email: null }),
    }),
    { name: 'holly-session' }
  )
)
