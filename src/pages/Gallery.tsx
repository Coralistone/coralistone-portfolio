import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import DemoIntro from '../components/DemoIntro'
import { LiveRegion, Modal } from '../components/a11y'
import { useLang, useT, type L } from '../i18n'

type Kind = 'photo' | 'video' | 'doc'
type Media = { id: number; subject: number; kind: Kind; campaign: number; date: Date; hue: number; sizeMb: number }

const CAMPAIGNS: L[] = [
  { fr: 'Printemps', en: 'Spring' }, { fr: 'Salon Paris', en: 'Paris trade show' }, { fr: 'Produit X', en: 'Product X' },
  { fr: 'Corporate', en: 'Corporate' }, { fr: 'Réseaux sociaux', en: 'Social media' }, { fr: 'Presse', en: 'Press' },
]
const SUBJECTS: L[] = [
  { fr: 'Atelier', en: 'Workshop' }, { fr: 'Équipe', en: 'Team' }, { fr: 'Packshot', en: 'Packshot' }, { fr: 'Vitrine', en: 'Shopfront' },
  { fr: 'Interview', en: 'Interview' }, { fr: 'Événement', en: 'Event' }, { fr: 'Paysage', en: 'Landscape' }, { fr: 'Logo', en: 'Logo' },
  { fr: 'Brochure', en: 'Brochure' }, { fr: 'Portrait', en: 'Portrait' },
]
const KINDS: Record<Kind, L> = { photo: { fr: 'Photo', en: 'Photo' }, video: { fr: 'Vidéo', en: 'Video' }, doc: { fr: 'Document', en: 'Document' } }
const KIND_POOL: Kind[] = ['photo', 'photo', 'photo', 'video', 'doc']
const ICON: Record<Kind, string> = { photo: '▣', video: '▶', doc: '▤' }

/** Jeu de données déterministe : 2 000 médias générés localement. */
function makeMedia(n: number): Media[] {
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: n }, (_, i) => {
    const kind = KIND_POOL[Math.floor(rnd() * KIND_POOL.length)]
    return {
      id: i + 1, kind,
      subject: Math.floor(rnd() * SUBJECTS.length),
      campaign: Math.floor(rnd() * CAMPAIGNS.length),
      date: new Date(2026, 0, 1 + Math.floor(rnd() * 300)),
      hue: Math.floor(rnd() * 360),
      sizeMb: kind === 'video' ? Math.round(rnd() * 400 + 20) : Math.round((rnd() * 8 + 0.4) * 10) / 10,
    }
  })
}
const ALL = makeMedia(2000)

const ROW_H = 196
const MIN_COL_W = 170

function Thumb({ m, big }: { m: Media; big?: boolean }) {
  return (
    <div aria-hidden="true" style={{
      height: big ? 280 : 110, borderRadius: 8, display: 'grid', placeItems: 'center',
      background: `linear-gradient(135deg, hsl(${m.hue} 70% 55%), hsl(${(m.hue + 50) % 360} 65% 35%))`,
      color: 'rgba(255,255,255,.92)', fontSize: big ? 64 : 30,
    }}>{ICON[m.kind]}</div>
  )
}

export default function Gallery() {
  const t = useT()
  const { lang } = useLang()
  const locale = lang === 'en' ? 'en-GB' : 'fr-FR'
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<Kind | 'all'>('all')
  const [focusIndex, setFocusIndex] = useState(0)
  const [viewer, setViewer] = useState<number | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [width, setWidth] = useState(900)
  const box = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef(false)

  const title = (m: Media) => `${SUBJECTS[m.subject][lang]} ${String(m.id).padStart(4, '0')}`
  const fmtDate = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  const fmtSize = (m: Media) => `${m.sizeMb.toLocaleString(locale)} ${lang === 'en' ? 'MB' : 'Mo'}`

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ALL.filter((m) => (kind === 'all' || m.kind === kind) &&
      (!q || `${SUBJECTS[m.subject][lang]} ${String(m.id).padStart(4, '0')} ${CAMPAIGNS[m.campaign][lang]}`.toLowerCase().includes(q)))
  }, [query, kind, lang])

  useEffect(() => { setFocusIndex(0); box.current?.scrollTo(0, 0) }, [items])

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cols = Math.max(1, Math.floor((width - 16) / MIN_COL_W))
  const rows = Math.ceil(items.length / cols)
  const viewH = 600
  const first = Math.max(0, Math.floor(scrollTop / ROW_H) - 2)
  const last = Math.min(rows, Math.ceil((scrollTop + viewH) / ROW_H) + 2)
  const visible = items.slice(first * cols, last * cols)

  // Navigation clavier : la cellule focalisée est toujours rendue, puis focalisée
  const goTo = (i: number) => {
    const n = Math.min(items.length - 1, Math.max(0, i))
    setFocusIndex(n)
    const row = Math.floor(n / cols)
    const el = box.current!
    if (row * ROW_H < el.scrollTop) el.scrollTop = row * ROW_H
    else if ((row + 1) * ROW_H > el.scrollTop + el.clientHeight) el.scrollTop = (row + 1) * ROW_H - el.clientHeight
    pendingFocus.current = true
  }
  useEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    box.current?.querySelector<HTMLElement>(`[data-index="${focusIndex}"]`)?.focus()
  })

  const onKeyDown = (e: KeyboardEvent) => {
    const page = Math.floor(viewH / ROW_H) * cols
    const map: Record<string, number> = {
      ArrowRight: focusIndex + 1, ArrowLeft: focusIndex - 1, ArrowDown: focusIndex + cols, ArrowUp: focusIndex - cols,
      Home: e.ctrlKey ? 0 : focusIndex - (focusIndex % cols), End: e.ctrlKey ? items.length - 1 : focusIndex - (focusIndex % cols) + cols - 1,
      PageDown: focusIndex + page, PageUp: focusIndex - page,
    }
    if (e.key in map) { e.preventDefault(); goTo(map[e.key]) }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setViewer(focusIndex) }
  }

  const current = viewer !== null ? items[viewer] : null
  const count = items.length.toLocaleString(locale)
  const selectStyle = { font: '16px var(--body)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--muted)', background: 'var(--surface)', color: 'var(--fg)' }

  return (
    <>
      <DemoIntro
        kicker={t('Démo 2 · Performance + accessibilité', 'Demo 2 · Performance + accessibility')}
        title={t('Galerie de médias accessible', 'Accessible media gallery')}
        lead={t(
          "Une médiathèque de 2 000 médias, dans l'esprit d'un DAM : recherche, filtres, visionneuse. Rapide même avec des milliers d'éléments, et entièrement utilisable au clavier.",
          'A 2,000-item media library in the spirit of a DAM: search, filters, viewer. Fast even with thousands of items, and fully keyboard-operable.',
        )}
        problem={t(
          <>Une grille de milliers de vignettes ralentit le navigateur, et la virtualisation (n'afficher que ce qui est visible) casse souvent la navigation au clavier et les lecteurs d'écran. Ici, les deux contraintes sont tenues ensemble.</>,
          <>A grid of thousands of thumbnails slows the browser down, and virtualisation (rendering only what is visible) often breaks keyboard navigation and screen readers. Here, both constraints are handled together.</>,
        )}
        tryIt={t(
          [<>Cliquez sur une vignette, puis utilisez les flèches, <kbd>Page ↓</kbd> et <kbd>Ctrl</kbd> + <kbd>Fin</kbd> pour parcourir les 2 000 médias.</>, <>Appuyez sur <kbd>Entrée</kbd> : la visionneuse s'ouvre, avec Précédent / Suivant.</>, <>Tapez « Packshot » ou filtrez par type : le nombre de résultats est annoncé.</>],
          [<>Click a thumbnail, then use the arrow keys, <kbd>Page ↓</kbd> and <kbd>Ctrl</kbd> + <kbd>End</kbd> to browse all 2,000 items.</>, <>Press <kbd>Enter</kbd>: the viewer opens, with Previous / Next.</>, <>Type “Packshot” or filter by type: the number of results is announced.</>],
        )}
        under={t(
          [<>Virtualisation maison : environ 30 éléments dans le DOM au lieu de 2 000.</>, <>Le média focalisé est toujours rendu, puis focalisé après défilement.</>, <>Nom accessible complet sur chaque vignette (type, campagne, date, position).</>],
          [<>Custom virtualisation: about 30 DOM nodes instead of 2,000.</>, <>The focused item is always rendered, then focused after scrolling.</>, <>Full accessible name on every thumbnail (type, campaign, date, position).</>],
        )}
        stack={['React', 'TypeScript', t('Virtualisation', 'Virtualisation'), 'ResizeObserver']}
      />

      <section className="demo-section" aria-labelledby="g-h">
        <div className="wrap">
          <h2 id="g-h" className="sr-only">{t('Médiathèque', 'Media library')}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'end', marginBottom: 16 }}>
            <div className="ax-field" style={{ margin: 0, flex: '1 1 260px' }}>
              <label htmlFor="g-search">{t('Rechercher un média', 'Search media')}</label>
              <input id="g-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Ex. : Packshot, Salon Paris…', 'e.g. Packshot, Paris trade show…')} />
            </div>
            <div className="ax-field" style={{ margin: 0 }}>
              <label htmlFor="g-type">Type</label>
              <select id="g-type" value={kind} onChange={(e) => setKind(e.target.value as Kind | 'all')} style={selectStyle}>
                <option value="all">{t('Tous', 'All')}</option>
                {(Object.keys(KINDS) as Kind[]).map((k) => <option key={k} value={k}>{KINDS[k][lang]}</option>)}
              </select>
            </div>
            <p style={{ margin: 0, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }} aria-hidden="true">{count} {t('médias', 'items')}</p>
          </div>
          <LiveRegion message={t(`${count} médias affichés`, `${count} items shown`)} />
          <p id="g-help" style={{ color: 'var(--muted)', fontSize: 15, margin: '0 0 10px' }}>
            {t(<>Dans la grille : flèches pour se déplacer, <kbd>Page ↑</kbd> <kbd>Page ↓</kbd> pour défiler, <kbd>Entrée</kbd> pour ouvrir.</>,
              <>In the grid: arrow keys to move, <kbd>Page ↑</kbd> <kbd>Page ↓</kbd> to scroll, <kbd>Enter</kbd> to open.</>)}
          </p>

          <div
            ref={box} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            style={{ height: viewH, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface)', position: 'relative' }}
          >
            {items.length === 0 ? (
              <p style={{ padding: 24 }}>{t('Aucun média ne correspond à cette recherche.', 'No media matches this search.')}</p>
            ) : (
              <ul
                role="list" aria-label={t('Médias', 'Media')} aria-describedby="g-help" onKeyDown={onKeyDown}
                style={{ listStyle: 'none', margin: 0, padding: 8, height: rows * ROW_H + 16, position: 'relative' }}
              >
                {visible.map((m, k) => {
                  const i = first * cols + k
                  const row = Math.floor(i / cols), col = i % cols
                  return (
                    <li key={m.id} style={{ position: 'absolute', top: 8 + row * ROW_H, left: `calc(8px + ${col} * (100% - 16px) / ${cols})`, width: `calc((100% - 16px) / ${cols})`, padding: 6 }}>
                      <button
                        type="button" data-index={i} tabIndex={i === focusIndex ? 0 : -1}
                        aria-label={t(
                          `${title(m)}, ${KINDS[m.kind].fr}, campagne ${CAMPAIGNS[m.campaign].fr}, ${fmtDate(m.date)}. Média ${i + 1} sur ${items.length}`,
                          `${title(m)}, ${KINDS[m.kind].en}, ${CAMPAIGNS[m.campaign].en} campaign, ${fmtDate(m.date)}. Item ${i + 1} of ${items.length}`,
                        )}
                        onClick={() => { setFocusIndex(i); setViewer(i) }} onFocus={() => setFocusIndex(i)}
                        style={{ all: 'unset', boxSizing: 'border-box', display: 'block', width: '100%', height: ROW_H - 12, padding: 8, borderRadius: 10, cursor: 'pointer', border: '1px solid var(--line)' }}
                        className="g-tile"
                      >
                        <Thumb m={m} />
                        <span style={{ display: 'block', fontWeight: 600, marginTop: 8, fontSize: 15 }}>{title(m)}</span>
                        <span style={{ display: 'block', color: 'var(--muted)', fontSize: 13 }}>{KINDS[m.kind][lang]} · {CAMPAIGNS[m.campaign][lang]}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <ul className="checklist">
            <li>{t('Virtualisation maison : environ 30 éléments dans le DOM au lieu de 2 000', 'Custom virtualisation: about 30 DOM nodes instead of 2,000')}</li>
            <li>{t('Roving tabindex, nom accessible complet sur chaque média, nombre de résultats annoncé (RGAA 7.1, 7.5, 12.8)', 'Roving tabindex, full accessible name on every item, result count announced (RGAA 7.1, 7.5, 12.8)')}</li>
          </ul>
        </div>
      </section>

      <Modal open={current !== null} onClose={() => setViewer(null)} title={current ? title(current) : ''}>
        {current && (
          <>
            <Thumb m={current} big />
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', margin: '16px 0' }}>
              <dt style={{ color: 'var(--muted)' }}>Type</dt><dd style={{ margin: 0 }}>{KINDS[current.kind][lang]}</dd>
              <dt style={{ color: 'var(--muted)' }}>{t('Campagne', 'Campaign')}</dt><dd style={{ margin: 0 }}>{CAMPAIGNS[current.campaign][lang]}</dd>
              <dt style={{ color: 'var(--muted)' }}>Date</dt><dd style={{ margin: 0 }}>{fmtDate(current.date)}</dd>
              <dt style={{ color: 'var(--muted)' }}>{t('Poids', 'Size')}</dt><dd style={{ margin: 0 }}>{fmtSize(current)}</dd>
            </dl>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <button type="button" className="ax-btn secondary" disabled={viewer === 0} onClick={() => setViewer((v) => (v ?? 1) - 1)}>← {t('Précédent', 'Previous')}</button>
              <span aria-live="polite" style={{ alignSelf: 'center', color: 'var(--muted)', fontSize: 15 }}>{(viewer ?? 0) + 1} / {items.length}</span>
              <button type="button" className="ax-btn secondary" disabled={viewer === items.length - 1} onClick={() => setViewer((v) => (v ?? 0) + 1)}>{t('Suivant', 'Next')} →</button>
            </div>
          </>
        )}
      </Modal>
      <style>{`.g-tile:hover{background:var(--accent-soft)} .g-tile:focus-visible{outline:3px solid var(--accent);outline-offset:2px}`}</style>
      <div style={{ height: 48 }} />
    </>
  )
}
