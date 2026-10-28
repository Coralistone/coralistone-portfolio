const out = document.getElementById('out')

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }

document.getElementById('run').addEventListener('click', async () => {
  out.textContent = 'Analyse en cours…'
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['audit-core.js'] })
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => globalThis.runA11yAudit(document) })
    const errors = result.issues.filter((i) => i.severity === 'erreur').length
    out.innerHTML =
      `<p><span class="score">${result.score}</span> / 100 · ${errors} erreur(s), ${result.issues.length - errors} avertissement(s) sur ${result.checked} points vérifiés</p>` +
      `<ol>${result.issues.map((i) => `<li class="${i.severity}">${esc(i.message)}<br><small>RGAA ${i.rgaa} · ${esc(i.target)}</small></li>`).join('')}</ol>`
  } catch (e) {
    out.textContent = "Impossible d'analyser cet onglet (les pages internes du navigateur ne sont pas accessibles aux extensions)."
  }
})
