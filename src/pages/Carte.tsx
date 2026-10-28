import { useMemo, useState } from 'react'
import DemoIntro from '../components/DemoIntro'
import { LiveRegion } from '../components/a11y'
import { useLang, useT, type L } from '../i18n'

/**
 * Cartographie d'adressage (recréation du travail FindMe, données fictives).
 * Chaque domicile reçoit un code d'adresse numérique ; le back-office permet de rechercher, filtrer et valider les adresses.
 */
type Status = 'ok' | 'wait' | 'check'
type Addr = { id: number; code: string; street: string; x: number; y: number; status: Status; residents: number }

const STATUS: Record<Status, { label: L; color: string }> = {
  ok: { label: { fr: 'Validée', en: 'Validated' }, color: '#30a46c' },
  wait: { label: { fr: 'En attente', en: 'Pending' }, color: '#f5a524' },
  check: { label: { fr: 'À vérifier', en: 'To check' }, color: '#e5484d' },
}
const STREETS = ['Rue des Manguiers', 'Rue du Marché', 'Avenue de la Plage', 'Rue des Pêcheurs', 'Boulevard du Phare', 'Rue des Palmiers', 'Rue de l’École', 'Rue du Port']

function makeData(): Addr[] {
  let seed = 11
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const out: Addr[] = []
  // 8 rues horizontales, maisons de part et d'autre
  for (let s = 0; s < STREETS.length; s++) {
    const y = 60 + s * 70
    for (let k = 0; k < 16; k++) {
      if (rnd() < 0.25) continue
      const x = 40 + k * 44 + rnd() * 10
      const side = rnd() < 0.5 ? -1 : 1
      const r = rnd()
      out.push({
        id: out.length + 1, street: STREETS[s], x, y: y + side * (14 + rnd() * 8),
        code: `KRB-${String.fromCharCode(65 + s)}${String(k + 1).padStart(2, '0')}-${Math.floor(rnd() * 900 + 100)}`,
        status: r < 0.65 ? 'ok' : r < 0.85 ? 'wait' : 'check', residents: 1 + Math.floor(rnd() * 7),
      })
    }
  }
  return out
}
const DATA = makeData()

export default function Carte() {
  const t = useT()
  const { lang } = useLang()
  const [data, setData] = useState(DATA)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<Status | 'all'>('all')
  const [sel, setSel] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [msg, setMsg] = useState('')

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return data.filter((a) => (status === 'all' || a.status === status) && (!s || a.code.toLowerCase().includes(s) || a.street.toLowerCase().includes(s)))
  }, [data, q, status])
  const current = data.find((a) => a.id === sel) ?? null
  const counts = (Object.keys(STATUS) as Status[]).map((k) => [k, data.filter((a) => a.status === k).length] as const)

  // Le zoom se centre sur l'adresse sélectionnée
  const W = 760, H = 600
  const cx = current ? current.x : W / 2, cy = current ? current.y : H / 2
  const vw = W / zoom, vh = H / zoom
  const vx = Math.min(Math.max(cx - vw / 2, 0), W - vw), vy = Math.min(Math.max(cy - vh / 2, 0), H - vh)

  const select = (a: Addr) => { setSel(a.id); setMsg(t(`${a.code} sélectionnée, ${a.street}.`, `${a.code} selected, ${a.street}.`)) }
  const validate = (a: Addr) => {
    setData(data.map((x) => (x.id === a.id ? { ...x, status: 'ok' } : x)))
    setMsg(t(`Adresse ${a.code} validée.`, `Address ${a.code} validated.`))
  }

  return (
    <>
      <DemoIntro
        kicker={t('Projet FindMe recréé · Cartographie', 'FindMe project, rebuilt · Mapping')}
        title={t("Cartographie d'adressage", 'Address mapping')}
        lead={t(
          "Recréation de mon travail chez FindMe, startup qui donne une adresse numérique aux domiciles en Afrique : une carte des adresses et un back-office pour les rechercher, les filtrer et les valider. Données fictives.",
          'A rebuild of my work at FindMe, a startup giving digital addresses to homes in Africa: a map of addresses and a back office to search, filter and validate them. Fictitious data.',
        )}
        problem={t(
          <>Dans beaucoup de quartiers, les maisons n'ont pas d'adresse officielle. FindMe attribue à chaque domicile un code unique. Les équipes doivent visualiser ces adresses sur une carte et suivre leur validation.</>,
          <>In many neighbourhoods, homes have no official address. FindMe assigns each home a unique code. Teams need to see these addresses on a map and track their validation.</>,
        )}
        tryIt={t(
          [<>Tapez un code (ex. « KRB-C ») ou une rue (« Plage »).</>, <>Filtrez par statut : la carte et la liste se mettent à jour ensemble.</>, <>Sélectionnez une adresse, zoomez, puis validez-la.</>],
          [<>Type a code (e.g. “KRB-C”) or a street (“Plage”).</>, <>Filter by status: the map and the list update together.</>, <>Select an address, zoom in, then validate it.</>],
        )}
        under={t(
          [<>Carte en SVG, zoom centré sur l'adresse sélectionnée.</>, <>Carte et liste synchronisées sur le même état filtré.</>, <>La liste sert d'alternative accessible à la carte (RGAA 1.x).</>],
          [<>SVG map, zoom centred on the selected address.</>, <>Map and list synced on the same filtered state.</>, <>The list is the accessible alternative to the map (RGAA 1.x).</>],
        )}
        stack={['React', 'TypeScript', 'SVG', t('Cartographie', 'Mapping')]}
      />
      <LiveRegion message={msg} />

      <div className="wrap">
        <div className="map-stats">
          <div className="card"><p className="kicker">{t('Adresses', 'Addresses')}</p><b>{data.length}</b></div>
          {counts.map(([k, n]) => <div className="card" key={k}><p className="kicker"><span className="dot" style={{ background: STATUS[k].color }} aria-hidden="true" /> {STATUS[k].label[lang]}</p><b>{n}</b></div>)}
        </div>

        <div className="food-filters" style={{ marginTop: 20 }}>
          <div className="ax-field" style={{ margin: 0, flex: '1 1 260px' }}>
            <label htmlFor="m-q">{t('Rechercher un code ou une rue', 'Search a code or a street')}</label>
            <input id="m-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="KRB-C04, Plage…" />
          </div>
          <div className="ax-field" style={{ margin: 0 }}>
            <label htmlFor="m-s">{t('Statut', 'Status')}</label>
            <select id="m-s" value={status} onChange={(e) => setStatus(e.target.value as Status | 'all')}>
              <option value="all">{t('Tous', 'All')}</option>
              {(Object.keys(STATUS) as Status[]).map((k) => <option key={k} value={k}>{STATUS[k].label[lang]}</option>)}
            </select>
          </div>
          <p className="demo-note" style={{ margin: 0 }} aria-live="polite">{t(`${list.length} adresse(s)`, `${list.length} address(es)`)}</p>
        </div>

        <div className="map-layout">
          <div className="map-box">
            <div className="map-tools">
              <button type="button" className="ax-icon-btn" onClick={() => setZoom(Math.min(4, zoom * 1.5))} aria-label={t('Zoomer', 'Zoom in')}>+</button>
              <button type="button" className="ax-icon-btn" onClick={() => setZoom(Math.max(1, zoom / 1.5))} aria-label={t('Dézoomer', 'Zoom out')}>−</button>
            </div>
            <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} role="img" aria-label={t(`Carte du quartier : ${list.length} adresses affichées. La liste à côté reprend les mêmes adresses.`, `Neighbourhood map: ${list.length} addresses shown. The list next to it contains the same addresses.`)} className="map-svg">
              <rect x="0" y="0" width={W} height={H} className="map-land" />
              <path d={`M0 ${H - 40} Q ${W / 2} ${H - 90} ${W} ${H - 30} L ${W} ${H} L 0 ${H} Z`} className="map-sea" />
              {STREETS.map((s, i) => (
                <g key={s}>
                  <line x1="20" x2={W - 20} y1={60 + i * 70} y2={60 + i * 70} className="map-road" />
                  <text x="26" y={56 + i * 70} className="map-label">{s}</text>
                </g>
              ))}
              {[150, 380, 610].map((x) => <line key={x} x1={x} x2={x} y1="40" y2={H - 70} className="map-road thin" />)}
              {list.map((a) => (
                <circle key={a.id} cx={a.x} cy={a.y} r={a.id === sel ? 9 : 6} fill={STATUS[a.status].color}
                  className={a.id === sel ? 'map-pin sel' : 'map-pin'} onClick={() => select(a)} />
              ))}
            </svg>
            <p className="demo-note" style={{ margin: '8px 4px 0' }}>{t('Quartier pilote fictif · cliquez sur un point ou utilisez la liste.', 'Fictitious pilot neighbourhood · click a point or use the list.')}</p>
          </div>

          <div className="map-side">
            {current && (
              <div className="card addr-card">
                <p className="kicker">{t('Adresse sélectionnée', 'Selected address')}</p>
                <h2 className="demo-h" style={{ margin: '0 0 6px' }}>{current.code}</h2>
                <p style={{ margin: 0 }}>{current.street} · {t(`${current.residents} habitant(s)`, `${current.residents} resident(s)`)}</p>
                <p style={{ margin: '6px 0 12px' }}><span className="dot" style={{ background: STATUS[current.status].color }} aria-hidden="true" /> {STATUS[current.status].label[lang]}</p>
                {current.status !== 'ok' && <button type="button" className="ax-btn" onClick={() => validate(current)}>{t("Valider l'adresse", 'Validate address')}</button>}
              </div>
            )}
            <ul className="addr-list" aria-label={t('Liste des adresses', 'Address list')}>
              {list.slice(0, 60).map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => select(a)} aria-pressed={a.id === sel} className={a.id === sel ? 'sel' : ''}>
                    <span className="dot" style={{ background: STATUS[a.status].color }} aria-hidden="true" />
                    <span><strong>{a.code}</strong><br /><small>{a.street} · {STATUS[a.status].label[lang]}</small></span>
                  </button>
                </li>
              ))}
            </ul>
            {list.length > 60 && <p className="demo-note">{t('Affinez la recherche pour voir plus d’adresses.', 'Refine the search to see more addresses.')}</p>}
          </div>
        </div>
      </div>
      <div style={{ height: 56 }} />
    </>
  )
}
