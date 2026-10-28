/**
 * Moteur d'audit d'accessibilité, partagé entre la démo web et l'extension Chrome.
 * Vérifie un sous-ensemble automatisable de critères RGAA 4.1 / WCAG 2.1.
 * Un audit automatique ne remplace pas un audit manuel : il repère les erreurs fréquentes.
 */
;(function (g) {
  /** @typedef {{ id: string, rgaa: string, wcag: string, severity: 'erreur'|'avertissement', message: string, target: string, snippet: string }} Issue */

  function describe(el) {
    if (!el || !el.tagName) return ''
    let s = el.tagName.toLowerCase()
    if (el.id) s += '#' + el.id
    else if (el.classList && el.classList.length) s += '.' + [...el.classList].slice(0, 2).join('.')
    return s
  }
  function snippet(el) {
    const html = el.outerHTML || ''
    return html.length > 140 ? html.slice(0, 137) + '…' : html
  }
  function isHidden(el, win) {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (n.hidden || n.getAttribute('aria-hidden') === 'true') return true
      const cs = win.getComputedStyle(n)
      if (cs.display === 'none' || cs.visibility === 'hidden') return true
    }
    return false
  }
  function accName(el, doc) {
    const lb = el.getAttribute('aria-labelledby')
    if (lb) {
      const t = lb.split(/\s+/).map((id) => doc.getElementById(id)?.textContent || '').join(' ').trim()
      if (t) return t
    }
    const al = el.getAttribute('aria-label')
    if (al && al.trim()) return al.trim()
    if (el.id) {
      const l = doc.querySelector('label[for="' + CSS.escape(el.id) + '"]')
      if (l && l.textContent.trim()) return l.textContent.trim()
    }
    const wrap = el.closest('label')
    if (wrap && wrap.textContent.trim()) return wrap.textContent.trim()
    if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
      const imgs = [...el.querySelectorAll('img[alt]')].map((i) => i.alt).join(' ').trim()
      const txt = (el.textContent || '').trim()
      if (txt || imgs) return (txt + ' ' + imgs).trim()
    }
    if (el.getAttribute('title')) return el.getAttribute('title').trim()
    if (el.tagName === 'INPUT' && ['submit', 'button', 'reset'].includes(el.type) && el.value) return el.value
    return ''
  }

  // ---- Contraste (WCAG 1.4.3 / RGAA 3.2)
  function parseColor(c) {
    if (!c) return null
    const srgb = c.match(/color\(srgb ([^)]+)\)/)
    if (srgb) {
      const p = srgb[1].split(/[ /]+/).filter(Boolean).map(Number)
      return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 }
    }
    const m = c.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
  }
  function lum({ r, g, b }) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  function ratio(a, b) {
    const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
    return (l1 + 0.05) / (l2 + 0.05)
  }
  function blend(top, bottom) {
    const a = top.a
    return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 }
  }
  function background(el, win) {
    const layers = []
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = win.getComputedStyle(n)
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null // image ou dégradé : non mesurable automatiquement
      const c = parseColor(cs.backgroundColor)
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break }
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 }
    for (let i = layers.length - 1; i >= 0; i--) bg = blend(layers[i], bg)
    return bg
  }

  /**
   * @param {Document} doc
   * @param {'fr'|'en'} [lang] langue des messages (français par défaut)
   * @returns {{ score: number, checked: number, issues: Issue[], stats: Record<string, number> }}
   */
  function runA11yAudit(doc, lang) {
    const M = (fr, en) => (lang === 'en' ? en : fr)
    const win = doc.defaultView || window
    /** @type {Issue[]} */
    const issues = []
    let checked = 0
    const stats = { images: 0, liens: 0, champs: 0, boutons: 0, titres: 0, textes: 0 }
    const add = (id, rgaa, wcag, severity, message, el) =>
      issues.push({ id, rgaa, wcag, severity, message, target: el ? describe(el) : 'document', snippet: el ? snippet(el) : '' })

    // Langue et titre de page
    checked += 2
    if (!doc.documentElement.getAttribute('lang')) add('lang', '8.3', '3.1.1', 'erreur', M("La langue de la page n'est pas indiquée (attribut lang sur <html>).", 'The page language is not set (lang attribute on <html>).'), null)
    if (!doc.title || !doc.title.trim()) add('title', '8.5', '2.4.2', 'erreur', M("La page n'a pas de titre (<title>).", 'The page has no title (<title>).'), null)

    // Images
    doc.querySelectorAll('img, input[type="image"], [role="img"]').forEach((el) => {
      if (isHidden(el, win)) return
      stats.images++; checked++
      const role = el.getAttribute('role')
      if (role === 'presentation' || role === 'none') return
      if (el.tagName === 'IMG' && !el.hasAttribute('alt') && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby'))
        add('img-alt', '1.1', '1.1.1', 'erreur', M("Image sans alternative textuelle (attribut alt manquant). Mettre alt=\"\" si elle est décorative.", 'Image without a text alternative (missing alt). Use alt="" if it is decorative.'), el)
      else if (el.tagName === 'IMG' && /\.(png|jpe?g|gif|svg|webp)$/i.test(el.getAttribute('alt') || ''))
        add('img-alt-file', '1.3', '1.1.1', 'avertissement', M("L'alternative de l'image est un nom de fichier : elle n'est pas pertinente.", 'The image alternative is a file name: it is not meaningful.'), el)
      else if (el.tagName !== 'IMG' && !accName(el, doc))
        add('img-name', '1.1', '1.1.1', 'erreur', M('Image sans nom accessible.', 'Image without an accessible name.'), el)
    })

    // Titres
    const hs = [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')].filter((h) => !isHidden(h, win))
    stats.titres = hs.length; checked++
    if (!hs.some((h) => h.tagName === 'H1' || h.getAttribute('aria-level') === '1')) add('h1', '9.1', '1.3.1', 'erreur', M('La page ne contient aucun titre de niveau 1.', 'The page has no level-1 heading.'), null)
    let prev = 0
    hs.forEach((h) => {
      checked++
      const lvl = Number(h.tagName[1] || h.getAttribute('aria-level') || 2)
      if (prev && lvl > prev + 1) add('heading-order', '9.1', '1.3.1', 'avertissement', M(`Saut de niveau de titre : h${prev} suivi de h${lvl}.`, `Skipped heading level: h${prev} followed by h${lvl}.`), h)
      if (!h.textContent.trim()) add('heading-empty', '9.1', '2.4.6', 'erreur', M('Titre vide.', 'Empty heading.'), h)
      prev = lvl
    })

    // Champs de formulaire
    doc.querySelectorAll('input, select, textarea').forEach((el) => {
      if (['hidden', 'submit', 'button', 'reset', 'image'].includes(el.type) || isHidden(el, win)) return
      stats.champs++; checked++
      if (!accName(el, doc))
        add('label', '11.1', '1.3.1 / 4.1.2', 'erreur', M('Champ de formulaire sans étiquette. Le placeholder ne suffit pas.', 'Form field without a label. A placeholder is not enough.'), el)
    })

    // Liens
    const vague = /^(cliquez ici|ici|en savoir plus|lire la suite|voir plus|plus|lien|click here|here|read more|learn more|more)$/i
    doc.querySelectorAll('a[href], [role="link"]').forEach((el) => {
      if (isHidden(el, win)) return
      stats.liens++; checked++
      const name = accName(el, doc)
      if (!name) add('link-name', '6.2', '2.4.4', 'erreur', M('Lien sans intitulé.', 'Link without a name.'), el)
      else if (vague.test(name.trim())) add('link-vague', '6.1', '2.4.4', 'avertissement', M(`Intitulé de lien peu explicite hors contexte : « ${name.trim()} ».`, `Link text unclear out of context: “${name.trim()}”.`), el)
    })

    // Boutons
    doc.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]').forEach((el) => {
      if (isHidden(el, win)) return
      stats.boutons++; checked++
      if (!accName(el, doc)) add('button-name', '11.9', '4.1.2', 'erreur', M('Bouton sans intitulé (ex. bouton icône sans aria-label).', 'Button without a name (e.g. icon button without aria-label).'), el)
    })

    // Cadres
    doc.querySelectorAll('iframe').forEach((el) => {
      checked++
      if (!el.getAttribute('title')) add('frame-title', '2.1', '4.1.2', 'erreur', M('Cadre (iframe) sans titre.', 'Frame (iframe) without a title.'), el)
    })

    // Identifiants dupliqués
    const seen = new Map()
    doc.querySelectorAll('[id]').forEach((el) => seen.set(el.id, (seen.get(el.id) || 0) + 1))
    checked++
    seen.forEach((n, id) => { if (n > 1) add('dup-id', '8.2', '4.1.1', 'avertissement', M(`Identifiant « ${id} » utilisé ${n} fois.`, `ID “${id}” used ${n} times.`), doc.getElementById(id)) })

    // Contrastes : éléments qui portent du texte directement
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
    const done = new Set()
    let node
    while ((node = walker.nextNode())) {
      const el = node.parentElement
      if (!el || done.has(el) || !node.textContent.trim() || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue
      done.add(el)
      if (isHidden(el, win) || el.closest('.sr-only')) continue
      const cs = win.getComputedStyle(el)
      const fg = parseColor(cs.color)
      const bg = background(el, win)
      if (!fg || !bg) continue
      stats.textes++; checked++
      const size = parseFloat(cs.fontSize)
      const bold = Number(cs.fontWeight) >= 700
      const large = size >= 24 || (bold && size >= 18.66)
      const need = large ? 3 : 4.5
      const r = ratio(blend(fg, bg), bg)
      if (r < need) add('contrast', '3.2', '1.4.3', 'erreur', M(`Contraste insuffisant : ${r.toFixed(2)}:1 (minimum ${need}:1${large ? ', texte large' : ''}).`, `Insufficient contrast: ${r.toFixed(2)}:1 (minimum ${need}:1${large ? ', large text' : ''}).`), el)
    }

    const errors = issues.filter((i) => i.severity === 'erreur').length
    const warnings = issues.length - errors
    const score = checked ? Math.max(0, Math.round(100 * (1 - (errors + warnings * 0.5) / checked))) : 100
    return { score, checked, issues, stats }
  }

  g.runA11yAudit = runA11yAudit
})(typeof globalThis !== 'undefined' ? globalThis : window)
