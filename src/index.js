const express = require('express')
const cors = require('cors')
const path = require('path')
const { makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys')
const pino = require('pino')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../public')))

const sessions = new Map()
const MAX_SESSIONS = 50

function getSessionCount() {
  return sessions.size
}

app.get('/api/status', (req, res) => {
  res.json({
    active: getSessionCount(),
    limit: MAX_SESSIONS,
    status: 'online'
  })
})

app.post('/api/pair', async (req, res) => {
  const { number } = req.body

  if (!number) {
    return res.status(400).json({ error: 'Numéro requis' })
  }

  const clean = number.replace(/[^0-9]/g, '')

  if (clean.length < 10) {
    return res.status(400).json({ error: 'Numéro invalide — inclure le code pays (ex: 2126XXXXXXXX)' })
  }

  if (sessions.size >= MAX_SESSIONS) {
    return res.status(503).json({ error: 'Serveur plein — réessayez plus tard' })
  }

  const sessionId = `session_${clean}_${Date.now()}`
  const sessionPath = path.join('/tmp', sessionId)

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['DENTSU-XMD', 'Chrome', '1.0.0'],
    })

    sessions.set(sessionId, sock)

    sock.ev.on('creds.update', saveCreds)

    await delay(1500)

    const code = await sock.requestPairingCode(clean)

    sock.ev.on('connection.update', ({ connection }) => {
      if (connection === 'close' || connection === 'open') {
        sessions.delete(sessionId)
        try { sock.end() } catch {}
      }
    })

    setTimeout(() => {
      sessions.delete(sessionId)
      try { sock.end() } catch {}
    }, 120000)

    return res.json({ code, number: clean })

  } catch (err) {
    sessions.delete(sessionId)
    console.error('Pair error:', err.message)
    return res.status(500).json({ error: 'Échec de génération du code. Vérifiez le numéro.' })
  }
})

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

app.listen(PORT, () => {
  console.log(`DENTSU-XMD server running on port ${PORT}`)
})
