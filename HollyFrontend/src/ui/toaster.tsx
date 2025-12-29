import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Toast = { id: number; message: string }

type ToastCtx = {
  toasts: Toast[]
  show: (message: string) => void
  remove: (id: number) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const value = useMemo<ToastCtx>(() => ({
    toasts,
    show: (message: string) => setToasts((arr) => [...arr, { id: Date.now() + Math.random(), message }]),
    remove: (id: number) => setToasts((arr) => arr.filter(t => t.id !== id)),
  }), [toasts])
  return <Ctx.Provider value={value}>{children}<ToastContainer /></Ctx.Provider>
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('ToastProvider missing')
  return ctx
}

function ToastContainer() {
  const { toasts, remove } = useToast()
  useEffect(() => {
    const timers = toasts.map(t => setTimeout(() => remove(t.id), 3000))
    return () => { timers.forEach(clearTimeout) }
  }, [toasts, remove])
  return (
    <div className="toasts" aria-live="polite" aria-atomic="true">
      {toasts.map(t => (
        <div key={t.id} className="toast">{t.message}</div>
      ))}
    </div>
  )
}
