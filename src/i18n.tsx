import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'fr' | 'en'
/** Texte bilingue */
export type L = { fr: string; en: string }

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'fr', setLang: () => {} })

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('lang')
    if (saved === 'fr' || saved === 'en') return saved
  } catch { /* stockage indisponible */ }
  return navigator.language?.startsWith('fr') ? 'fr' : 'en'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  useEffect(() => {
    document.documentElement.lang = lang // RGAA 8.3 : langue de la page à jour
    try { localStorage.setItem('lang', lang) } catch { /* ignore */ }
  }, [lang])
  return <LangCtx.Provider value={{ lang, setLang: setLangState }}>{children}</LangCtx.Provider>
}

export const useLang = () => useContext(LangCtx)

/** t(fr, en) : renvoie la version de la langue active (texte ou JSX). */
export function useT() {
  const { lang } = useLang()
  return <T,>(fr: T, en: T): T => (lang === 'en' ? en : fr)
}

/** tr({fr, en}) pour les données bilingues */
export function useTr() {
  const { lang } = useLang()
  return (v: L) => v[lang]
}
