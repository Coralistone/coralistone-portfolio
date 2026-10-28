import { useEffect, useId, useRef, useState } from 'react'
import { profile } from '../data/profile'
import { useT } from '../i18n'
import { MailIcon } from './Icons'

const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(profile.email)}`

/** Copie l'adresse ; renvoie true si la copie a réussi. */
export async function copyEmail() {
  try { await navigator.clipboard.writeText(profile.email); return true } catch { return false }
}

/**
 * Bouton e-mail : un simple lien mailto ne fait rien quand aucun logiciel de messagerie
 * n'est configuré (cas fréquent sur PC). On propose donc : copier l'adresse, Gmail, ou le logiciel par défaut.
 * Motif APG « Disclosure » : aria-expanded, Échap et clic extérieur ferment, le focus revient au bouton.
 */
export default function MailMenu() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const id = useId()
  const btn = useRef<HTMLButtonElement>(null)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus() } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const copy = async () => { setCopied(await copyEmail()); setTimeout(() => setCopied(false), 2500) }

  return (
    <div className="mail-menu">
      <button ref={btn} type="button" aria-expanded={open} aria-controls={id} onClick={() => { setOpen(!open); setCopied(false) }}
        aria-label={t('Me contacter par e-mail', 'Contact me by email')} title={profile.email}>
        <MailIcon />
      </button>
      <div ref={box} id={id} className="mail-pop" hidden={!open}>
        <p>{profile.email}</p>
        <button type="button" onClick={copy}>{t("Copier l'adresse", 'Copy address')}</button>
        <a href={gmail} target="_blank" rel="noopener noreferrer">{t('Écrire avec Gmail', 'Write with Gmail')}<span className="sr-only">{t(' (nouvel onglet)', ' (new tab)')}</span> ↗</a>
        <a href={`mailto:${profile.email}`}>{t('Ouvrir ma messagerie', 'Open my mail app')}</a>
        <p className="mail-copied" role="status">{copied ? t('Adresse copiée ✓', 'Address copied ✓') : ''}</p>
      </div>
    </div>
  )
}
