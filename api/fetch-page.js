/**
 * Fonction serverless (Vercel) : récupère le HTML d'une page publique pour l'audit d'accessibilité.
 * Le navigateur ne peut pas lire un autre site directement (CORS) : ce petit relais le fait côté serveur.
 * Sécurité : http(s) uniquement, ports 80/443, adresses privées refusées (anti-SSRF), 10 s et 3 Mo max.
 */
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const MAX_BYTES = 3_000_000
const TIMEOUT_MS = 10_000

function isPrivate(ip) {
  if (ip.includes(':')) {
    const v = ip.toLowerCase()
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:127.') || v.startsWith('::ffff:10.') || v.startsWith('::ffff:192.168.')
  }
  const [a, b] = ip.split('.').map(Number)
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
}

async function assertPublic(url) {
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Seules les adresses http(s) sont acceptées.')
  if (process.env.ALLOW_PRIVATE === '1') return // tests en local uniquement
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('Port non autorisé.')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
  if (!addrs.length || addrs.some((a) => isPrivate(a.address))) throw new Error('Adresse non autorisée.')
}

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  try {
    const raw = (new URL(req.url, 'http://local').searchParams.get('url') || '').trim()
    if (!raw) return send(res, 400, { error: 'Indiquez une adresse.' })
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) return send(res, 400, { error: 'Seules les adresses http(s) sont acceptées.' })
    let url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    let response
    // Suivi manuel des redirections pour revérifier chaque destination
    for (let i = 0; i < 4; i++) {
      await assertPublic(url)
      response = await fetch(url, {
        redirect: 'manual', signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; A11yAuditPortfolio/1.0)', Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'fr,en;q=0.8' },
      })
      const loc = response.headers.get('location')
      if (response.status >= 300 && response.status < 400 && loc) { url = new URL(loc, url); continue }
      break
    }
    clearTimeout(timer)
    if (!response.ok) return send(res, 502, { error: `Le site a répondu avec le code ${response.status}.` })
    const type = response.headers.get('content-type') || ''
    if (!type.includes('html')) return send(res, 415, { error: "Cette adresse ne renvoie pas une page HTML." })
    const reader = response.body.getReader()
    const chunks = []
    let size = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > MAX_BYTES) { await reader.cancel(); return send(res, 413, { error: 'Page trop volumineuse (3 Mo maximum).' }) }
      chunks.push(value)
    }
    const html = Buffer.concat(chunks).toString('utf-8')
    send(res, 200, { url: url.toString(), html })
  } catch (e) {
    const msg = e?.name === 'AbortError' ? 'Le site a mis trop de temps à répondre.' : e?.message === 'fetch failed' || e?.code === 'ENOTFOUND' || /ENOTFOUND/.test(e?.message || '') ? 'Site injoignable : vérifiez l’adresse.' : (e?.message || 'Impossible de récupérer cette page.')
    send(res, 400, { error: msg })
  }
}
