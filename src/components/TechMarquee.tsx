import { useState } from 'react'
import { tech } from '../data/profile'
import { useT } from '../i18n'
import { PauseIcon, PlayIcon } from './Icons'

/**
 * Bandeau défilant des technologies.
 * RGAA 13.8 : un contenu en mouvement doit pouvoir être mis en pause → bouton dédié,
 * pause au survol et au focus, et aucun mouvement si prefers-reduced-motion.
 */
export default function TechMarquee() {
  const t = useT()
  const [paused, setPaused] = useState(false)
  return (
    <section className={`marquee${paused ? ' is-paused' : ''}`} aria-labelledby="tech-h">
      <div className="wrap marquee-head">
        <h2 id="tech-h">{t('Technologies que j’utilise', 'Technologies I use')}</h2>
        <button type="button" className="marquee-toggle" onClick={() => setPaused(!paused)} aria-pressed={paused}>
          {paused ? <PlayIcon /> : <PauseIcon />}
          {paused ? t('Relancer le défilement', 'Resume scrolling') : t('Mettre en pause', 'Pause')}
        </button>
      </div>
      <div className="marquee-viewport">
        <ul className="marquee-track">
          {[...tech, ...tech].map(([icon, label], i) => (
            <li key={i} aria-hidden={i >= tech.length ? true : undefined}>
              <img src={`/tech/${icon}.svg`} alt="" width={32} height={32} loading="lazy" />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
