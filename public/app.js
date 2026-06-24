async function fetchStatus() {
  try {
    const res = await fetch('/api/status')
    const data = await res.json()
    document.getElementById('active-count').textContent = `Active: ${data.active}`
    document.getElementById('limit-count').textContent = `Limit: ${data.active}/${data.limit}`
  } catch {}
}

async function generateCode() {
  const input = document.getElementById('phone-input')
  const btn = document.getElementById('pair-btn')
  const resultBox = document.getElementById('result-box')
  const errorBox = document.getElementById('error-box')
  const codeDisplay = document.getElementById('code-display')

  const number = input.value.trim()

  resultBox.classList.add('hidden')
  errorBox.classList.add('hidden')

  if (!number) {
    showError('Veuillez entrer votre numéro WhatsApp.')
    return
  }

  btn.disabled = true
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="spin">
      <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" stroke-dasharray="31.4" stroke-dashoffset="10"/>
    </svg>
    Génération en cours...
  `

  try {
    const res = await fetch('/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number })
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      showError(data.error || 'Erreur inconnue.')
      return
    }

    const code = data.code || '----'
    codeDisplay.textContent = code
    resultBox.classList.remove('hidden')
    fetchStatus()

  } catch (err) {
    showError('Impossible de joindre le serveur. Réessayez.')
  } finally {
    btn.disabled = false
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Générer le code
    `
  }
}

function showError(msg) {
  const errorBox = document.getElementById('error-box')
  document.getElementById('error-msg').textContent = msg
  errorBox.classList.remove('hidden')
}

async function copyCode() {
  const code = document.getElementById('code-display').textContent
  try {
    await navigator.clipboard.writeText(code)
    const btn = document.querySelector('.copy-btn')
    btn.textContent = '✓ Copié !'
    setTimeout(() => {
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <rect x="9" y="9" width="13" height="13" rx="2" stroke="white" stroke-width="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="white" stroke-width="2"/>
        </svg>
        Copier le code
      `
    }, 2000)
  } catch {}
}

document.getElementById('phone-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') generateCode()
})

fetchStatus()
setInterval(fetchStatus, 10000)

const style = document.createElement('style')
style.textContent = `
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
`
document.head.appendChild(style)
