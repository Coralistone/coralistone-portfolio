/**
 * Kit de composants accessibles.
 * Chaque composant suit le motif correspondant de l'ARIA Authoring Practices Guide (APG)
 * et les critères RGAA cités en commentaire.
 */
import {
  useEffect, useId, useRef, useState,
  type KeyboardEvent, type ReactNode, type InputHTMLAttributes,
} from 'react'
import './a11y.css'
import { useT } from '../../i18n'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/* ------------------------------------------------------------------ Modal
 * APG « Dialog (Modal) » · RGAA 7.1, 7.3, 12.8
 * - focus placé dans la modale à l'ouverture, piégé tant qu'elle est ouverte
 * - Échap ferme, le focus revient sur le bouton déclencheur
 * - le reste de la page devient inerte (attribut inert)                      */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const returnTo = useRef<HTMLElement | null>(null)
  const t = useT()

  useEffect(() => {
    if (!open) return
    returnTo.current = document.activeElement as HTMLElement
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    const first = ref.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? ref.current)?.focus()
    return () => {
      root?.removeAttribute('inert')
      returnTo.current?.focus()
    }
  }, [open])

  if (!open) return null

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
    if (e.key !== 'Tab' || !ref.current) return
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (!items.length) return
    const first = items[0], last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  // Rendu hors de #root pour rester actif quand #root est inerte
  return createPortalToBody(
    <div className="ax-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className="ax-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={onKeyDown}>
        <div className="ax-dialog-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="ax-icon-btn" onClick={onClose} aria-label={t('Fermer la fenêtre', 'Close dialog')}>✕</button>
        </div>
        {children}
      </div>
    </div>,
  )
}

import { createPortal } from 'react-dom'
function createPortalToBody(node: ReactNode) { return createPortal(node, document.body) }

/* ------------------------------------------------------------------- Tabs
 * APG « Tabs with automatic activation » · RGAA 7.1
 * - un seul onglet dans l'ordre de tabulation (roving tabindex)
 * - ← → changent d'onglet, Début / Fin vont au premier / dernier            */
export function Tabs({ label, tabs }: { label: string; tabs: { id: string; title: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(0)
  const base = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const move = (i: number) => {
    const n = (i + tabs.length) % tabs.length
    setActive(n)
    refs.current[n]?.focus()
  }
  const onKeyDown = (e: KeyboardEvent) => {
    const map: Record<string, number> = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: tabs.length - 1 }
    if (e.key in map) { e.preventDefault(); move(map[e.key]) }
  }

  return (
    <div className="ax-tabs">
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown}>
        {tabs.map((t, i) => (
          <button
            key={t.id} ref={(el) => { refs.current[i] = el }} type="button" role="tab"
            id={`${base}-tab-${t.id}`} aria-controls={`${base}-panel-${t.id}`}
            aria-selected={i === active} tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
          >{t.title}</button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.id} role="tabpanel" id={`${base}-panel-${t.id}`} aria-labelledby={`${base}-tab-${t.id}`} hidden={i !== active} tabIndex={0}>
          {t.content}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------- MenuButton
 * APG « Menu Button » · RGAA 7.1
 * - Entrée / Espace / ↓ ouvrent le menu et focalisent le premier élément
 * - ↑ ↓ parcourent, Échap ferme et rend le focus au bouton
 * - un clic à l'extérieur ferme le menu                                     */
export function MenuButton({ label, items, onSelect }: { label: string; items: string[]; onSelect: (item: string) => void }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const btn = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const id = useId()

  useEffect(() => {
    if (open) (list.current?.children[index] as HTMLElement | undefined)?.focus()
  }, [open, index])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!list.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const openAt = (i: number) => { setIndex(i); setOpen(true) }
  const close = () => { setOpen(false); btn.current?.focus() }
  const choose = (item: string) => { onSelect(item); close() }

  const onBtnKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); openAt(0) }
    if (e.key === 'ArrowUp') { e.preventDefault(); openAt(items.length - 1) }
  }
  const onMenuKey = (e: KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => setIndex((index + 1) % items.length),
      ArrowUp: () => setIndex((index - 1 + items.length) % items.length),
      Home: () => setIndex(0),
      End: () => setIndex(items.length - 1),
      Escape: close,
      Tab: () => setOpen(false),
    }
    if (keys[e.key]) { if (e.key !== 'Tab') e.preventDefault(); keys[e.key]() }
  }

  return (
    <div className="ax-menu">
      <button
        ref={btn} type="button" className="ax-btn" aria-haspopup="menu" aria-expanded={open} aria-controls={id}
        onClick={() => (open ? setOpen(false) : openAt(0))} onKeyDown={onBtnKey}
      >{label} <span aria-hidden="true">▾</span></button>
      <ul ref={list} id={id} role="menu" aria-label={label} hidden={!open} onKeyDown={onMenuKey}>
        {items.map((item, i) => (
          <li key={item} role="menuitem" tabIndex={i === index ? 0 : -1} onClick={() => choose(item)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(item) } }}
          >{item}</li>
        ))}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------------ Field
 * RGAA 11.1 (étiquette), 11.10 (contrôle de saisie), 11.13 (autocomplete)
 * - étiquette visible reliée au champ, aide reliée par aria-describedby
 * - erreur annoncée et reliée au champ, aria-invalid                        */
export function Field({ label, hint, error, ...input }: { label: string; hint?: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined
  return (
    <div className="ax-field">
      <label htmlFor={id}>{label}{input.required && <span aria-hidden="true"> *</span>}</label>
      {hint && <p id={`${id}-hint`} className="ax-hint">{hint}</p>}
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...input} />
      {error && <p id={`${id}-err`} className="ax-error"><span aria-hidden="true">⚠ </span>{error}</p>}
    </div>
  )
}

/* -------------------------------------------------------------- LiveRegion
 * RGAA 7.5 : messages de statut restitués par les lecteurs d'écran          */
export function LiveRegion({ message }: { message: string }) {
  return <p className="sr-only" role="status" aria-live="polite">{message}</p>
}
