import { useRef, useState, type FormEvent } from 'react'
import DemoIntro from '../components/DemoIntro'
import { Field, LiveRegion, MenuButton, Modal, Tabs } from '../components/a11y'
import { useT } from '../i18n'

export default function ComponentsDemo() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [choice, setChoice] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const summary = useRef<HTMLDivElement>(null)

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const next: Record<string, string> = {}
    if (!String(data.get('name')).trim()) next.name = t('Indiquez votre nom.', 'Enter your name.')
    const mail = String(data.get('email'))
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) next.email = t('Indiquez une adresse e-mail au format nom@domaine.fr.', 'Enter an email address in the format name@domain.com.')
    setErrors(next)
    setSent(!Object.keys(next).length)
    // RGAA 11.10 : en cas d'erreur, le focus va sur le récapitulatif des erreurs
    requestAnimationFrame(() => summary.current?.focus())
  }

  const actions = t(['Télécharger', 'Ajouter à un panier', 'Partager', 'Archiver'], ['Download', 'Add to basket', 'Share', 'Archive'])
  const nErr = Object.keys(errors).length

  return (
    <>
      <DemoIntro
        kicker={t('Démo 1 · Design system accessible', 'Demo 1 · Accessible design system')}
        title={t('Kit de composants React accessibles', 'Accessible React component kit')}
        lead={t(
          "Les composants qu'on retrouve dans toute application produit (modale, onglets, menu, formulaire), construits pour être utilisables par tous : au clavier, au lecteur d'écran, en zoom.",
          'The components every product app needs (dialog, tabs, menu, form), built to be usable by everyone: with a keyboard, a screen reader or zoom.',
        )}
        problem={t(
          <>Les librairies d'interface oublient souvent l'accessibilité : focus perdu dans une modale, onglets impossibles à atteindre au clavier, erreurs de formulaire non annoncées. Ce kit applique les motifs ARIA de référence et les critères RGAA, sans dépendance externe.</>,
          <>UI libraries often overlook accessibility: focus lost in a dialog, tabs unreachable by keyboard, form errors never announced. This kit applies the reference ARIA patterns and RGAA/WCAG criteria, with no external dependency.</>,
        )}
        tryIt={t(
          [<>Débranchez la souris : tout se fait avec <kbd>Tab</kbd>, les flèches, <kbd>Entrée</kbd> et <kbd>Échap</kbd>.</>, <>Ouvrez la modale : le focus y reste piégé, puis revient sur le bouton à la fermeture.</>, <>Envoyez le formulaire vide : les erreurs sont listées, reliées aux champs et annoncées.</>],
          [<>Unplug the mouse: everything works with <kbd>Tab</kbd>, arrow keys, <kbd>Enter</kbd> and <kbd>Esc</kbd>.</>, <>Open the dialog: focus stays trapped inside, then returns to the button on close.</>, <>Submit the empty form: errors are listed, linked to the fields and announced.</>],
        )}
        under={t(
          [<>Motifs APG : Dialog, Tabs, Menu Button. Roving tabindex, attribut <code>inert</code>.</>, <>Critères RGAA 7.1, 7.3, 7.5, 11.1, 11.10, 12.8 référencés dans le code.</>, <>Composants typés en TypeScript et réutilisables, sans librairie tierce.</>],
          [<>APG patterns: Dialog, Tabs, Menu Button. Roving tabindex, <code>inert</code> attribute.</>, <>RGAA criteria 7.1, 7.3, 7.5, 11.1, 11.10, 12.8 referenced in the code.</>, <>Reusable, TypeScript-typed components with no third-party library.</>],
        )}
        stack={['React', 'TypeScript', 'ARIA (APG)', 'RGAA 4.1']}
      />
      <LiveRegion message={status} />

      <section className="demo-section" aria-labelledby="m-h">
        <div className="wrap">
          <h2 id="m-h">{t('Fenêtre modale', 'Modal dialog')}</h2>
          <p>{t('Le focus entre dans la fenêtre, y reste piégé, et revient sur le bouton à la fermeture. Le reste de la page devient inerte.', 'Focus moves into the dialog, stays trapped there, and returns to the button on close. The rest of the page becomes inert.')}</p>
          <div className="stage">
            <button type="button" className="ax-btn" onClick={() => setOpen(true)}>{t('Partager le média', 'Share media')}</button>
            <Modal open={open} onClose={() => { setOpen(false); setStatus(t('Fenêtre fermée', 'Dialog closed')) }} title={t('Partager le média', 'Share media')}>
              <p style={{ marginTop: 0 }}>{t('Choisissez les destinataires du lien de partage.', 'Choose who receives the share link.')}</p>
              <Field label={t('E-mail du destinataire', 'Recipient email')} type="email" autoComplete="email" />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="ax-btn secondary" onClick={() => setOpen(false)}>{t('Annuler', 'Cancel')}</button>
                <button type="button" className="ax-btn" onClick={() => { setOpen(false); setStatus(t('Lien de partage envoyé', 'Share link sent')) }}>{t('Envoyer', 'Send')}</button>
              </div>
            </Modal>
            <ul className="checklist"><li>RGAA 7.1, 7.3, 12.8 · APG Dialog (Modal)</li></ul>
          </div>
        </div>
      </section>

      <section className="demo-section" aria-labelledby="t-h">
        <div className="wrap">
          <h2 id="t-h">{t('Onglets', 'Tabs')}</h2>
          <p>{t(<>Un seul arrêt de tabulation pour la liste d'onglets, puis navigation aux flèches, <kbd>Début</kbd> et <kbd>Fin</kbd>.</>, <>A single tab stop for the tab list, then arrow keys, <kbd>Home</kbd> and <kbd>End</kbd>.</>)}</p>
          <div className="stage">
            <Tabs label={t('Informations du média', 'Media information')} tabs={[
              { id: 'meta', title: t('Métadonnées', 'Metadata'), content: <p>{t('Format JPEG · 4 032 × 3 024 px · 3,2 Mo · importé le 12 mars 2026.', 'JPEG · 4,032 × 3,024 px · 3.2 MB · uploaded on 12 March 2026.')}</p> },
              { id: 'rights', title: t('Droits', 'Rights'), content: <p>{t("Usage interne et réseaux sociaux jusqu'au 31 décembre 2026. Crédit obligatoire.", 'Internal and social media use until 31 December 2026. Credit required.')}</p> },
              { id: 'history', title: t('Historique', 'History'), content: <p>{t("3 versions · dernière modification par l'équipe marketing.", '3 versions · last edited by the marketing team.')}</p> },
            ]} />
            <ul className="checklist"><li>RGAA 7.1 · APG Tabs ({t('activation automatique', 'automatic activation')})</li></ul>
          </div>
        </div>
      </section>

      <section className="demo-section" aria-labelledby="mb-h">
        <div className="wrap">
          <h2 id="mb-h">{t("Menu d'actions", 'Action menu')}</h2>
          <p>{t(<><kbd>Entrée</kbd> ou <kbd>↓</kbd> ouvre le menu, les flèches le parcourent, <kbd>Échap</kbd> le ferme et rend le focus au bouton.</>, <><kbd>Enter</kbd> or <kbd>↓</kbd> opens the menu, arrow keys move through it, <kbd>Esc</kbd> closes it and returns focus to the button.</>)}</p>
          <div className="stage">
            <MenuButton label={t('Actions sur la sélection', 'Selection actions')} items={actions}
              onSelect={(i) => { setChoice(i); setStatus(t(`Action choisie : ${i}`, `Action chosen: ${i}`)) }} />
            <p aria-hidden="true" style={{ margin: '12px 0 0', color: 'var(--muted)' }}>{choice ? t(`Dernière action : ${choice}`, `Last action: ${choice}`) : t('Aucune action choisie.', 'No action chosen yet.')}</p>
            <ul className="checklist"><li>RGAA 7.1 · APG Menu Button</li></ul>
          </div>
        </div>
      </section>

      <section className="demo-section" aria-labelledby="f-h">
        <div className="wrap">
          <h2 id="f-h">{t('Formulaire avec validation', 'Form with validation')}</h2>
          <p>{t("Étiquettes visibles, aides et erreurs reliées aux champs, récapitulatif des erreurs focalisé à l'envoi.", 'Visible labels, hints and errors linked to fields, error summary focused on submit.')}</p>
          <div className="stage" style={{ maxWidth: 560 }}>
            <div ref={summary} tabIndex={-1} style={{ outline: 'none' }}>
              {nErr > 0 && (
                <div role="alert" style={{ border: '2px solid var(--danger)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  <strong>{t(`${nErr} erreur(s) à corriger :`, `${nErr} error(s) to fix:`)}</strong>
                  <ul style={{ margin: '6px 0 0' }}>{Object.values(errors).map((m) => <li key={m}>{m}</li>)}</ul>
                </div>
              )}
              {sent && <p role="status" style={{ color: 'var(--ok)', fontWeight: 600 }}>{t('Demande envoyée. Merci !', 'Request sent. Thank you!')}</p>}
            </div>
            <form noValidate onSubmit={submit}>
              <Field label={t('Nom', 'Name')} name="name" autoComplete="name" required error={errors.name} />
              <Field label="E-mail" name="email" type="email" autoComplete="email" required hint={t('Format attendu : nom@domaine.fr', 'Expected format: name@domain.com')} error={errors.email} />
              <button type="submit" className="ax-btn">{t('Demander une démo', 'Request a demo')}</button>
            </form>
            <ul className="checklist"><li>RGAA 11.1, 11.2, 11.10, 11.13</li></ul>
          </div>
        </div>
      </section>
      <div style={{ height: 48 }} />
    </>
  )
}
