import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import Home from './pages/Home'
import ComponentsDemo from './pages/ComponentsDemo'
import Gallery from './pages/Gallery'
import Audit from './pages/Audit'
import Billet from './pages/Billet'
import Social from './components/Social'
import { MoonIcon, SunIcon } from './components/Icons'
import { profile } from './data/profile'
import { useLang, useT } from './i18n'

const routes: Record<string, { el: () => ReactNode; title: [string, string] }> = {
  '/': { el: () => <Home />, title: [`${profile.name} · ${profile.title}`, `${profile.name} · ${profile.title}`] },
  '/composants': { el: () => <ComponentsDemo />, title: ['Composants accessibles', 'Accessible components'] },
  '/galerie': { el: () => <Gallery />, title: ['Galerie de médias accessible', 'Accessible media gallery'] },
  '/audit': { el: () => <Audit />, title: ["Audit d'accessibilité", 'Accessibility audit'] },
  '/billet': { el: () => <Billet />, title: ['Zeeven, billets à QR code', 'Zeeven, QR-code tickets'] },
}

/** Lien interne : navigation sans rechargement, gère aussi les ancres (/#about). */
export function Link({ to, children, className, ...rest }: { to: string; children: ReactNode; className?: string; [k: string]: unknown }) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    navigate(to)
  }
  return <a href={to} onClick={onClick} className={className} {...rest}>{children}</a>
}

export function navigate(to: string) {
  const [path, hash] = to.split('#')
  if (path && path !== location.pathname) history.pushState({}, '', to)
  else if (hash) history.replaceState({}, '', to)
  window.dispatchEvent(new Event('locationchange'))
}

type Theme = 'light' | 'dark'
function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch { /* ignore */ }
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('theme', theme) } catch { /* ignore */ }
  }, [theme])
  return [theme, setTheme] as const
}

export default function App() {
  const [path, setPath] = useState(location.pathname)
  const [theme, setTheme] = useTheme()
  const { lang, setLang } = useLang()
  const t = useT()

  useEffect(() => {
    const sync = () => setPath(location.pathname)
    window.addEventListener('popstate', sync)
    window.addEventListener('locationchange', sync)
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('locationchange', sync) }
  }, [])

  const route = routes[path] ?? routes['/']
  const title = path === '/' ? route.title[0] : `${t(route.title[0], route.title[1])} · ${profile.name}`

  useEffect(() => { document.title = title }, [title])
  useEffect(() => {
    const hash = location.hash.slice(1)
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView())
    else window.scrollTo(0, 0)
    // RGAA 12 : après un changement de page, le focus revient au contenu principal
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [path])

  return (
    <>
      <a className="skip" href="#main">{t('Aller au contenu', 'Skip to content')}</a>
      <header className="nav">
        <div className="wrap">
          <Link to="/" className="logo" aria-label={t('Accueil', 'Home')}>&lt;CM <span>/</span>&gt;</Link>
          <nav aria-label={t('Navigation principale', 'Main navigation')}>
            <ul>
              <li className="opt"><Link to="/#about">{t('À propos', 'About')}</Link></li>
              <li><Link to="/#demos" aria-current={path !== '/' ? 'page' : undefined}>{t('Démos', 'Demos')}</Link></li>
              <li className="opt"><Link to="/#experience">{t('Expérience', 'Experience')}</Link></li>
              <li className="opt"><Link to="/#projects">{t('Projets', 'Projects')}</Link></li>
              <li><Link to="/#contact">Contact</Link></li>
            </ul>
          </nav>
          <div className="toolbar">
            <div className="lang-switch" role="group" aria-label={t('Langue', 'Language')}>
              <button type="button" aria-pressed={lang === 'fr'} onClick={() => setLang('fr')} lang="fr"><span aria-hidden="true">FR</span><span className="sr-only">Français</span></button>
              <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')} lang="en"><span aria-hidden="true">EN</span><span className="sr-only">English</span></button>
            </div>
            <button type="button" className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? t('Passer en mode clair', 'Switch to light mode') : t('Passer en mode sombre', 'Switch to dark mode')}>
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} style={{ outline: 'none' }}>{route.el()}</main>
      <footer className="site-footer">
        <div className="wrap">
          <Social />
          <p>
            {t('Conçu et développé avec', 'Designed and built with')} <span className="heart" aria-hidden="true">♥</span>
            <span className="sr-only">{t('amour', 'love')}</span> {t('par', 'by')} <strong>{profile.fullName}</strong>
            {t(' en React + TypeScript, dans le respect du RGAA.', ' in React + TypeScript, following accessibility standards (RGAA / WCAG).')}
          </p>
          <p className="fine">© {new Date().getFullYear()} {profile.fullName} · <a href={profile.repo} target="_blank" rel="noopener noreferrer">{t('Code source de ce site', 'Source code of this site')}<span className="sr-only">{t(' (nouvel onglet)', ' (new tab)')}</span></a></p>
        </div>
      </footer>
    </>
  )
}
