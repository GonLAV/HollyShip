import { createContext, useContext, useMemo, useState } from 'react'

type Lang = 'en' | 'es'

type Dict = Record<string, string>

const EN: Dict = {
  features: 'Features',
  shipments: 'Shipments',
  notifications: 'Notifications',
  starters: 'Starters',
  about: 'About',
  login: 'Login',
  logout: 'Logout',
  signIn: 'Sign in',
  loading: 'Loading…',
  noShipments: 'No shipments yet.',
  track: 'Track',
  trackingNumber: 'Tracking number',
  labelOptional: 'Label (optional)',
  destinationOptional: 'Destination (optional)',
}

const ES: Dict = {
  features: 'Funciones',
  shipments: 'Envíos',
  notifications: 'Notificaciones',
  starters: 'Inicios',
  about: 'Acerca de',
  login: 'Iniciar sesión',
  logout: 'Cerrar sesión',
  signIn: 'Iniciar sesión',
  loading: 'Cargando…',
  noShipments: 'Aún no hay envíos.',
  track: 'Rastrear',
  trackingNumber: 'Número de rastreo',
  labelOptional: 'Etiqueta (opcional)',
  destinationOptional: 'Destino (opcional)',
}

const tables: Record<Lang, Dict> = { en: EN, es: ES }

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string } | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')
  const t = useMemo(() => (key: string) => tables[lang][key] ?? key, [lang])
  const value = useMemo(() => ({ lang, setLang, t }), [lang, t])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('I18nProvider missing')
  return ctx
}
