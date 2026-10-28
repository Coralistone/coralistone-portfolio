import { profile } from '../data/profile'
import { useT } from '../i18n'
import { GithubIcon, LinkedinIcon, MailIcon } from './Icons'

/** Liens GitHub, LinkedIn et e-mail sous forme d'icônes, avec nom accessible. */
export default function Social({ className = '' }: { className?: string }) {
  const t = useT()
  const nw = t(' (nouvel onglet)', ' (new tab)')
  return (
    <ul className={`social ${className}`} aria-label={t('Me retrouver', 'Find me')}>
      <li><a href={profile.github} target="_blank" rel="noopener noreferrer" aria-label={`GitHub${nw}`} title="GitHub"><GithubIcon /></a></li>
      <li><a href={profile.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`LinkedIn${nw}`} title="LinkedIn"><LinkedinIcon /></a></li>
      <li><a href={`mailto:${profile.email}`} aria-label={t(`M'écrire : ${profile.email}`, `Email me: ${profile.email}`)} title={profile.email}><MailIcon /></a></li>
    </ul>
  )
}
