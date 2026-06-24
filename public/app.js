// Particles
;(function () {
  const container = document.getElementById('particles')
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div')
    p.className = 'particle'
    p.style.left = Math.random() * 100 + '%'
    p.style.animationDuration = (6 + Math.random() * 14) + 's'
    p.style.animationDelay = (Math.random() * 10) + 's'
    p.style.width = p.style.height = (1 + Math.random() * 2) + 'px'
    p.style.opacity = 0.3 + Math.random() * 0.5
    container.appendChild(p)
  }
})()

// Tabs
function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'))
  el.classList.add('active')
  document.getElementById('tab-' + name).classList.add('active')
}

// Status
async function fetchStatus() {
  try {
    const res = await fetch('/api/status')
    const data = await res.json()
    document.getElementById('active-count').textContent = `Active: ${data.active}`
    document.getElementById('limit-count').textContent = `Limite: ${data.active}/${data.limit}`
    document.getElementById('status-text').textContent = 'Serveur en ligne'
  } catch {
    document.getElementById('status-text').textContent = 'Connexion...'
  }
}

// Generate code
async function generateCode() {
  const input = document.getElementById('phone-input')
  const btn = document.getElementById('pair-btn')
  const resultBox = document.getElementById('result-box')
  const errorBox = document.getElementById('error-box')
  const loadingBox = document.getElementById('loading-box')
  const codeDisplay = document.getElementById('code-display')

  const number = input.value.trim()

  resultBox.classList.add('hidden')
  errorBox.classList.add('hidden')
  loadingBox.classList.add('hidden')

  if (!number) return showError('Veuillez entrer votre numéro WhatsApp.')

  const clean = number.replace(/\D/g, '')
  if (clean.length < 7) return showError('Numéro invalide — inclure le code pays (ex: 2126XXXXXXXX)')

  btn.disabled = true
  loadingBox.classList.remove('hidden')

  try {
    const res = await fetch('/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: clean })
    })

    const data = await res.json()
    loadingBox.classList.add('hidden')

    if (!res.ok || data.error) return showError(data.error || 'Erreur inconnue.')

    const raw = (data.code || '').replace(/-/g, '')
    const formatted = raw.length >= 8
      ? raw.slice(0, 4) + '-' + raw.slice(4, 8)
      : data.code || '----'

    codeDisplay.textContent = formatted
    resultBox.classList.remove('hidden')
    fetchStatus()

  } catch {
    loadingBox.classList.add('hidden')
    showError('Impossible de joindre le serveur. Réessayez.')
  } finally {
    btn.disabled = false
  }
}

function showError(msg) {
  const errorBox = document.getElementById('error-box')
  document.getElementById('error-msg').textContent = msg
  errorBox.classList.remove('hidden')
}

async function copyCode() {
  const code = document.getElementById('code-display').textContent
  const txt = document.getElementById('copy-text')
  try {
    await navigator.clipboard.writeText(code)
    txt.textContent = '✓ Copié !'
    setTimeout(() => { txt.textContent = 'Copier' }, 2000)
  } catch {}
}

document.getElementById('phone-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') generateCode()
})

fetchStatus()
setInterval(fetchStatus, 12000)
