import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import StartersIndex from './starters/StartersIndex'
import StartersRouter from './starters/StartersRouter'
import FeaturesPage from './pages/FeaturesPage'
import LoginPage from './pages/LoginPage'
import ShipmentsPage from './pages/ShipmentsPage'
import ShipmentDetailPage from './pages/ShipmentDetailPage'
import ProtectedRoute from './components/ProtectedRoute'
import { useSessionStore } from './state/session'
import { useEffect, useState } from 'react'
import StatsBanner from './components/StatsBanner'
import { ToastProvider } from './ui/toaster'
import { I18nProvider, useI18n } from './i18n'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  const token = useSessionStore(s => s.token)
  const clear = useSessionStore(s => s.clear)
  const navigate = useNavigate()
  const [theme, setTheme] = useTheme()

  function logout() {
    clear()
    navigate('/', { replace: true })
  }
  return (
    <div className="app">
      <a href="#main" className="skip">Skip to content</a>
      <I18nProvider>
      <ToastProvider>
      <ErrorBoundary>
      <header>
        <nav className="topnav" aria-label="Primary">
          <div className="brand"><Link to="/">HollyShip</Link></div>
          <div className="spacer" />
          <NavLink to="/" end><NavLabel k="features" /></NavLink>
          <NavLink to="/shipments"><NavLabel k="shipments" /></NavLink>
          <NavLink to="/starters"><NavLabel k="starters" /></NavLink>
          <NavLink to="/about"><NavLabel k="about" /></NavLink>
          <button className="chip" aria-label="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Light' : 'Dark'} mode
          </button>
          <LangSwitcher />
          {!token ? (
            <NavLink to="/login"><NavLabel k="login" /></NavLink>
          ) : (
            <a href="#" onClick={(e) => { e.preventDefault(); logout() }}><NavLabel k="logout" /></a>
          )}
        </nav>
      </header>
      <main id="main" role="main">
        <StatsBanner />
        <Routes>
          <Route path="/" element={<FeaturesPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/shipments" element={<ProtectedRoute><ShipmentsPage /></ProtectedRoute>} />
          <Route path="/shipments/:id" element={<ProtectedRoute><ShipmentDetailPage /></ProtectedRoute>} />
          <Route path="/starters" element={<StartersIndex />} />
          <Route path="/starters/:slug" element={<StartersRouter />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer>
        <small>© {new Date().getFullYear()} HollyShip</small>
      </footer>
      </ErrorBoundary>
      </ToastProvider>
      </I18nProvider>
    </div>
  )
}

function About() {
  return (
    <div>
      <h1>About HollyShip</h1>
      <p>This is a lightweight UI to explore the “100 Feature Ideas”.</p>
      <p>Next steps could include connecting to the backend, adding auth, and mapping.</p>
    </div>
  )
}

function NotFound() {
  return (
    <div>
      <h1>Page not found</h1>
      <p>Use the navigation to get back on track.</p>
    </div>
  )
}

type Theme = 'light' | 'dark'
function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored === 'light' || stored === 'dark') return stored
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  return [theme, setTheme]
}

function NavLabel({ k }: { k: string }) {
  const { t } = useI18n()
  return <>{t(k)}</>
}

function LangSwitcher() {
  const { lang, setLang } = useI18n()
  return (
    <select aria-label="Language" className="chip" value={lang} onChange={(e) => setLang(e.target.value as any)}>
      <option value="en">EN</option>
      <option value="es">ES</option>
    </select>
  )
}
