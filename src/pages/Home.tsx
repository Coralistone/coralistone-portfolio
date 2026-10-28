import { Link, navigate } from '../App'
import Social from '../components/Social'
import TechMarquee from '../components/TechMarquee'
import { DownloadIcon } from '../components/Icons'
import { copyEmail } from '../components/MailMenu'
import { useState } from 'react'
import { demos, jobs, profile, projects, skills, stats } from '../data/profile'
import { useT, useTr } from '../i18n'

export default function Home() {
  const t = useT()
  const tr = useTr()
  const nw = t(' (nouvel onglet)', ' (new tab)')

  return (
    <>
      <div className="hero">
        <div className="glow" aria-hidden="true" />
        <div className="wrap">
          <div className="avatar-wrap">
            <img className="avatar" src="/photo.jpg" alt={t(`Portrait de ${profile.name}`, `Portrait of ${profile.name}`)} width={176} height={176} />
            <span className="dot" aria-hidden="true" />
          </div>
          <div>
            <p className="ready"><span className="pulse" aria-hidden="true" />{t('Prête à rejoindre votre équipe', 'Ready to join your team')} <span aria-hidden="true">🙂</span></p>
            <p className="eyebrow">Product Engineering &amp; Delivery</p>
            <h1>{profile.name}<br />Frontend React <em>{t('accessible', 'accessibility-first')}</em></h1>
            <p className="lead">{t(
              'Je transforme les besoins produit en interfaces React accessibles et fiables, de la maquette à la mise en production.',
              'I turn product needs into accessible, reliable React interfaces, from mock-up to production.',
            )}</p>

            <dl className="facts">
              <div><dt>{t('Langues parlées', 'Spoken languages')}</dt><dd>{t('Français · Anglais (B2) · Allemand (notions)', 'French · English (B2) · German (basic)')}</dd></div>
              <div><dt>{t('Localisation', 'Location')}</dt><dd>{t('Rennes, France · ouverte à Paris et au télétravail', 'Rennes, France · open to Paris and remote')}</dd></div>
            </dl>

            <div className="cta">
              <Link to="/#demos" className="btn primary">{t('Voir mes démos', 'See my demos')}</Link>
              <a className="btn ghost" href={profile.cv} download>
                <DownloadIcon />{t('Télécharger mon CV', 'Download CV')}<span className="sr-only"> (PDF{t(', en français', ', in French')})</span>
              </a>
              <Social className="on-dark" />
            </div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <dl className="stats" aria-label={t('Résultats clés', 'Key results')}>
          {stats.map((s) => (
            <div className="stat" key={s.value.fr}><dt className="sr-only">{tr(s.label)}</dt><dd style={{ margin: 0 }}><b>{tr(s.value)}</b><span aria-hidden="true">{tr(s.label)}</span></dd></div>
          ))}
        </dl>
      </div>

      <TechMarquee />

      <div className="wrap">
        <section className="block" id="about" aria-labelledby="about-h">
          <div className="sec-head"><span className="tag" aria-hidden="true">01</span><h2 id="about-h">{t('À propos', 'About me')}</h2></div>
          <div className="prose">
            <p>{t(
              "Chez Keepeek, éditeur d'une solution DAM (gestion de médias), je prends en charge les fonctionnalités de bout en bout : maquettes, spécifications techniques, développement React, tests, puis release et mise en production chez les clients.",
              'At Keepeek, a DAM (digital asset management) software company, I own features end to end: mock-ups, technical specs, React development, testing, then release and deployment to clients.',
            )}</p>
            <p>{t(
              'Ingénieure CESI (mention Très bien), je mène aussi des projets personnels en machine learning et en cybersécurité.',
              'CESI engineering graduate (with highest honours), I also run personal projects in machine learning and cybersecurity.',
            )}</p>
          </div>
          <ul className="diff">
            <li><span><strong>{t('Accessibilité dès la conception', 'Accessibility by design')}</strong> : {t('RGAA, contrastes, sémantique HTML. Objectif de 80 % chez Keepeek, largement dépassé.', 'RGAA/WCAG, contrast, semantic HTML. 80% target at Keepeek, well exceeded.')}</span></li>
            <li><span><strong>{t('IA générative maîtrisée', 'Controlled use of generative AI')}</strong> : {t('boilerplate, documentation et refactoring, avec relecture, tests et revue de code systématiques.', 'boilerplate, documentation and refactoring, always reviewed, tested and code-reviewed.')}</span></li>
            <li><span><strong>{t('Qualité et sécurité', 'Quality and security')}</strong> : {t('correctifs CVE à chaque sprint, tests unitaires et fonctionnels, revues de code.', 'CVE fixes every sprint, unit and functional tests, code reviews.')}</span></li>
            <li><span><strong>Release management</strong> : {t('versioning, changelogs, déploiements clients.', 'versioning, changelogs, client deployments.')}</span></li>
          </ul>
        </section>

        <section className="block" id="experience" aria-labelledby="exp-h">
          <div className="sec-head"><span className="tag" aria-hidden="true">02</span><h2 id="exp-h">{t('Expérience', 'Experience')}</h2></div>
          <ol className="log">
            {jobs.map((j) => (
              <li className={`rel${j.current ? ' current' : ''}`} key={j.org}>
                <article className="card">
                  <div className="rel-top"><h3>{tr(j.role)} <span className="org">· {j.org}</span></h3><span className="rel-when"><time>{tr(j.when)}</time></span></div>
                  <p className="ctx">{tr(j.ctx)}</p>
                  <ul>{j.points.map((p) => <li key={p.text.fr}>{p.win && <span className="win">{tr(p.win)}</span>}{tr(p.text)}</li>)}</ul>
                </article>
              </li>
            ))}
          </ol>
        </section>

        <section className="block" id="projects" aria-labelledby="proj-h">
          <div className="sec-head"><span className="tag" aria-hidden="true">03</span><h2 id="proj-h">{t('Projets', 'Projects')}</h2></div>
          <div className="grid projects">
            {projects.map((p) => (
              <article className="card proj" key={p.title.fr}>
                <div className="proj-cover" aria-hidden="true" style={{ ['--h' as string]: p.hue }} onClick={() => p.demo && navigate(p.demo)} data-clickable={p.demo ? '' : undefined}>
                  {p.image ? <img src={p.image} alt="" loading="lazy" /> : <span>{p.icon}</span>}
                </div>
                <span className="status">{tr(p.status)}</span>
                <h3>{tr(p.title)}</h3>
                <p>{tr(p.text)}</p>
                <ul className="tags" aria-label="Technologies">{p.tags.map((x) => <li key={x}>{x}</li>)}</ul>
                {p.note && <p className="proj-note"><span aria-hidden="true">🔒 </span>{tr(p.note)}</p>}
                {(p.demo || p.repo) && (
                  <div className="links">
                    {p.demo && <Link to={p.demo} className="btn solid">{t('Voir la démo', 'View demo')}<span className="sr-only"> : {tr(p.title)}</span></Link>}
                    {p.repo && <a className="btn line" href={p.repo} target="_blank" rel="noopener noreferrer">{t('Code sur GitHub', 'Code on GitHub')}<span className="sr-only"> : {tr(p.title)}{nw}</span></a>}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="block" id="demos" aria-labelledby="demos-h">
          <div className="sec-head"><span className="tag" aria-hidden="true">04</span><h2 id="demos-h">{t('Démos en ligne', 'Live demos')}</h2></div>
          <p className="sec-lead">{t(
            "Trois démos à tester directement dans le navigateur. Chacune explique le besoin, ce qu'il faut tester et comment elle est construite.",
            'Three demos you can try right in your browser. Each one explains the need, what to try and how it is built.',
          )}</p>
          <div className="showcase">
            {demos.map((d, i) => (
              <article className={`show${i % 2 ? ' flip' : ''}`} key={d.path}>
                <Link to={d.path} className="show-shot" tabIndex={-1} aria-hidden="true">
                  <img src={d.image} alt="" loading="lazy" width={1200} height={750} />
                  <span className="show-play">{t('Ouvrir la démo →', 'Open demo →')}</span>
                </Link>
                <div className="show-body">
                  <p className="show-kicker">{tr(d.kicker)}</p>
                  <h3>{tr(d.title)}</h3>
                  <p>{tr(d.text)}</p>
                  <ul className="show-points">{d.points.map((p) => <li key={p.fr}>{tr(p)}</li>)}</ul>
                  <ul className="tags" aria-label={t('Technologies', 'Technologies')}>{d.tags.map((x) => <li key={x}>{x}</li>)}</ul>
                  <div className="links">
                    <Link to={d.path} className="btn solid">{t('Tester la démo', 'Try the demo')}<span className="sr-only"> : {tr(d.title)}</span></Link>
                    <a className="btn line" href={profile.repo} target="_blank" rel="noopener noreferrer">{t('Voir le code', 'View code')}<span className="sr-only"> : {tr(d.title)}{nw}</span></a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="block" id="skills" aria-labelledby="skills-h">
          <div className="sec-head"><span className="tag" aria-hidden="true">05</span><h2 id="skills-h">{t('Compétences', 'Skills')}</h2></div>
          <div className="grid">
            {skills.map((s) => (
              <div className="card" key={s.group.fr}>
                <h3 className="kicker">{tr(s.group)}</h3>
                <ul className="tags">{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section className="block" id="education" aria-labelledby="edu-h">
          <div className="sec-head"><span className="tag" aria-hidden="true">06</span><h2 id="edu-h">{t('Formation', 'Education')}</h2></div>
          <div className="grid">
            <div className="card edu"><h3>{t("Diplôme d'ingénieur, développement FullStack", 'Engineering degree, Full-stack development')}</h3><p>CESI · 2021 – 2024 · {t('mention Très bien', 'highest honours')}</p></div>
            <div className="card edu"><h3>{t('Licence, développement Web', "Bachelor's degree, Web development")}</h3><p>CESI · 2021 – 2022 · {t('mention Bien', 'with honours')}</p></div>
          </div>
        </section>

        <section className="contact" id="contact" aria-labelledby="contact-h">
          <div>
            <p className="ready on-contact"><span className="pulse" aria-hidden="true" />{t('Prête à rejoindre votre équipe', 'Ready to join your team')} <span aria-hidden="true">🙂</span></p>
            <h2 id="contact-h">{t('Échangeons', "Let's talk")}</h2>
            <p>{t(
              "Développement produit, intégration d'API, accessibilité ou IA appliquée au dev : je suis toujours partante pour en parler.",
              "Product development, API integration, accessibility or AI-assisted development: I'm always happy to talk.",
            )}</p>
          </div>
          <div className="links">
            <ContactMail />
            <a className="btn primary" href={profile.cv} download><DownloadIcon />{t('Télécharger mon CV', 'Download CV')}<span className="sr-only"> (PDF)</span></a>
            <Social className="on-dark" />
          </div>
        </section>
      </div>
    </>
  )
}

/** Adresse e-mail visible et sélectionnable, avec copie et ouverture dans Gmail. */
function ContactMail() {
  const t = useT()
  const [copied, setCopied] = useState(false)
  return (
    <div className="mail">
      <span className="mail-addr">{profile.email}</span>
      <button type="button" className="mail-btn" onClick={async () => { setCopied(await copyEmail()); setTimeout(() => setCopied(false), 2500) }}>
        {copied ? t('Copiée ✓', 'Copied ✓') : t('Copier', 'Copy')}
      </button>
      <a className="mail-btn" href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(profile.email)}`} target="_blank" rel="noopener noreferrer">
        Gmail<span className="sr-only">{t(' : écrire un e-mail (nouvel onglet)', ': write an email (new tab)')}</span> ↗
      </a>
      <span className="sr-only" role="status">{copied ? t('Adresse copiée', 'Address copied') : ''}</span>
    </div>
  )
}
