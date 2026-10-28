import { useEffect, useMemo, useState, type FormEvent } from 'react'
import QRCode from 'qrcode'
import DemoIntro from '../components/DemoIntro'
import { Field, LiveRegion } from '../components/a11y'
import { useT } from '../i18n'

type Guest = { id: string; name: string; table: number; vip: boolean; checkedIn: boolean }

const SEED: Guest[] = [
  { id: 'ZV-48213', name: 'Awa Diallo', table: 1, vip: true, checkedIn: true },
  { id: 'ZV-48214', name: 'Thomas Le Goff', table: 3, vip: false, checkedIn: false },
  { id: 'ZV-48215', name: 'Inès Martin', table: 2, vip: false, checkedIn: true },
  { id: 'ZV-48216', name: 'Paul Nkoulou', table: 1, vip: true, checkedIn: false },
]

function useQr(text: string) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    QRCode.toDataURL(text, { margin: 1, width: 240, color: { dark: '#0b1730', light: '#ffffff' } }).then(setSrc)
  }, [text])
  return src
}

function Ticket({ g }: { g: Guest }) {
  const t = useT()
  const qr = useQr(JSON.stringify({ ticket: g.id, name: g.name, table: g.table, vip: g.vip }))
  return (
    <article className="ticket" aria-label={t(`Billet de ${g.name}`, `${g.name}'s ticket`)}>
      <div className="ticket-main">
        <p className="ticket-kicker">Invitation{g.vip && <span className="vip">VIP</span>}</p>
        <h3>{t('Mariage de Léa & Samuel', "Léa & Samuel's wedding")}</h3>
        <p>{t('Samedi 13 juin 2026 · 16h30', 'Saturday 13 June 2026 · 4:30 pm')}<br />{t('Domaine des Ormes, Rennes', 'Domaine des Ormes, Rennes')}</p>
        <dl>
          <div><dt>{t('Invité·e', 'Guest')}</dt><dd>{g.name}</dd></div>
          <div><dt>Table</dt><dd>{g.table}</dd></div>
        </dl>
      </div>
      <div className="ticket-stub">
        {qr && <img src={qr} alt={t(`QR code du billet ${g.id}, à présenter à l'entrée`, `QR code for ticket ${g.id}, to show at the entrance`)} width={120} height={120} />}
        <p>{t('Billet n°', 'Ticket no.')} <strong>{g.id}</strong></p>
      </div>
    </article>
  )
}

export default function Billet() {
  const t = useT()
  const [guests, setGuests] = useState<Guest[]>(SEED)
  const [selected, setSelected] = useState(SEED[0].id)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const current = guests.find((g) => g.id === selected) ?? guests[0]
  const present = guests.filter((g) => g.checkedIn).length
  const vip = useMemo(() => guests.filter((g) => g.vip).length, [guests])

  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const name = String(f.get('name')).trim()
    if (!name) { setError(t("Indiquez le nom de l'invité·e.", "Enter the guest's name.")); return }
    const g: Guest = { id: `ZV-${48217 + guests.length}`, name, table: Number(f.get('table')) || 1, vip: f.get('vip') === 'on', checkedIn: false }
    setGuests([...guests, g]); setSelected(g.id); setError('')
    setMsg(t(`Billet ${g.id} généré pour ${name}. Prêt à être envoyé par WhatsApp.`, `Ticket ${g.id} generated for ${name}. Ready to send via WhatsApp.`))
    e.currentTarget.reset()
  }
  const toggle = (id: string) => {
    setGuests(guests.map((g) => (g.id === id ? { ...g, checkedIn: !g.checkedIn } : g)))
    const g = guests.find((x) => x.id === id)!
    setMsg(g.checkedIn ? t(`${g.name} marqué·e absent·e.`, `${g.name} marked as not arrived.`) : t(`${g.name} enregistré·e à l’entrée.`, `${g.name} checked in.`))
  }

  return (
    <>
      <DemoIntro
        kicker={t('Démo 3 · Projet Chillo Tech recréé', 'Demo 3 · Chillo Tech project, rebuilt')}
        title={t('Zeeven, billetterie événementielle', 'Zeeven, event ticketing')}
        lead={t(
          "Recréation de Zeeven, le projet développé chez Chillo Tech : des billets nominatifs à QR code, envoyés par WhatsApp à chaque invité, et un tableau d'accueil pour contrôler les entrées.",
          'A rebuild of Zeeven, the project I developed at Chillo Tech: personal QR-code tickets sent to each guest via WhatsApp, and a check-in board to control entry.',
        )}
        problem={t(
          <>Pour un mariage, un billet imprimé coûte en moyenne 1 000 FCFA. Zeeven génère un billet numérique par invité et l'envoie par WhatsApp, pour un coût divisé par 3, tout en gérant le placement (table, VIP) et le contrôle à l'entrée.</>,
          <>For a wedding, a printed ticket costs about 1,000 FCFA on average. Zeeven generates a digital ticket per guest and sends it via WhatsApp, at a third of the cost, while handling seating (table, VIP) and entry control.</>,
        )}
        tryIt={t(
          [<>Ajoutez un invité avec sa table et l'option VIP : son billet et son QR code sont générés.</>, <>Cliquez sur un invité dans la liste pour afficher son billet.</>, <>Marquez les arrivées : le compteur de présence se met à jour.</>],
          [<>Add a guest with a table and the VIP option: their ticket and QR code are generated.</>, <>Click a guest in the list to show their ticket.</>, <>Check guests in: the attendance counter updates.</>],
        )}
        under={t(
          [<>QR code nominatif encodant le n° de billet, la table et le statut VIP.</>, <>Version d'origine : API Java Spring Boot et interfaces React.</>, <>Ici : React + TypeScript, état local, messages annoncés aux lecteurs d'écran.</>],
          [<>Personal QR code encoding the ticket number, table and VIP status.</>, <>Original version: Java Spring Boot API and React interfaces.</>, <>Here: React + TypeScript, local state, messages announced to screen readers.</>],
        )}
        stack={['React', 'TypeScript', 'QR code', t('Java Spring Boot (version d’origine)', 'Java Spring Boot (original)')]}
      />
      <LiveRegion message={msg} />

      <div className="wrap billet-layout">
        <section aria-labelledby="b-ticket">
          <h2 id="b-ticket" className="demo-h">{t(`Billet de ${current.name}`, `${current.name}'s ticket`)}</h2>
          <Ticket g={current} />
          <p className="demo-note">{t('Billet prêt à être envoyé par WhatsApp au format image.', 'Ticket ready to be sent via WhatsApp as an image.')}</p>
        </section>

        <section aria-labelledby="b-guests">
          <h2 id="b-guests" className="demo-h">{t('Accueil des invités', 'Guest check-in')}</h2>
          <p className="counter"><strong>{present}</strong> / {guests.length} {t('présents', 'checked in')} · {vip} VIP</p>
          <ul className="guest-list">
            {guests.map((g) => (
              <li key={g.id} className={g.id === selected ? 'is-selected' : ''}>
                <button type="button" className="guest-name" onClick={() => setSelected(g.id)} aria-pressed={g.id === selected}>
                  {g.name}<span>Table {g.table}{g.vip ? ' · VIP' : ''}</span>
                </button>
                <button type="button" className={`ax-btn ${g.checkedIn ? '' : 'secondary'}`} onClick={() => toggle(g.id)} aria-pressed={g.checkedIn}>
                  {g.checkedIn ? t('✓ Arrivé·e', '✓ Arrived') : t('Marquer arrivé·e', 'Check in')}<span className="sr-only"> : {g.name}</span>
                </button>
              </li>
            ))}
          </ul>

          <form className="stage add-guest" onSubmit={add} noValidate>
            <h3>{t('Ajouter un invité', 'Add a guest')}</h3>
            <Field label={t("Nom de l'invité·e", "Guest's name")} name="name" autoComplete="off" required error={error} />
            <div className="ax-field">
              <label htmlFor="b-table">Table</label>
              <select id="b-table" name="table" defaultValue="1">{[1, 2, 3, 4, 5, 6].map((n) => <option key={n}>{n}</option>)}</select>
            </div>
            <label className="check"><input type="checkbox" name="vip" /> {t('Invité·e VIP', 'VIP guest')}</label>
            <button type="submit" className="ax-btn">{t('Générer le billet', 'Generate ticket')}</button>
          </form>
        </section>
      </div>
      <div style={{ height: 56 }} />
    </>
  )
}
