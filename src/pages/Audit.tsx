import { useEffect, useRef, useState, type FormEvent } from 'react'
import DemoIntro from '../components/DemoIntro'
import { LiveRegion } from '../components/a11y'
import { useLang, useT } from '../i18n'
import '../../extension/audit-core.js'

type Issue = { id: string; rgaa: string; wcag: string; severity: 'erreur' | 'avertissement'; message: string; target: string; snippet: string }
type Report = { score: number; checked: number; issues: Issue[]; stats: Record<string, number> }
declare global { var runA11yAudit: (doc: Document, lang?: 'fr' | 'en') => Report }

const SAMPLE = `<!doctype html>
<html>
<head><title></title></head>
<body style="font-family: sans-serif">
  <h2>Nos offres</h2>
  <img src="banniere.jpg">
  <p style="color:#9aa3ad">Profitez de -20 % sur toute la collection.</p>
  <h4>Inscription à la newsletter</h4>
  <input type="email" placeholder="Votre e-mail">
  <button><svg width="16" height="16"></svg></button>
  <a href="/offres">Cliquez ici</a>
  <a href="/contact"><img src="contact.png" alt="contact.png"></a>
  <p style="color:#ffffff; background:#ffd84d">Livraison offerte dès 50 €</p>
</body>
</html>`

export default function Audit() {
  const t = useT()
  const { lang } = useLang()
  const [html, setHtml] = useState(SAMPLE)
  const [report, setReport] = useState<Report | null>(null)
  const [target, setTarget] = useState<'html' | 'self' | 'url' | null>(null)
  const [site, setSite] = useState('https://www.keepeek.com')
  const [siteHost, setSiteHost] = useState('')
  const [loading, setLoading] = useState(false)
  const [siteError, setSiteError] = useState('')
  const frame = useRef<HTMLIFrameElement>(null)
  const result = useRef<HTMLHeadingElement>(null)

  const run = (which: 'html' | 'self' | 'url') => {
    const doc = which === 'self' ? document : frame.current?.contentDocument
    if (doc) setReport(globalThis.runA11yAudit(doc, lang))
  }
  const show = (which: 'html' | 'self' | 'url') => {
    setTarget(which); run(which)
    requestAnimationFrame(() => result.current?.focus())
  }
  // Le rapport suit la langue choisie
  useEffect(() => { if (target) run(target) }, [lang]) // eslint-disable-line react-hooks/exhaustive-deps

  const auditHtml = () => {
    const f = frame.current!
    f.onload = () => show('html')
    f.srcdoc = html
  }

  /** Analyse d'un site en ligne : la page est récupérée par /api/fetch-page, puis rendue sans JavaScript dans un cadre isolé. */
  const auditUrl = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSiteError(''); setLoading(true)
    try {
      const r = await fetch(`/api/fetch-page?url=${encodeURIComponent(site.trim())}`)
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Erreur')
      const finalUrl = new URL(data.url)
      setSiteHost(finalUrl.hostname)
      // <base> pour que les feuilles de style du site se chargent ; scripts retirés (le cadre est de toute façon sans JavaScript)
      const html = String(data.html).replace(/<script[\s\S]*?<\/script>/gi, '')
      const withBase = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => `${m}<base href="${finalUrl.href}">`) : `<base href="${finalUrl.href}">${html}`
      const f = frame.current!
      f.onload = () => setTimeout(() => { setLoading(false); show('url') }, 1200) // laisse le temps aux CSS de s'appliquer
      f.srcdoc = withBase
    } catch (err) {
      setLoading(false)
      setSiteError(t(`Analyse impossible : ${(err as Error).message}`, `Analysis failed: ${(err as Error).message}`))
    }
  }

  const errors = report?.issues.filter((i) => i.severity === 'erreur') ?? []
  const warnings = report?.issues.filter((i) => i.severity === 'avertissement') ?? []
  const tone = !report ? '' : report.score >= 90 ? 'var(--ok)' : report.score >= 70 ? 'var(--warn)' : 'var(--danger)'
  const sev = (s: Issue['severity']) => (s === 'erreur' ? t('erreur', 'error') : t('avertissement', 'warning'))

  return (
    <>
      <DemoIntro
        kicker={t('Démo 3 · Outil qualité', 'Demo 3 · Quality tool')}
        title={t("Audit d'accessibilité", 'Accessibility audit')}
        lead={t(
          "Un moteur qui analyse une page et liste les erreurs d'accessibilité, avec la référence RGAA et WCAG de chacune. Le même moteur tourne dans une extension Chrome.",
          'An engine that scans a page and lists accessibility issues, each with its RGAA and WCAG reference. The same engine runs in a Chrome extension.',
        )}
        problem={t(
          <>Les erreurs d'accessibilité les plus fréquentes (contrastes, images sans alternative, champs sans étiquette) sont détectables automatiquement. Un outil simple permet de les repérer avant la recette, et de suivre un objectif de conformité.</>,
          <>The most common accessibility errors (contrast, images without alt text, unlabelled fields) can be detected automatically. A simple tool catches them before QA and helps track a compliance target.</>,
        )}
        tryIt={t(
          [<>Tapez l'adresse d'un site (par exemple celui d'une entreprise) et obtenez son rapport.</>, <>Cliquez sur « Analyser ce code » : l'exemple contient 11 problèmes volontaires.</>, <>Corrigez une erreur dans le code (ajoutez <code>alt=""</code>, <code>lang="fr"</code>…) et relancez : le score monte.</>, <>Analysez ce portfolio lui-même : 100 / 100.</>],
          [<>Enter a website address (a company's site, for example) and get its report.</>, <>Click “Analyse this code”: the sample contains 11 deliberate issues.</>, <>Fix an error in the code (add <code>alt=""</code>, <code>lang="fr"</code>…) and run it again: the score goes up.</>, <>Analyse this portfolio itself: 100 / 100.</>],
        )}
        under={t(
          [<>Calcul du contraste selon la formule WCAG, avec la composition des fonds semi-transparents.</>, <>Calcul du nom accessible (aria-labelledby, aria-label, label, contenu).</>, <>Un seul fichier moteur, partagé entre le site et l'extension Chrome (Manifest V3).</>, <>Analyse d'URL : fonction serverless Vercel qui récupère la page (protégée contre les requêtes vers des adresses internes).</>],
          [<>Contrast computed with the WCAG formula, including blending of semi-transparent backgrounds.</>, <>Accessible name computation (aria-labelledby, aria-label, label, content).</>, <>A single engine file shared by the site and the Chrome extension (Manifest V3).</>, <>URL analysis: a Vercel serverless function fetches the page (protected against requests to internal addresses).</>],
        )}
        stack={['TypeScript', 'WCAG 2.1', 'RGAA 4.1', 'Chrome Extension MV3']}
      />

      <section className="demo-section" aria-labelledby="u-h">
        <div className="wrap">
          <h2 id="u-h">{t('Analyser un site en ligne', 'Analyse a live website')}</h2>
          <p>{t("Tapez l'adresse d'un site : sa page est récupérée puis analysée en quelques secondes.", "Enter a website address: the page is fetched and analysed in a few seconds.")}</p>
          <form className="stage url-form" onSubmit={auditUrl} noValidate>
            <div className="ax-field" style={{ margin: 0, flex: '1 1 320px' }}>
              <label htmlFor="u-site">{t('Adresse du site', 'Website address')}</label>
              <input id="u-site" type="url" inputMode="url" autoComplete="url" value={site} onChange={(e) => setSite(e.target.value)}
                placeholder="https://www.exemple.fr" aria-describedby="u-help" aria-invalid={siteError ? true : undefined} />
            </div>
            <button type="submit" className="ax-btn" disabled={loading} aria-busy={loading}>
              {loading ? t('Analyse en cours…', 'Analysing…') : t('Analyser le site', 'Analyse website')}
            </button>
            <p id="u-help" className="url-help">{t(
              'Analyse la page telle que le serveur la renvoie, sans exécuter son JavaScript : un site construit entièrement en JavaScript peut être analysé partiellement.',
              'Analyses the page as the server returns it, without running its JavaScript: a fully JavaScript-rendered site may be partially analysed.',
            )}</p>
            {siteError && <p role="alert" className="ax-error" style={{ flexBasis: '100%' }}>{siteError}</p>}
          </form>
        </div>
      </section>

      <section className="demo-section" aria-labelledby="a-h">
        <div className="wrap">
          <h2 id="a-h">{t('Analyser du code HTML', 'Analyse HTML code')}</h2>
          <p>{t("Le code d'exemple contient volontairement des erreurs courantes. Modifiez-le ou collez le vôtre.", 'The sample code deliberately contains common errors. Edit it or paste your own.')}</p>
          <div className="stage">
            <label htmlFor="a-code" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('Code HTML à analyser', 'HTML code to analyse')}</label>
            <textarea id="a-code" value={html} onChange={(e) => setHtml(e.target.value)} spellCheck={false} rows={14}
              style={{ width: '100%', font: '14px/1.5 var(--mono)', padding: 12, borderRadius: 8, border: '1px solid var(--muted)', background: 'var(--bg)', color: 'var(--fg)' }} />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <button type="button" className="ax-btn" onClick={auditHtml}>{t('Analyser ce code', 'Analyse this code')}</button>
              <button type="button" className="ax-btn secondary" onClick={() => show('self')}>{t('Analyser cette page du portfolio', 'Analyse this portfolio page')}</button>
            </div>
            <iframe ref={frame} title={t('Aperçu du code analysé', 'Preview of the analysed code')} sandbox="allow-same-origin" style={{ width: '100%', height: 0, border: 0, display: 'block' }} />
          </div>
        </div>
      </section>

      <LiveRegion message={report ? t(
        `Analyse terminée : score ${report.score} sur 100, ${errors.length} erreurs, ${warnings.length} avertissements.`,
        `Analysis complete: score ${report.score} out of 100, ${errors.length} errors, ${warnings.length} warnings.`,
      ) : ''} />

      {report && (
        <section className="demo-section" aria-labelledby="r-h">
          <div className="wrap">
            <h2 id="r-h" ref={result} tabIndex={-1} style={{ outline: 'none' }}>
              {target === 'self' ? t('Rapport pour cette page', 'Report for this page') : target === 'url' ? t(`Rapport pour ${siteHost}`, `Report for ${siteHost}`) : t('Rapport pour le code HTML saisi', 'Report for the HTML code')}
            </h2>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 20 }}>
              <div className="card"><p className="kicker">Score</p><b style={{ fontFamily: 'var(--display)', fontSize: 34, color: tone }}>{report.score}<span style={{ fontSize: 18 }}> / 100</span></b></div>
              <div className="card"><p className="kicker">{t('Erreurs', 'Errors')}</p><b style={{ fontFamily: 'var(--display)', fontSize: 34 }}>{errors.length}</b></div>
              <div className="card"><p className="kicker">{t('Avertissements', 'Warnings')}</p><b style={{ fontFamily: 'var(--display)', fontSize: 34 }}>{warnings.length}</b></div>
              <div className="card"><p className="kicker">{t('Points vérifiés', 'Checks run')}</p><b style={{ fontFamily: 'var(--display)', fontSize: 34 }}>{report.checked}</b></div>
            </div>
            {report.issues.length === 0 ? (
              <p style={{ color: 'var(--ok)', fontWeight: 600 }}>{t('Aucun problème détecté automatiquement. Pensez à compléter par un audit manuel.', 'No issues detected automatically. Complete with a manual audit.')}</p>
            ) : (
              <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                {[...errors, ...warnings].map((i, k) => (
                  <li key={k} className="card" style={{ padding: 16, borderLeft: `4px solid ${i.severity === 'erreur' ? 'var(--danger)' : 'var(--warn)'}` }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <strong>{i.message}</strong>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)' }}>{sev(i.severity)} · RGAA {i.rgaa} · WCAG {i.wcag}</span>
                    </div>
                    {i.snippet && <pre style={{ margin: '8px 0 0', overflowX: 'auto', fontSize: 13, background: 'var(--bg)', padding: 8, borderRadius: 6 }}><code>{i.snippet}</code></pre>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      )}

      <section className="demo-section" aria-labelledby="x-h">
        <div className="wrap">
          <h2 id="x-h">{t('Extension Chrome', 'Chrome extension')}</h2>
          <p>{t(
            <>Le dossier <code>extension/</code> du dépôt contient une extension Manifest V3 : un clic sur l'icône analyse l'onglet ouvert et affiche le rapport. Installation : <code>chrome://extensions</code> → Mode développeur → Charger l'extension non empaquetée.</>,
            <>The repository's <code>extension/</code> folder contains a Manifest V3 extension: one click on its icon analyses the open tab and shows the report. Install: <code>chrome://extensions</code> → Developer mode → Load unpacked.</>,
          )}</p>
        </div>
      </section>
      <div style={{ height: 48 }} />
    </>
  )
}
