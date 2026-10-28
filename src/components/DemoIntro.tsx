import type { ReactNode } from 'react'
import { Link } from '../App'
import { profile } from '../data/profile'
import { useT } from '../i18n'

/** En-tête commun des démos : contexte, ce qu'il faut tester, et ce qu'il y a sous le capot. */
export default function DemoIntro({ kicker, title, lead, problem, tryIt, under, stack }: {
  kicker: string; title: string; lead: string
  problem: ReactNode; tryIt: ReactNode[]; under: ReactNode[]; stack: string[]
}) {
  const t = useT()
  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <Link to="/#demos" className="back">← {t('Toutes les démos', 'All demos')}</Link>
          <p className="eyebrow">{kicker}</p>
          <h1>{title}</h1>
          <p>{lead}</p>
          <ul className="chips" aria-label={t('Technologies', 'Technologies')}>{stack.map((s) => <li className="chip" key={s}>{s}</li>)}</ul>
        </div>
      </div>
      <div className="wrap">
        <div className="intro-grid">
          <section className="intro-card" aria-labelledby="i-pb">
            <h2 id="i-pb"><span aria-hidden="true">01</span> {t('Le besoin', 'The need')}</h2>
            <p>{problem}</p>
          </section>
          <section className="intro-card" aria-labelledby="i-try">
            <h2 id="i-try"><span aria-hidden="true">02</span> {t('À tester', 'Try it')}</h2>
            <ul>{tryIt.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </section>
          <section className="intro-card" aria-labelledby="i-under">
            <h2 id="i-under"><span aria-hidden="true">03</span> {t('Sous le capot', 'Under the hood')}</h2>
            <ul>{under.map((x, i) => <li key={i}>{x}</li>)}</ul>
            <a href={profile.repo} target="_blank" rel="noopener noreferrer" className="intro-code">{t('Voir le code sur GitHub', 'View the code on GitHub')}<span className="sr-only">{t(' (nouvel onglet)', ' (new tab)')}</span> ↗</a>
          </section>
        </div>
      </div>
    </>
  )
}
