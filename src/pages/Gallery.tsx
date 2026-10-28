import { useEffect, useMemo, useState } from 'react'
import JSZip from 'jszip'
import DemoIntro from '../components/DemoIntro'
import { LiveRegion, Modal } from '../components/a11y'
import { useLang, useT, type L } from '../i18n'
import './gallery.css'

/* ===================================================================== Données (fictives) */
type Kind = 'photo' | 'video' | 'doc'
type Status = 'draft' | 'published' | 'archived'
type Ratio = 'free' | '1:1' | '16:9' | '4:5'
type Media = {
  id: number; subject: number; kind: Kind; status: Status; campaign: number; color: number
  date: Date; hue: number; sizeMb: number; w: number; h: number; ratio: Ratio
}

const SUBJECTS: { label: L; emoji: string }[] = [
  { label: { fr: 'Plage paradisiaque', en: 'Paradise beach' }, emoji: '🏝️' },
  { label: { fr: 'Étoile de mer', en: 'Starfish' }, emoji: '⭐' },
  { label: { fr: 'Champignons forestiers', en: 'Forest mushrooms' }, emoji: '🍄' },
  { label: { fr: 'Marinière', en: 'Breton top' }, emoji: '👕' },
  { label: { fr: 'Packshot produit', en: 'Product packshot' }, emoji: '📦' },
  { label: { fr: 'Portrait équipe', en: 'Team portrait' }, emoji: '🧑‍💼' },
  { label: { fr: 'Paysage montagne', en: 'Mountain landscape' }, emoji: '🏔️' },
  { label: { fr: 'Logo campagne', en: 'Campaign logo' }, emoji: '🔷' },
  { label: { fr: 'Brochure', en: 'Brochure' }, emoji: '📄' },
  { label: { fr: 'Interview', en: 'Interview' }, emoji: '🎙️' },
  { label: { fr: 'Événement', en: 'Event' }, emoji: '🎉' },
  { label: { fr: 'Vitrine magasin', en: 'Shop window' }, emoji: '🛍️' },
]
const CAMPAIGNS: L[] = [{ fr: 'Printemps', en: 'Spring' }, { fr: 'Salon Paris', en: 'Paris show' }, { fr: 'Produit X', en: 'Product X' }, { fr: 'Corporate', en: 'Corporate' }, { fr: 'Réseaux sociaux', en: 'Social media' }]
const COLORS: { label: L; css: string; hue: number }[] = [
  { label: { fr: 'Bleu', en: 'Blue' }, css: '#2f6fde', hue: 215 }, { label: { fr: 'Vert', en: 'Green' }, css: '#2a9d55', hue: 140 },
  { label: { fr: 'Rouge', en: 'Red' }, css: '#e5383b', hue: 0 }, { label: { fr: 'Jaune', en: 'Yellow' }, css: '#e9b200', hue: 45 },
  { label: { fr: 'Violet', en: 'Purple' }, css: '#7c3aed', hue: 270 },
]
const KINDS: Record<Kind, { label: L; fmt: string[] }> = {
  photo: { label: { fr: 'Image', en: 'Image' }, fmt: ['JPG', 'PNG'] },
  video: { label: { fr: 'Vidéo', en: 'Video' }, fmt: ['MP4'] },
  doc: { label: { fr: 'Document', en: 'Document' }, fmt: ['PDF'] },
}
const STATUS: Record<Status, L> = {
  draft: { fr: 'Brouillon', en: 'Draft' }, published: { fr: 'Publié', en: 'Published' }, archived: { fr: 'Archivé', en: 'Archived' },
}

function makeMedia(n: number): Media[] {
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const kinds: Kind[] = ['photo', 'photo', 'photo', 'photo', 'video', 'doc']
  const statuses: Status[] = ['draft', 'published', 'published', 'archived']
  return Array.from({ length: n }, (_, i) => {
    const color = Math.floor(rnd() * COLORS.length)
    const kind = kinds[Math.floor(rnd() * kinds.length)]
    const portrait = rnd() < 0.3
    return {
      id: i + 1, kind, color,
      subject: Math.floor(rnd() * SUBJECTS.length),
      status: statuses[Math.floor(rnd() * statuses.length)],
      campaign: Math.floor(rnd() * CAMPAIGNS.length),
      date: new Date(2026, 0, 1 + Math.floor(rnd() * 300), Math.floor(rnd() * 24)),
      hue: (COLORS[color].hue + Math.floor(rnd() * 40) - 20 + 360) % 360,
      sizeMb: kind === 'video' ? Math.round(rnd() * 400 + 20) : Math.round((rnd() * 8 + 0.4) * 10) / 10,
      w: portrait ? 3024 : 4032, h: portrait ? 4032 : 3024, ratio: 'free',
    }
  })
}
const ALL = makeMedia(1788)
const PAGE_SIZES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
const RATIO_CSS: Record<Ratio, string | undefined> = { free: undefined, '1:1': '1 / 1', '16:9': '16 / 9', '4:5': '4 / 5' }

/* ===================================================================== Vignettes et fichiers */
function Thumb({ m, tall }: { m: Media; tall?: boolean }) {
  const ratio = RATIO_CSS[m.ratio] ?? (tall && m.h > m.w ? '3 / 4' : '4 / 3')
  return (
    <div className="dm-thumb" style={{ aspectRatio: ratio, background: `linear-gradient(135deg, hsl(${m.hue} 70% 58%), hsl(${(m.hue + 40) % 360} 65% 32%))` }} aria-hidden="true">
      <span className="dm-emoji">{SUBJECTS[m.subject].emoji}</span>
      {m.kind === 'video' && <span className="dm-play">▶</span>}
      {m.ratio !== 'free' && <span className="dm-crop">{m.ratio}</span>}
    </div>
  )
}

/** Génère une vraie image PNG du média (canvas) pour les téléchargements. */
function renderPng(m: Media, title: string): Promise<Blob> {
  const [rw, rh] = m.ratio === 'free' ? [m.w > m.h ? 4 : 3, m.w > m.h ? 3 : 4] : m.ratio.split(':').map(Number)
  const W = 1200, H = Math.round((W * rh) / rw)
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, `hsl(${m.hue} 70% 58%)`); grad.addColorStop(1, `hsl(${(m.hue + 40) % 360} 65% 32%)`)
  g.fillStyle = grad; g.fillRect(0, 0, W, H)
  g.font = `${Math.round(H / 3)}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(SUBJECTS[m.subject].emoji, W / 2, H / 2 - 20)
  g.font = '600 40px sans-serif'; g.fillStyle = 'rgba(255,255,255,.95)'; g.fillText(title, W / 2, H - 60)
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png'))
}
function saveBlob(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/* ===================================================================== Icônes */
const I = {
  download: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>,
  basket: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10h14l-1.5 9a2 2 0 0 1-2 1.7h-7a2 2 0 0 1-2-1.7L5 10Zm3 0 4-6 4 6M12 13v4m-3-4v4m6-4v4" /></svg>,
  share: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></svg>,
  crop: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14" /></svg>,
  trash: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" /></svg>,
  sheet: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></svg>,
  grid: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z" /></svg>,
  list: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM4 10h16M4 15h16M9 5v14" /></svg>,
  mosaic: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z" /></svg>,
}

/* ===================================================================== Page */
type View = 'grid' | 'list' | 'mosaic'
type Sort = 'recent' | 'old' | 'title' | 'size'

export default function Gallery() {
  const t = useT()
  const { lang } = useLang()
  const locale = lang === 'en' ? 'en-GB' : 'fr-FR'
  const title = (m: Media) => `${SUBJECTS[m.subject].label[lang]} ${String(m.id).padStart(4, '0')}`
  const fmt = (m: Media) => KINDS[m.kind].fmt[m.id % KINDS[m.kind].fmt.length]
  const fmtDate = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  const fmtSize = (n: number) => `${n.toLocaleString(locale)} ${lang === 'en' ? 'MB' : 'Mo'}`

  const [media, setMedia] = useState<Media[]>(ALL)
  const [query, setQuery] = useState('')
  const [fKind, setFKind] = useState<Kind[]>([])
  const [fStatus, setFStatus] = useState<Status[]>([])
  const [fColor, setFColor] = useState<number[]>([])
  const [fCampaign, setFCampaign] = useState<number[]>([])
  const [sort, setSort] = useState<Sort>('recent')
  const [view, setView] = useState<View>('grid')
  const [size, setSize] = useState(1) // 0 petit, 1 moyen, 2 grand
  const [viewMenu, setViewMenu] = useState(false)
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [basket, setBasket] = useState<number[]>([])
  const [msg, setMsg] = useState('')
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null)
  const [dialog, setDialog] = useState<null | { type: 'view' | 'share' | 'crop' | 'delete' | 'sheet' | 'basket'; ids: number[] }>(null)
  const [cropRatio, setCropRatio] = useState<Ratio>('free')
  const [busy, setBusy] = useState(false)

  // Lien partagé : /galerie?media=12 ouvre directement le média
  useEffect(() => {
    const id = Number(new URLSearchParams(location.search).get('media'))
    if (id && ALL.some((m) => m.id === id)) setDialog({ type: 'view', ids: [id] })
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = media.filter((m) =>
      (!fKind.length || fKind.includes(m.kind)) && (!fStatus.length || fStatus.includes(m.status)) &&
      (!fColor.length || fColor.includes(m.color)) && (!fCampaign.length || fCampaign.includes(m.campaign)) &&
      (!q || `${title(m)} ${CAMPAIGNS[m.campaign][lang]} ${fmt(m)}`.toLowerCase().includes(q)))
    const cmp: Record<Sort, (a: Media, b: Media) => number> = {
      recent: (a, b) => +b.date - +a.date, old: (a, b) => +a.date - +b.date,
      title: (a, b) => title(a).localeCompare(title(b), locale), size: (a, b) => b.sizeMb - a.sizeMb,
    }
    return [...list].sort(cmp[sort])
  }, [media, query, fKind, fStatus, fColor, fCampaign, sort, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  useEffect(() => { setPage(1) }, [query, fKind, fStatus, fColor, fCampaign, sort, pageSize])
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)
  const byId = (id: number) => media.find((m) => m.id === id)!

  const say = (text: string, undo?: () => void) => { setMsg(text); setToast({ text, undo }) }
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 5000); return () => clearTimeout(id) }, [toast])

  // ----- sélection
  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allOnPage = pageItems.length > 0 && pageItems.every((m) => selected.has(m.id))
  const togglePage = () => setSelected((s) => {
    const n = new Set(s); pageItems.forEach((m) => (allOnPage ? n.delete(m.id) : n.add(m.id)))
    setMsg(allOnPage ? t('Sélection de la page retirée.', 'Page selection cleared.') : t(`${pageItems.length} médias sélectionnés.`, `${pageItems.length} items selected.`))
    return n
  })
  const sel = [...selected]

  // ----- actions
  const addToBasket = (ids: number[]) => {
    const add = ids.filter((id) => !basket.includes(id))
    setBasket([...basket, ...add])
    say(add.length ? t(`${add.length} média(s) ajouté(s) au panier.`, `${add.length} item(s) added to the basket.`) : t('Déjà dans le panier.', 'Already in the basket.'))
  }
  const download = async (ids: number[]) => {
    setBusy(true)
    try {
      if (ids.length === 1) {
        const m = byId(ids[0]); saveBlob(await renderPng(m, title(m)), `${title(m).replace(/\s+/g, '_')}.png`)
      } else {
        const zip = new JSZip()
        for (const id of ids.slice(0, 50)) { const m = byId(id); zip.file(`${title(m).replace(/\s+/g, '_')}.png`, await renderPng(m, title(m))) }
        saveBlob(await zip.generateAsync({ type: 'blob' }), `medias_${ids.length}.zip`)
      }
      say(ids.length === 1 ? t('Téléchargement lancé.', 'Download started.') : t(`Archive ZIP de ${Math.min(ids.length, 50)} médias téléchargée.`, `ZIP archive of ${Math.min(ids.length, 50)} items downloaded.`))
    } finally { setBusy(false) }
  }
  const remove = (ids: number[]) => {
    const before = media
    setMedia(media.filter((m) => !ids.includes(m.id)))
    setSelected((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n })
    setBasket((b) => b.filter((id) => !ids.includes(id)))
    setDialog(null)
    say(t(`${ids.length} média(s) supprimé(s).`, `${ids.length} item(s) deleted.`), () => { setMedia(before); say(t('Suppression annulée.', 'Deletion undone.')) })
  }
  const applyCrop = (ids: number[]) => {
    setMedia(media.map((m) => (ids.includes(m.id) ? { ...m, ratio: cropRatio } : m)))
    setDialog(null)
    say(cropRatio === 'free' ? t('Recadrage retiré.', 'Crop removed.') : t(`Recadrage ${cropRatio} appliqué.`, `${cropRatio} crop applied.`))
  }
  const shareUrl = (ids: number[]) => ids.length === 1 ? `${location.origin}/galerie?media=${ids[0]}` : `${location.origin}/galerie?media=${ids[0]}&+${ids.length - 1}`

  const openCrop = (ids: number[]) => { setCropRatio(byId(ids[0]).ratio); setDialog({ type: 'crop', ids }) }
  const act = (type: 'download' | 'basket' | 'share' | 'crop' | 'delete' | 'sheet', ids: number[]) => {
    if (!ids.length) return
    if (type === 'download') return download(ids)
    if (type === 'basket') return addToBasket(ids)
    if (type === 'crop') return openCrop(ids)
    setDialog({ type, ids })
  }

  // ----- filtres
  const facet = <T,>(list: T[], set: (v: T[]) => void, v: T) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const countBy = (pred: (m: Media) => boolean) => media.filter(pred).length
  const activeFilters = fKind.length + fStatus.length + fColor.length + fCampaign.length

  // ----- pagination
  const pageList = (): (number | '…')[] => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
    const out: (number | '…')[] = [1]
    const a = Math.max(2, page - 1), b = Math.min(pages - 1, page + 1)
    if (a > 2) out.push('…')
    for (let i = a; i <= b; i++) out.push(i)
    if (b < pages - 1) out.push('…')
    out.push(pages)
    return out
  }
  const Pager = ({ id }: { id: string }) => (
    <nav className="dm-pager" aria-label={t(`Pagination ${id}`, `Pagination ${id}`)}>
      <button type="button" onClick={() => setPage(1)} disabled={page === 1} aria-label={t('Première page', 'First page')}>|‹</button>
      <button type="button" onClick={() => setPage(page - 1)} disabled={page === 1} aria-label={t('Page précédente', 'Previous page')}>‹</button>
      {pageList().map((p, i) => p === '…'
        ? <span key={`e${i}`} aria-hidden="true">…</span>
        : <button key={p} type="button" className={p === page ? 'on' : ''} aria-current={p === page ? 'page' : undefined} onClick={() => setPage(p)} aria-label={t(`Page ${p}`, `Page ${p}`)}>{p}</button>)}
      <button type="button" onClick={() => setPage(page + 1)} disabled={page === pages} aria-label={t('Page suivante', 'Next page')}>›</button>
      <button type="button" onClick={() => setPage(pages)} disabled={page === pages} aria-label={t('Dernière page', 'Last page')}>›|</button>
      <label className="dm-perpage">
        <span>{t('Par page', 'Per page')}</span>
        <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>{PAGE_SIZES.map((n) => <option key={n}>{n}</option>)}</select>
      </label>
    </nav>
  )

  const CardActions = ({ m }: { m: Media }) => (
    <div className="dm-actions" role="group" aria-label={t(`Actions pour ${title(m)}`, `Actions for ${title(m)}`)}>
      <button type="button" onClick={() => act('download', [m.id])} title={t('Télécharger', 'Download')} aria-label={t(`Télécharger ${title(m)}`, `Download ${title(m)}`)}>{I.download}</button>
      <button type="button" onClick={() => act('basket', [m.id])} title={t('Ajouter au panier', 'Add to basket')} aria-label={t(`Ajouter ${title(m)} au panier`, `Add ${title(m)} to basket`)}>{I.basket}</button>
      <button type="button" onClick={() => act('share', [m.id])} title={t('Partager', 'Share')} aria-label={t(`Partager ${title(m)}`, `Share ${title(m)}`)}>{I.share}</button>
      <button type="button" onClick={() => act('crop', [m.id])} title={t('Recadrer', 'Crop')} aria-label={t(`Recadrer ${title(m)}`, `Crop ${title(m)}`)}>{I.crop}</button>
      <button type="button" className="danger" onClick={() => act('delete', [m.id])} title={t('Supprimer', 'Delete')} aria-label={t(`Supprimer ${title(m)}`, `Delete ${title(m)}`)}>{I.trash}</button>
    </div>
  )

  const minCol = view === 'list' ? 0 : [150, 205, 300][size]
  const dlgItems = dialog ? dialog.ids.map(byId).filter(Boolean) : []

  return (
    <>
      <DemoIntro
        kicker={t('Démo 2 · Médiathèque DAM', 'Demo 2 · DAM media library')}
        title={t('Médiathèque de 1 788 médias', 'A 1,788-item media library')}
        lead={t(
          "Une médiathèque dans l'esprit d'un DAM (gestion de médias) : recherche, filtres, tri, 3 types de vue, pagination, sélection multiple et actions sur les médias.",
          'A media library in the spirit of a DAM: search, filters, sorting, 3 view types, pagination, multi-selection and media actions.',
        )}
        problem={t(
          <>Les équipes marketing gèrent des milliers de médias. Elles doivent les retrouver vite, les trier, en sélectionner plusieurs et agir dessus en lot (télécharger, partager, recadrer…), le tout au clavier comme à la souris.</>,
          <>Marketing teams manage thousands of assets. They need to find them fast, sort them, select several and act on them in bulk (download, share, crop…), with a keyboard as well as a mouse.</>,
        )}
        tryIt={t(
          [<>Filtrez (type, statut, couleur, campagne), triez, changez de vue et de taille.</>, <>Changez le nombre de médias par page (10 à 100) et naviguez entre les pages.</>, <>Sélectionnez des médias puis téléchargez-les en ZIP, ajoutez-les au panier, recadrez ou supprimez-les (avec annulation).</>],
          [<>Filter (type, status, colour, campaign), sort, switch view and size.</>, <>Change items per page (10 to 100) and move between pages.</>, <>Select items, then download them as a ZIP, add them to the basket, crop or delete them (with undo).</>],
        )}
        under={t(
          [<>Filtres, tri et pagination dérivés d'un seul état, sans données dupliquées.</>, <>Téléchargements réels : images générées en canvas, archive ZIP (JSZip) pour la sélection.</>, <>Actions accessibles au clavier (visibles au focus), confirmations en fenêtre modale, annonces au lecteur d'écran, annulation de la suppression.</>],
          [<>Filters, sorting and pagination derived from a single state, with no duplicated data.</>, <>Real downloads: canvas-generated images, ZIP archive (JSZip) for selections.</>, <>Keyboard-accessible actions (shown on focus), modal confirmations, screen-reader announcements, undo on delete.</>],
        )}
        stack={['React', 'TypeScript', 'Canvas', 'JSZip']}
      />
      <LiveRegion message={msg} />

      <div className="wrap dm">
        {/* ------------- barre de recherche */}
        <div className="dm-search">
          <span className="dm-logo" aria-label={t('MediaLab, médiathèque de démonstration', 'MediaLab, demo media library')} role="img">
            <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#0369a1" /><path d="M7 22l6-8 4 5 3-3 5 6z" fill="#fff" /><circle cx="22" cy="11" r="3" fill="#38bdf8" /></svg>
            <span aria-hidden="true">Media<b>Lab</b> <em>démo</em></span>
          </span>
          <label htmlFor="dm-q" className="sr-only">{t('Rechercher un média', 'Search media')}</label>
          <input id="dm-q" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Rechercher un titre, une campagne, un format…', 'Search a title, campaign, format…')} />
          <button type="button" className="dm-basket-btn" onClick={() => setDialog({ type: 'basket', ids: basket })} aria-label={t(`Panier : ${basket.length} média(s)`, `Basket: ${basket.length} item(s)`)}>
            {I.basket}<span className="dm-badge" aria-hidden="true">{basket.length}</span>
          </button>
        </div>

        <div className="dm-body">
          {/* ------------- filtres */}
          <aside className="dm-facets" aria-label={t('Filtres', 'Filters')}>
            <div className="dm-facets-head">
              <h2>{t('Filtres', 'Filters')}</h2>
              {activeFilters > 0 && <button type="button" className="dm-link" onClick={() => { setFKind([]); setFStatus([]); setFColor([]); setFCampaign([]) }}>{t(`Effacer (${activeFilters})`, `Clear (${activeFilters})`)}</button>}
            </div>
            <details open>
              <summary>{t('Type de document', 'Document type')}</summary>
              {(Object.keys(KINDS) as Kind[]).map((k) => <label key={k} className="dm-check"><input type="checkbox" checked={fKind.includes(k)} onChange={() => facet(fKind, setFKind, k)} /> {KINDS[k].label[lang]} <small>{countBy((m) => m.kind === k)}</small></label>)}
            </details>
            <details open>
              <summary>{t('Statut', 'Status')}</summary>
              {(Object.keys(STATUS) as Status[]).map((k) => <label key={k} className="dm-check"><input type="checkbox" checked={fStatus.includes(k)} onChange={() => facet(fStatus, setFStatus, k)} /> {STATUS[k][lang]} <small>{countBy((m) => m.status === k)}</small></label>)}
            </details>
            <details open>
              <summary>{t('Couleurs', 'Colours')}</summary>
              <div className="dm-swatches">
                {COLORS.map((c, i) => <label key={i} className="dm-swatch" title={c.label[lang]}><input type="checkbox" checked={fColor.includes(i)} onChange={() => facet(fColor, setFColor, i)} /><span style={{ background: c.css }} aria-hidden="true" /><span className="sr-only">{c.label[lang]}</span></label>)}
              </div>
            </details>
            <details>
              <summary>{t('Campagne', 'Campaign')}</summary>
              {CAMPAIGNS.map((c, i) => <label key={i} className="dm-check"><input type="checkbox" checked={fCampaign.includes(i)} onChange={() => facet(fCampaign, setFCampaign, i)} /> {c[lang]} <small>{countBy((m) => m.campaign === i)}</small></label>)}
            </details>
          </aside>

          <section className="dm-main" aria-labelledby="dm-count">
            {/* ------------- barre d'outils */}
            <div className="dm-toolbar">
              <div className="dm-count">
                <strong id="dm-count">{filtered.length.toLocaleString(locale)} {t('éléments', 'items')}</strong>
                <label className="dm-check"><input type="checkbox" checked={allOnPage} onChange={togglePage} /> {t('Sélectionner la page', 'Select page')}</label>
                {sel.length > 0 && <span className="dm-selcount">{t(`${sel.length} sélectionné(s)`, `${sel.length} selected`)} · <button type="button" className="dm-link" onClick={() => setSelected(new Set())}>{t('Tout désélectionner', 'Clear selection')}</button></span>}
              </div>
              <div className="dm-bulk" role="group" aria-label={t('Actions sur la sélection', 'Selection actions')}>
                <button type="button" disabled={!sel.length || busy} onClick={() => act('download', sel)}>{I.download}<span>{busy ? t('Préparation…', 'Preparing…') : t('Télécharger', 'Download')}</span></button>
                <button type="button" disabled={!sel.length} onClick={() => act('basket', sel)}>{I.basket}<span>{t('Ajouter au panier', 'Add to basket')}</span></button>
                <button type="button" disabled={!sel.length} onClick={() => act('sheet', sel)}>{I.sheet}<span>{t('Planche contact', 'Contact sheet')}</span></button>
                <button type="button" disabled={!sel.length} onClick={() => act('share', sel)}>{I.share}<span>{t('Partager', 'Share')}</span></button>
                <button type="button" disabled={!sel.length} onClick={() => act('crop', sel)}>{I.crop}<span>{t('Recadrer', 'Crop')}</span></button>
                <button type="button" className="danger" disabled={!sel.length} onClick={() => act('delete', sel)}>{I.trash}<span>{t('Supprimer', 'Delete')}</span></button>
              </div>
              <div className="dm-viewtools">
                <label className="dm-sort">
                  <span>{t('Trié par', 'Sort by')}</span>
                  <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                    <option value="recent">{t('le plus récent', 'most recent')}</option>
                    <option value="old">{t('le plus ancien', 'oldest')}</option>
                    <option value="title">{t('titre (A → Z)', 'title (A → Z)')}</option>
                    <option value="size">{t('poids', 'file size')}</option>
                  </select>
                </label>
                <div className="dm-viewmenu">
                  <button type="button" aria-expanded={viewMenu} aria-controls="dm-viewpanel" onClick={() => setViewMenu(!viewMenu)} aria-label={t("Options d'affichage", 'Display options')}>{I[view]} ▾</button>
                  <div id="dm-viewpanel" className="dm-viewpanel" hidden={!viewMenu}>
                    <p>{t('Type de vue', 'View type')}</p>
                    <div className="dm-viewbtns">
                      {(['grid', 'list', 'mosaic'] as View[]).map((v) => (
                        <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} aria-label={{ grid: t('Grille', 'Grid'), list: t('Liste', 'List'), mosaic: t('Mosaïque', 'Mosaic') }[v]}>{I[v]}</button>
                      ))}
                    </div>
                    {view !== 'list' && (
                      <>
                        <label htmlFor="dm-size">{t("Taille de l'affichage", 'Display size')}</label>
                        <input id="dm-size" type="range" min={0} max={2} step={1} value={size} onChange={(e) => setSize(Number(e.target.value))}
                          aria-valuetext={[t('Petit', 'Small'), t('Moyen', 'Medium'), t('Grand', 'Large')][size]} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Pager id={t('haut', 'top')} />

            {/* ------------- résultats */}
            {pageItems.length === 0 ? (
              <p className="dm-empty">{t('Aucun média ne correspond. Modifiez la recherche ou les filtres.', 'No media matches. Change the search or filters.')}</p>
            ) : view === 'list' ? (
              <div className="dm-tablewrap">
                <table className="dm-table">
                  <caption className="sr-only">{t(`Médias, page ${page} sur ${pages}`, `Media, page ${page} of ${pages}`)}</caption>
                  <thead><tr>
                    <th scope="col"><span className="sr-only">{t('Sélection', 'Selection')}</span></th>
                    <th scope="col"><span className="sr-only">{t('Aperçu', 'Preview')}</span></th>
                    <th scope="col">{t('Titre', 'Title')}</th><th scope="col">Format</th><th scope="col">{t('Statut', 'Status')}</th>
                    <th scope="col">Date</th><th scope="col">{t('Poids', 'Size')}</th><th scope="col">Actions</th>
                  </tr></thead>
                  <tbody>
                    {pageItems.map((m) => (
                      <tr key={m.id} className={selected.has(m.id) ? 'is-sel' : ''}>
                        <td><input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} aria-label={t(`Sélectionner ${title(m)}`, `Select ${title(m)}`)} /></td>
                        <td><span className="dm-mini"><Thumb m={m} /></span></td>
                        <td><button type="button" className="dm-title" onClick={() => setDialog({ type: 'view', ids: [m.id] })}>{title(m)}</button></td>
                        <td>{fmt(m)}</td><td><span className={`dm-tag st-${m.status}`}>{STATUS[m.status][lang]}</span></td>
                        <td>{fmtDate(m.date)}</td><td>{fmtSize(m.sizeMb)}</td>
                        <td><CardActions m={m} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ul className={`dm-results ${view}`} style={{ ['--min' as string]: `${minCol}px` }}>
                {pageItems.map((m) => (
                  <li key={m.id} className={`dm-card${selected.has(m.id) ? ' is-sel' : ''}`}>
                    <label className="dm-select">
                      <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} />
                      <span className="sr-only">{t(`Sélectionner ${title(m)}`, `Select ${title(m)}`)}</span>
                    </label>
                    <button type="button" className="dm-open" onClick={() => setDialog({ type: 'view', ids: [m.id] })} aria-label={t(`Ouvrir ${title(m)}`, `Open ${title(m)}`)}>
                      <Thumb m={m} tall={view === 'mosaic'} />
                    </button>
                    <CardActions m={m} />
                    <div className="dm-meta">
                      <p className="dm-name">{title(m)}</p>
                      <p className="dm-tags"><span className="dm-tag">{fmt(m)}</span><span className={`dm-tag st-${m.status}`}>{STATUS[m.status][lang]}</span>{basket.includes(m.id) && <span className="dm-tag in-basket">{t('Au panier', 'In basket')}</span>}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <Pager id={t('bas', 'bottom')} />
          </section>
        </div>
      </div>

      {/* ------------- notification avec annulation */}
      {toast && (
        <div className="dm-toast" role="status">
          <span>{toast.text}</span>
          {toast.undo && <button type="button" onClick={() => { toast.undo!(); }}>{t('Annuler', 'Undo')}</button>}
          <button type="button" aria-label={t('Fermer la notification', 'Close notification')} onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* ------------- fenêtres */}
      <Modal open={dialog?.type === 'view'} onClose={() => setDialog(null)} title={dlgItems[0] ? title(dlgItems[0]) : ''}>
        {dlgItems[0] && (() => { const m = dlgItems[0]; return (
          <>
            <Thumb m={m} />
            <dl className="dm-dl">
              <dt>Format</dt><dd>{fmt(m)} · {m.w} × {m.h} px</dd>
              <dt>{t('Statut', 'Status')}</dt><dd>{STATUS[m.status][lang]}</dd>
              <dt>{t('Campagne', 'Campaign')}</dt><dd>{CAMPAIGNS[m.campaign][lang]}</dd>
              <dt>{t('Couleur dominante', 'Dominant colour')}</dt><dd>{COLORS[m.color].label[lang]}</dd>
              <dt>Date</dt><dd>{fmtDate(m.date)}</dd>
              <dt>{t('Poids', 'Size')}</dt><dd>{fmtSize(m.sizeMb)}</dd>
            </dl>
            <CardActions m={m} />
          </>
        ) })()}
      </Modal>

      <Modal open={dialog?.type === 'share'} onClose={() => setDialog(null)} title={t(`Partager ${dlgItems.length > 1 ? `${dlgItems.length} médias` : 'le média'}`, `Share ${dlgItems.length > 1 ? `${dlgItems.length} items` : 'item'}`)}>
        {dialog?.type === 'share' && (
          <div className="dm-share">
            <label htmlFor="dm-link">{t('Lien de partage', 'Share link')}</label>
            <input id="dm-link" readOnly value={shareUrl(dialog.ids)} onFocus={(e) => e.currentTarget.select()} />
            <div className="dm-row">
              <button type="button" className="ax-btn" onClick={async () => { try { await navigator.clipboard.writeText(shareUrl(dialog.ids)); say(t('Lien copié.', 'Link copied.')) } catch { say(t('Sélectionnez le lien pour le copier.', 'Select the link to copy it.')) } }}>{t('Copier le lien', 'Copy link')}</button>
              <a className="ax-btn secondary" href={`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(t('Médias partagés', 'Shared media'))}&body=${encodeURIComponent(shareUrl(dialog.ids))}`} target="_blank" rel="noopener noreferrer">{t('Envoyer par Gmail', 'Send with Gmail')}<span className="sr-only">{t(' (nouvel onglet)', ' (new tab)')}</span></a>
            </div>
            <p className="demo-note">{t('Démo : le lien ouvre le média dans cette galerie.', 'Demo: the link opens the item in this gallery.')}</p>
          </div>
        )}
      </Modal>

      <Modal open={dialog?.type === 'crop'} onClose={() => setDialog(null)} title={t(`Recadrer ${dlgItems.length > 1 ? `${dlgItems.length} médias` : dlgItems[0] ? title(dlgItems[0]) : ''}`, `Crop ${dlgItems.length > 1 ? `${dlgItems.length} items` : dlgItems[0] ? title(dlgItems[0]) : ''}`)}>
        {dialog?.type === 'crop' && dlgItems[0] && (
          <>
            <fieldset className="dm-ratios">
              <legend>{t('Format', 'Format')}</legend>
              {(['free', '1:1', '16:9', '4:5'] as Ratio[]).map((r) => (
                <label key={r}><input type="radio" name="ratio" checked={cropRatio === r} onChange={() => setCropRatio(r)} /> <span>{r === 'free' ? t('Original', 'Original') : r}{r === '1:1' ? t(' · Instagram', ' · Instagram') : r === '16:9' ? t(' · Bannière', ' · Banner') : r === '4:5' ? ' · Portrait' : ''}</span></label>
              ))}
            </fieldset>
            <div className="dm-croppreview"><Thumb m={{ ...dlgItems[0], ratio: cropRatio }} /></div>
            <div className="dm-row"><button type="button" className="ax-btn secondary" onClick={() => setDialog(null)}>{t('Annuler', 'Cancel')}</button><button type="button" className="ax-btn" onClick={() => applyCrop(dialog.ids)}>{t('Appliquer', 'Apply')}</button></div>
          </>
        )}
      </Modal>

      <Modal open={dialog?.type === 'delete'} onClose={() => setDialog(null)} title={t('Confirmer la suppression', 'Confirm deletion')}>
        {dialog?.type === 'delete' && (
          <>
            <p>{t(`Supprimer ${dialog.ids.length} média(s) ? Vous pourrez annuler juste après.`, `Delete ${dialog.ids.length} item(s)? You can undo right after.`)}</p>
            <div className="dm-row"><button type="button" className="ax-btn secondary" onClick={() => setDialog(null)}>{t('Annuler', 'Cancel')}</button><button type="button" className="ax-btn danger" onClick={() => remove(dialog.ids)}>{t('Supprimer', 'Delete')}</button></div>
          </>
        )}
      </Modal>

      <Modal open={dialog?.type === 'sheet'} onClose={() => setDialog(null)} title={t('Planche contact', 'Contact sheet')}>
        {dialog?.type === 'sheet' && (
          <>
            <ul className="dm-sheet">{dlgItems.slice(0, 24).map((m) => <li key={m.id}><Thumb m={m} /><span>{title(m)}</span></li>)}</ul>
            {dlgItems.length > 24 && <p className="demo-note">{t(`+ ${dlgItems.length - 24} autres médias`, `+ ${dlgItems.length - 24} more items`)}</p>}
            <div className="dm-row"><button type="button" className="ax-btn" onClick={() => window.print()}>{t('Imprimer / PDF', 'Print / PDF')}</button></div>
          </>
        )}
      </Modal>

      <Modal open={dialog?.type === 'basket'} onClose={() => setDialog(null)} title={t(`Panier (${basket.length})`, `Basket (${basket.length})`)}>
        {dialog?.type === 'basket' && (basket.length === 0 ? <p>{t('Votre panier est vide.', 'Your basket is empty.')}</p> : (
          <>
            <ul className="dm-basket">{basket.map(byId).filter(Boolean).map((m) => (
              <li key={m.id}><span className="dm-mini"><Thumb m={m} /></span><span>{title(m)}<br /><small>{fmt(m)} · {fmtSize(m.sizeMb)}</small></span>
                <button type="button" className="ax-icon-btn" onClick={() => { setBasket(basket.filter((x) => x !== m.id)); say(t('Retiré du panier.', 'Removed from basket.')) }} aria-label={t(`Retirer ${title(m)} du panier`, `Remove ${title(m)} from basket`)}>✕</button></li>
            ))}</ul>
            <div className="dm-row"><button type="button" className="ax-btn secondary" onClick={() => { setBasket([]); say(t('Panier vidé.', 'Basket emptied.')) }}>{t('Vider', 'Empty')}</button><button type="button" className="ax-btn" onClick={() => download(basket)}>{t('Télécharger le panier (ZIP)', 'Download basket (ZIP)')}</button></div>
          </>
        ))}
      </Modal>
      <div style={{ height: 56 }} />
    </>
  )
}
