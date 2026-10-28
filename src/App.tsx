import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import Home from './pages/Home'
import ComponentsDemo from './pages/ComponentsDemo'
import Gallery from './pages/Gallery'
import Audit from './pages/Audit'
import Billet from './pages/Billet'
import Food from './pages/Food'
import Ludo from './pages/Ludo'
import Carte from './pages/Carte'
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
  '/food': { el: () => <Food />, title: ['Clone Uber Eats', 'Uber Eats clone'] },
  '/ludo': { el: () => <Ludo />, title: ['Ludo', 'Ludo'] },
  '/dames': { el: () => <Ludo />, title: ['Ludo', 'Ludo'] },
  '/carte': { el: () => <Carte />, title: ["Cartographie d'adressage", 'Address mapping'] },
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

/** Fait défiler jusqu'à une section ; réessaie le temps que la page soit rendue. */
export function scrollToId(id: string, tries = 12) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ block: 'start' })
    // RGAA 12.7 : le focus suit la section atteinte (lecteurs d'écran, clavier)
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
    el.focus({ preventScroll: true })
  } else if (tries > 0) requestAnimationFrame(() => scrollToId(id, tries - 1))
}

/**
 * Navigation interne.
 * - même page + ancre : défilement direct vers la section ;
 * - autre page : on mémorise la position actuelle dans l'historique,
 *   pour que « Retour » (bouton du site ou du navigateur) ramène exactement au même endroit.
 */
export function navigate(to: string) {
  const [rawPath, hash] = to.split('#')
  const path = rawPath || location.pathname
  if (path === location.pathname) {
    history.replaceState(history.state, '', hash ? `${path}#${hash}` : path)
    if (hash) scrollToId(hash)
    else window.scrollTo({ top: 0 })
    return
  }
  history.replaceState({ ...(history.state ?? {}), scrollY: window.scrollY }, '')
  history.pushState({ from: location.pathname }, '', to)
  window.dispatchEvent(new Event('locationchange'))
}

/** Retour : revient à la page précédente du site si possible, sinon à la section Démos. */
export function goBack() {
  if (history.state?.from) history.back()
  else navigate('/#demos')
}

/** Navigation principale, dans l'ordre des sections de la page d'accueil */
const NAV: [string, string, string, boolean][] = [
  ['about', 'À propos', 'About', true],
  ['experience', 'Expérience', 'Experience', true],
  ['projects', 'Projets', 'Projects', true],
  ['demos', 'Démos', 'Demos', false],
  ['contact', 'Contact', 'Contact', false],
]

/** Section visible à l'écran (scroll-spy) : la dernière dont le haut a dépassé l'en-tête. */
function useActiveSection(path: string) {
  const [active, setActive] = useState('')
  useEffect(() => {
    if (path !== '/') { setActive('demos'); return }
    const ids = NAV.map(([id]) => id)
    const onScroll = () => {
      let cur = ''
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 140) cur = id
      }
      // en bas de page, la dernière section (Contact) devient active
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = ids[ids.length - 1]
      setActive(cur)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [path])
  return active
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
  const active = useActiveSection(path)
  const { lang, setLang } = useLang()
  const t = useT()

  const restoreY = useRef<number | null>(null)

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    const onPop = (e: PopStateEvent) => {
      restoreY.current = typeof e.state?.scrollY === 'number' ? e.state.scrollY : null
      setPath(location.pathname)
    }
    const onNav = () => { restoreY.current = null; setPath(location.pathname) }
    window.addEventListener('popstate', onPop)
    window.addEventListener('locationchange', onNav)
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('locationchange', onNav) }
  }, [])

  const route = routes[path] ?? routes['/']
  const title = path === '/' ? route.title[0] : `${t(route.title[0], route.title[1])} · ${profile.name}`

  useEffect(() => { document.title = title }, [title])
  useEffect(() => {
    const y = restoreY.current
    restoreY.current = null
    const hash = location.hash.slice(1)
    document.getElementById('main')?.focus({ preventScroll: true }) // RGAA 12 : focus sur le contenu après changement de page
    if (y !== null) {
      // Retour arrière : on revient exactement à la position précédente (réappliquée le temps que les images se chargent)
      const apply = () => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior })
      requestAnimationFrame(apply); setTimeout(apply, 120); setTimeout(apply, 400)
    } else if (hash) scrollToId(hash)
    else window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [path])

  return (
    <>
      <a className="skip" href="#main">{t('Aller au contenu', 'Skip to content')}</a>
      <header className="nav">
        <div className="wrap">
          <Link to="/" className="logo" aria-label={t('Accueil', 'Home')}>&lt;CM <span>/</span>&gt;</Link>
          <nav aria-label={t('Navigation principale', 'Main navigation')}>
            <ul>
              {NAV.map(([id, fr, en, opt]) => (
                <li key={id} className={opt ? 'opt' : undefined}>
                  <Link to={`/#${id}`} className={active === id ? 'active' : undefined} aria-current={active === id ? (path === '/' ? 'location' : 'page') : undefined}>{t(fr, en)}</Link>
                </li>
              ))}
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
